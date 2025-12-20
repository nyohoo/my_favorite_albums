import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { Resvg } from '@resvg/resvg-wasm';
import { getDb } from './db';
import { posts, postAlbums, albums, users, shortUrls } from './db/schema';
import { eq, asc, desc, inArray } from 'drizzle-orm';
import { generateVibeCard, generateVibeCardSVG } from './utils/vibe-card';
import { searchAlbums } from './services/spotify';

type Bindings = {
  DB: D1Database;
  SPOTIFY_CLIENT_ID: string;
  SPOTIFY_CLIENT_SECRET: string;
};

type Variables = {};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ミドルウェア
app.use('*', logger());

// CORS設定: 本番環境のオリジンを許可
app.use('*', cors({
  origin: (origin, c) => {
    // 本番環境のオリジン（デフォルト）
    const defaultAllowedOrigins = [
      'https://my-favorite-albums.pages.dev', // Cloudflare PagesのデフォルトURL
      // カスタムドメインを追加する場合はここに追加
      // 'https://yourdomain.com',
    ];
    
    // 環境変数から追加のオリジンを取得（wrangler.tomlのvarsまたはsecretで設定可能）
    // 注意: Cloudflare Workersでは環境変数はc.envから取得
    // ここではデフォルトのオリジンリストを使用
    const allowedOrigins = defaultAllowedOrigins;
    
    // originがない場合（サーバーサイドリクエストなど）は許可
    if (!origin) {
      return '*';
    }
    
    // 開発環境（localhost）は常に許可
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return origin; // 実際のオリジンを返す
    }
    
    // pages.devを含むオリジンは許可（プレビューURLも含む）
    if (origin.includes('pages.dev')) {
      return origin; // 実際のオリジンを返す
    }
    
    // 本番環境では許可されたオリジンのみ
    if (allowedOrigins.includes(origin)) {
      return origin; // 実際のオリジンを返す
    }
    
    // 許可されていないオリジンの場合はnullを返す（CORSエラー）
    return null;
  },
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// ヘルスチェック
app.get('/', (c) => {
  return c.json({
    message: 'MyFavoriteAlbums API',
    version: '1.0.0',
    status: 'ok',
  });
});

// 画像生成エンドポイント
// GET /api/vibe-card?postId=xxx
app.get('/api/vibe-card', async (c) => {
  try {
    const postId = c.req.query('postId');
    
    if (!postId) {
      // エラー時もSVG画像を返す（プレースホルダー）
      const errorSvg = `<svg width="900" height="900" xmlns="http://www.w3.org/2000/svg">
        <rect width="900" height="900" fill="#1a1a1a"/>
        <text x="450" y="450" font-family="Arial" font-size="24" fill="#ffffff" text-anchor="middle">postId is required</text>
      </svg>`;
      return new Response(errorSvg, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'no-cache',
        },
      });
    }

    const db = getDb(c.env.DB);

    // 投稿を取得
    const post = await db.select().from(posts).where(eq(posts.id, postId)).limit(1).get();
    
    if (!post) {
      // エラー時もSVG画像を返す（プレースホルダー）
      const errorSvg = `<svg width="900" height="900" xmlns="http://www.w3.org/2000/svg">
        <rect width="900" height="900" fill="#1a1a1a"/>
        <text x="450" y="450" font-family="Arial" font-size="24" fill="#ffffff" text-anchor="middle">Post not found</text>
      </svg>`;
      return new Response(errorSvg, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'no-cache',
        },
      });
    }

    // 投稿に紐づくアルバムを取得（position順）
    const postAlbumRelations = await db
      .select()
      .from(postAlbums)
      .where(eq(postAlbums.postId, postId))
      .orderBy(asc(postAlbums.position))
      .all();

    // アルバム詳細を取得
    const albumIds = postAlbumRelations.map((pa) => pa.albumId);
    const albumList = albumIds.length > 0
      ? await db
          .select()
          .from(albums)
          .where(inArray(albums.id, albumIds))
          .all()
      : [];

    // position順にソート
    const sortedAlbums = postAlbumRelations
      .map((pa) => albumList.find((a) => a.id === pa.albumId))
      .filter((a): a is NonNullable<typeof a> => a !== undefined);

    // 最大9枚まで
    const albumsToShow = sortedAlbums.slice(0, 9);

    // DBに保存されたSVGがある場合はそれを使用、なければ動的生成
    let svg: string;
    if (post.imageSvg && post.imageSvg.trim().length > 0) {
      svg = post.imageSvg;
    } else {
      // フォールバック: 動的にSVGを生成
      if (albumsToShow.length === 0) {
        // アルバムがない場合のエラーSVG
        const errorSvg = `<svg width="900" height="900" xmlns="http://www.w3.org/2000/svg">
          <rect width="900" height="900" fill="#1a1a1a"/>
          <text x="450" y="450" font-family="Arial" font-size="24" fill="#ffffff" text-anchor="middle">No albums found</text>
        </svg>`;
        return new Response(errorSvg, {
          headers: {
            'Content-Type': 'image/svg+xml',
            'Cache-Control': 'no-cache',
          },
        });
      }
      
      try {
        svg = await generateVibeCardSVG({
          albums: albumsToShow,
          title: post.title || 'My Favorite Albums',
        });
      } catch (svgError) {
        console.error('Error generating SVG:', svgError);
        // SVG生成エラー時もエラーSVGを返す
        const errorSvg = `<svg width="900" height="900" xmlns="http://www.w3.org/2000/svg">
          <rect width="900" height="900" fill="#1a1a1a"/>
          <text x="450" y="450" font-family="Arial" font-size="24" fill="#ffffff" text-anchor="middle">Failed to generate image</text>
        </svg>`;
        return new Response(errorSvg, {
          headers: {
            'Content-Type': 'image/svg+xml',
            'Cache-Control': 'no-cache',
          },
        });
      }
    }

    // SVGをPNGに変換（要件ではJPGとあるが、まずはPNGで動作確認）
    try {
      const resvg = new Resvg(svg, {
        font: {
          loadSystemFonts: false,
        },
      });
      const pngData = resvg.render();
      const pngBuffer = pngData.asPng();

      return new Response(pngBuffer, {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    } catch (error) {
      console.error('Error converting SVG to PNG:', error);
      // フォールバック: SVGを直接返す
        return new Response(svg, {
          headers: {
            'Content-Type': 'image/svg+xml',
            'Cache-Control': 'public, max-age=31536000, immutable',
            'X-Content-Type-Options': 'nosniff',
          },
        });
    }
  } catch (error) {
    console.error('Error generating vibe card:', error);
    // エラー時もSVG画像を返す（プレースホルダー）
    const errorSvg = `<svg width="900" height="900" xmlns="http://www.w3.org/2000/svg">
      <rect width="900" height="900" fill="#1a1a1a"/>
      <text x="450" y="450" font-family="Arial" font-size="24" fill="#ffffff" text-anchor="middle">Failed to generate vibe card</text>
    </svg>`;
    return new Response(errorSvg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'no-cache',
      },
    });
  }
});

// デバッグ用エンドポイント: SVG生成のテスト
app.get('/api/debug/svg-test', async (c) => {
  try {
    console.log('=== SVG Generation Test Start ===');
    
    // モックアルバムデータ
    const mockAlbums = [
      {
        id: 'test-1',
        spotifyId: 'test-1',
        name: 'Test Album 1',
        artist: 'Test Artist 1',
        imageUrl: 'https://picsum.photos/300/300?random=1',
        releaseDate: '2024-01-01',
        spotifyUrl: 'https://open.spotify.com/album/1',
        artistId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    console.log('1. Mock albums created:', mockAlbums.length);
    
    // フォント読み込みテスト
    console.log('2. Testing font loading...');
    let fontLoaded = false;
    try {
      const { generateVibeCardSVG } = await import('./utils/vibe-card');
      fontLoaded = true;
      console.log('2.1. Font loading module imported');
    } catch (e) {
      console.error('2.1. Failed to import module:', e);
      return c.json({ error: 'Failed to import module', details: String(e) }, 500);
    }

    // SVG生成テスト
    console.log('3. Testing SVG generation...');
    try {
      const { generateVibeCardSVG } = await import('./utils/vibe-card');
      const svg = await generateVibeCardSVG({
        albums: mockAlbums,
        title: 'Test Title',
        userName: 'Test User',
      });
      
      console.log('3.1. SVG generated, length:', svg.length);
      console.log('3.2. SVG preview (first 200 chars):', svg.substring(0, 200));
      
      if (!svg || svg.trim().length === 0) {
        return c.json({ error: 'SVG is empty' }, 500);
      }
      
      if (!svg.startsWith('<svg')) {
        return c.json({ 
          error: 'SVG is invalid', 
          preview: svg.substring(0, 500) 
        }, 500);
      }
      
      return c.json({
        success: true,
        svgLength: svg.length,
        svgPreview: svg.substring(0, 500),
      });
    } catch (svgError) {
      console.error('3.1. SVG generation failed:', svgError);
      return c.json({
        error: 'SVG generation failed',
        message: svgError instanceof Error ? svgError.message : String(svgError),
        stack: svgError instanceof Error ? svgError.stack : undefined,
      }, 500);
    }
  } catch (error) {
    console.error('Debug test failed:', error);
    return c.json({
      error: 'Debug test failed',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }, 500);
  }
});

// テスト用エンドポイント（モックデータで画像生成）
// 注意: @vercel/ogはCloudflare Workersでは動作しないため、一時的に無効化
app.get('/api/vibe-card/test', async (c) => {
  try {
    // モックアルバムデータ
    const mockAlbums = Array.from({ length: 9 }, (_, i) => ({
      id: `album-${i + 1}`,
      spotifyId: `spotify-${i + 1}`,
      name: `Album ${i + 1}`,
      artist: `Artist ${i + 1}`,
      imageUrl: `https://picsum.photos/300/300?random=${i + 1}`,
      releaseDate: '2024-01-01',
      spotifyUrl: `https://open.spotify.com/album/${i + 1}`,
      artistId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    // 画像を生成
    const imageResponse = await generateVibeCard({
      albums: mockAlbums,
      title: 'Test Vibe Card',
      userName: 'Test User',
    });

    return imageResponse;
  } catch (error) {
    console.error('Error generating test vibe card:', error);
    return c.json({ error: 'Failed to generate test vibe card' }, 500);
  }
});

// 投稿一覧取得
app.get('/api/posts', async (c) => {
  try {
    const db = getDb(c.env.DB);
    const limit = parseInt(c.req.query('limit') || '20');
    const offset = parseInt(c.req.query('offset') || '0');

    const postList = await db
      .select()
      .from(posts)
      .orderBy(desc(posts.createdAt))
      .limit(limit)
      .offset(offset)
      .all();

    return c.json({ posts: postList });
  } catch (error) {
    console.error('Error fetching posts:', error);
    return c.json({ error: 'Failed to fetch posts' }, 500);
  }
});

// 投稿詳細取得
app.get('/api/posts/:id', async (c) => {
  try {
    const postId = c.req.param('id');
    const db = getDb(c.env.DB);

    const post = await db.select().from(posts).where(eq(posts.id, postId)).limit(1).get();
    
    if (!post) {
      return c.json({ error: 'Post not found' }, 404);
    }

    // ユーザー情報を取得
    const user = await db.select().from(users).where(eq(users.id, post.userId)).limit(1).get();
    const userName = user?.name || null;

    // 投稿に紐づくアルバムを取得
    const postAlbumRelations = await db
      .select()
      .from(postAlbums)
      .where(eq(postAlbums.postId, postId))
      .orderBy(asc(postAlbums.position))
      .all();

    const albumIds = postAlbumRelations.map((pa) => pa.albumId);
    const albumList = albumIds.length > 0
      ? await db
          .select()
          .from(albums)
          .where(inArray(albums.id, albumIds))
          .all()
      : [];

    // position順にソート
    const sortedAlbums = postAlbumRelations
      .map((pa) => albumList.find((a) => a.id === pa.albumId))
      .filter((a): a is NonNullable<typeof a> => a !== undefined);

    return c.json({
      post: {
        ...post,
        userName,
      },
      albums: sortedAlbums,
    });
  } catch (error) {
    console.error('Error fetching post:', error);
    return c.json({ error: 'Failed to fetch post' }, 500);
  }
});

// Spotify APIでアルバム検索
// GET /api/search?q=検索クエリ
app.get('/api/search', async (c) => {
  try {
    const query = c.req.query('q');

    if (!query || query.trim().length === 0) {
      return c.json({ error: 'Query parameter "q" is required' }, 400);
    }

    // 環境変数の確認
    if (!c.env.SPOTIFY_CLIENT_ID || !c.env.SPOTIFY_CLIENT_SECRET) {
      return c.json(
        { 
          error: 'Spotify API credentials not configured',
          message: 'Please set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET environment variables',
        },
        500
      );
    }

    // Spotify APIで検索
    const results = await searchAlbums(query, {
      clientId: c.env.SPOTIFY_CLIENT_ID,
      clientSecret: c.env.SPOTIFY_CLIENT_SECRET,
    });

    return c.json({
      query,
      count: results.length,
      albums: results,
    });
  } catch (error) {
    console.error('Error searching albums:', error);
    return c.json(
      { 
        error: 'Failed to search albums',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

// 投稿作成
// POST /api/posts
app.post('/api/posts', async (c) => {
  try {
    const body = await c.req.json<{
      userName: string;
      hashtag: string; // ハッシュタグ（必須）
      albums: Array<{
        spotifyId: string;
        name: string;
        artist: string;
        imageUrl: string;
        releaseDate?: string;
        spotifyUrl?: string;
      }>;
    }>();

    // バリデーション
    // userNameは任意（空文字列も許可）
    const userName = body.userName?.trim() || '';

    // ハッシュタグのバリデーション
    if (!body.hashtag || typeof body.hashtag !== 'string' || body.hashtag.trim() === '') {
      return c.json({ error: 'hashtag is required' }, 400);
    }
    const hashtag = body.hashtag.trim();

    if (!body.albums || !Array.isArray(body.albums) || body.albums.length === 0) {
      return c.json({ error: 'albums array is required and must not be empty' }, 400);
    }

    if (body.albums.length > 9) {
      return c.json({ error: 'albums array must contain at most 9 items' }, 400);
    }

    const db = getDb(c.env.DB);

    // ローカル環境ではトランザクションが動作しないため、個別のクエリとして実行
    // 本番環境ではトランザクションを使用することを推奨
    try {
      // 1. User処理: 同名なら既存、なければ新規作成
      // userNameが空の場合は匿名ユーザーとして扱う
      let user = null;
      if (userName) {
        user = await db
          .select()
          .from(users)
          .where(eq(users.name, userName))
          .limit(1)
          .get();

        if (!user) {
          const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
          const now = new Date();
          await db.insert(users).values({
            id: userId,
            name: userName,
            createdAt: now,
            updatedAt: now,
          });
          user = await db
            .select()
            .from(users)
            .where(eq(users.id, userId))
            .limit(1)
            .get();
        }
      } else {
        // 匿名ユーザーの場合は、固定の匿名ユーザーIDを使用
        const anonymousUserId = 'user_anonymous';
        user = await db
          .select()
          .from(users)
          .where(eq(users.id, anonymousUserId))
          .limit(1)
          .get();

        if (!user) {
          const now = new Date();
          await db.insert(users).values({
            id: anonymousUserId,
            name: '',
            createdAt: now,
            updatedAt: now,
          });
          user = await db
            .select()
            .from(users)
            .where(eq(users.id, anonymousUserId))
            .limit(1)
            .get();
        }
      }

      if (!user) {
        throw new Error('Failed to create or retrieve user');
      }

      // 2. Post作成
      const postId = `post_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const now = new Date();
      await db.insert(posts).values({
        id: postId,
        userId: user.id,
        title: null, // 後方互換性のためnullを設定（将来的に削除予定）
        hashtag: hashtag,
        createdAt: now,
        updatedAt: now,
      });

      // 3. Album Upsert処理
      const albumIds: string[] = [];
      for (const albumData of body.albums) {
        // spotify_idで検索
        let album = await db
          .select()
          .from(albums)
          .where(eq(albums.spotifyId, albumData.spotifyId))
          .limit(1)
          .get();

        if (!album) {
          // 新規作成
          const albumId = `album_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
          await db.insert(albums).values({
            id: albumId,
            spotifyId: albumData.spotifyId,
            name: albumData.name,
            artist: albumData.artist,
            imageUrl: albumData.imageUrl,
            releaseDate: albumData.releaseDate || null,
            spotifyUrl: albumData.spotifyUrl || null,
            createdAt: now,
            updatedAt: now,
          });
          album = await db
            .select()
            .from(albums)
            .where(eq(albums.id, albumId))
            .limit(1)
            .get();
        }

        if (!album) {
          throw new Error(`Failed to create or retrieve album: ${albumData.spotifyId}`);
        }

        albumIds.push(album.id);
      }

      // 4. Link作成: post_albumsにposition付きで保存
      for (let i = 0; i < albumIds.length; i++) {
        const postAlbumId = `post_album_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 9)}`;
        await db.insert(postAlbums).values({
          id: postAlbumId,
          postId: postId,
          albumId: albumIds[i],
          position: i + 1, // 1-9の位置
          createdAt: now,
        });
      }

      // 5. Vibe Card SVG生成と保存
      try {
        // アルバム詳細を取得（position順）
        const savedAlbums = await Promise.all(
          albumIds.map(async (albumId) => {
            const album = await db
              .select()
              .from(albums)
              .where(eq(albums.id, albumId))
              .limit(1)
              .get();
            return album;
          })
        );

        const validAlbums = savedAlbums.filter((a): a is NonNullable<typeof a> => a !== null);

        if (validAlbums.length === 0) {
          console.error('No valid albums found for SVG generation');
          // アルバムがない場合はエラーSVGを保存
          const errorSvg = `<svg width="900" height="900" xmlns="http://www.w3.org/2000/svg">
            <rect width="900" height="900" fill="#1a1a1a"/>
            <text x="450" y="450" font-family="Arial" font-size="24" fill="#ffffff" text-anchor="middle">No albums found</text>
          </svg>`;
          await db
            .update(posts)
            .set({ imageSvg: errorSvg, updatedAt: now })
            .where(eq(posts.id, postId));
        } else {
          // ユーザー名を取得（既にuserオブジェクトがあるので、そのnameを使用）
          const userNameForSvg = user.name || undefined;

          // SVGを生成
          console.log(`Generating SVG for post ${postId} with ${validAlbums.length} albums`);
          const svg = await generateVibeCardSVG({
            albums: validAlbums,
            title: body.title || undefined,
            userName: userNameForSvg,
          });

          // SVGの内容を検証
          if (!svg || svg.trim().length === 0) {
            console.error('Generated SVG is empty');
            throw new Error('Generated SVG is empty');
          }

          if (!svg.startsWith('<svg')) {
            console.error('Generated SVG does not start with <svg tag');
            console.error('SVG preview (first 200 chars):', svg.substring(0, 200));
            throw new Error('Generated SVG is invalid');
          }

          console.log(`SVG generated successfully, length: ${svg.length} characters`);

          // DBにSVGを保存
          await db
            .update(posts)
            .set({ imageSvg: svg, updatedAt: now })
            .where(eq(posts.id, postId));
          
          console.log(`SVG saved to database for post ${postId}`);
        }
      } catch (svgError) {
        console.error('Error generating SVG:', svgError);
        console.error('Error details:', {
          postId,
          albumCount: albumIds.length,
          errorMessage: svgError instanceof Error ? svgError.message : String(svgError),
          errorStack: svgError instanceof Error ? svgError.stack : undefined,
        });
        
        // SVG生成エラー時もエラーSVGを保存（画像が表示されない問題を防ぐ）
        const errorSvg = `<svg width="900" height="900" xmlns="http://www.w3.org/2000/svg">
          <rect width="900" height="900" fill="#1a1a1a"/>
          <text x="450" y="400" font-family="Arial" font-size="24" fill="#ffffff" text-anchor="middle">Failed to generate image</text>
          <text x="450" y="450" font-family="Arial" font-size="16" fill="#ffffff" text-anchor="middle" opacity="0.7">${svgError instanceof Error ? svgError.message.substring(0, 50) : 'Unknown error'}</text>
        </svg>`;
        
        try {
          await db
            .update(posts)
            .set({ imageSvg: errorSvg, updatedAt: now })
            .where(eq(posts.id, postId));
          console.log(`Error SVG saved to database for post ${postId}`);
        } catch (dbError) {
          console.error('Failed to save error SVG to database:', dbError);
        }
        
        // SVG生成エラーは無視して投稿は成功とする（既存の動作を維持）
      }

      const result = { postId, userId: user.id };

      return c.json({
        success: true,
        id: result.postId,
        userId: result.userId,
      });
    } catch (dbError) {
      // データベースエラーの場合は、より詳細なエラーメッセージを返す
      console.error('Database error:', dbError);
      throw dbError;
    }
  } catch (error) {
    console.error('Error creating post:', error);
    return c.json(
      {
        error: 'Failed to create post',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

// 短縮URL生成用の関数（ランダムな文字列を生成）
function generateShortId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// 短縮URL生成
// POST /api/short-url
app.post('/api/short-url', async (c) => {
  try {
    const body = await c.req.json();
    const { postId } = body;

    if (!postId) {
      return c.json({ error: 'postId is required' }, 400);
    }

    const db = getDb(c.env.DB);

    // 投稿が存在するか確認
    const post = await db.select().from(posts).where(eq(posts.id, postId)).limit(1).get();
    if (!post) {
      return c.json({ error: 'Post not found' }, 404);
    }

    // 既存の短縮URLを確認
    const existing = await db
      .select()
      .from(shortUrls)
      .where(eq(shortUrls.postId, postId))
      .limit(1)
      .get();

    if (existing) {
      // 既存の短縮URLを返す
      const shortUrl = `https://albums.albums.workers.dev/s/${existing.id}`;
      return c.json({
        shortId: existing.id,
        shortUrl,
      });
    }

    // 新しい短縮URLを生成（重複チェック）
    let shortId: string;
    let attempts = 0;
    do {
      shortId = generateShortId();
      const duplicate = await db
        .select()
        .from(shortUrls)
        .where(eq(shortUrls.id, shortId))
        .limit(1)
        .get();
      if (!duplicate) break;
      attempts++;
      if (attempts > 10) {
        return c.json({ error: 'Failed to generate unique short URL' }, 500);
      }
    } while (true);

    // 短縮URLを保存
    const now = new Date();
    await db.insert(shortUrls).values({
      id: shortId,
      postId: postId,
      createdAt: now,
    });

    const shortUrl = `https://albums.albums.workers.dev/s/${shortId}`;
    return c.json({
      shortId,
      shortUrl,
    });
  } catch (error) {
    console.error('Error creating short URL:', error);
    return c.json(
      {
        error: 'Failed to create short URL',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

// 短縮URLリダイレクト
// GET /s/:shortId
app.get('/s/:shortId', async (c) => {
  try {
    const shortId = c.req.param('shortId');
    const db = getDb(c.env.DB);

    const shortUrl = await db
      .select()
      .from(shortUrls)
      .where(eq(shortUrls.id, shortId))
      .limit(1)
      .get();

    if (!shortUrl) {
      return c.html(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>短縮URLが見つかりません</title>
          <meta http-equiv="refresh" content="3;url=https://my-favorite-albums.pages.dev">
        </head>
        <body>
          <h1>短縮URLが見つかりません</h1>
          <p>3秒後にトップページにリダイレクトします...</p>
        </body>
        </html>
      `, 404);
    }

    // 投稿詳細ページにリダイレクト
    return c.redirect(`https://my-favorite-albums.pages.dev/posts/${shortUrl.postId}`, 302);
  } catch (error) {
    console.error('Error redirecting short URL:', error);
    return c.html(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>エラー</title>
        <meta http-equiv="refresh" content="3;url=https://my-favorite-albums.pages.dev">
      </head>
      <body>
        <h1>エラーが発生しました</h1>
        <p>3秒後にトップページにリダイレクトします...</p>
      </body>
      </html>
    `, 500);
  }
});

export default app;

