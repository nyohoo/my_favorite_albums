import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { getDb } from './db';
import { posts, postAlbums, albums, users } from './db/schema';
import { eq, asc, inArray } from 'drizzle-orm';
import { generateVibeCard } from './utils/vibe-card';
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
app.use('*', cors());

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
      return c.json({ error: 'postId is required' }, 400);
    }

    const db = getDb(c.env.DB);

    // 投稿を取得
    const post = await db.select().from(posts).where(eq(posts.id, postId)).limit(1).get();
    
    if (!post) {
      return c.json({ error: 'Post not found' }, 404);
    }

    // 投稿に紐づくアルバムを取得（position順）
    const postAlbumRelations = await db
      .select()
      .from(postAlbums)
      .where(eq(postAlbums.postId, postId))
      .orderBy(asc(postAlbums.position))
      .all();

    if (postAlbumRelations.length === 0) {
      return c.json({ error: 'No albums found for this post' }, 404);
    }

    // アルバム詳細を取得
    const albumIds = postAlbumRelations.map((pa) => pa.albumId);
    const albumList = await db
      .select()
      .from(albums)
      .where(inArray(albums.id, albumIds))
      .all();

    // position順にソート
    const sortedAlbums = postAlbumRelations
      .map((pa) => albumList.find((a) => a.id === pa.albumId))
      .filter((a): a is NonNullable<typeof a> => a !== undefined);

    // 最大9枚まで
    const albumsToShow = sortedAlbums.slice(0, 9);

    // 画像を生成
    const imageResponse = await generateVibeCard({
      albums: albumsToShow,
      title: post.title || 'My Favorite Albums',
    });

    return imageResponse;
  } catch (error) {
    console.error('Error generating vibe card:', error);
    return c.json({ error: 'Failed to generate vibe card' }, 500);
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
      post,
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
      title?: string;
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
    if (!body.userName || body.userName.trim().length === 0) {
      return c.json({ error: 'userName is required' }, 400);
    }

    if (!body.albums || !Array.isArray(body.albums) || body.albums.length === 0) {
      return c.json({ error: 'albums array is required and must not be empty' }, 400);
    }

    if (body.albums.length > 9) {
      return c.json({ error: 'albums array must contain at most 9 items' }, 400);
    }

    const db = getDb(c.env.DB);

    // トランザクション内で処理
    const result = await db.transaction(async (tx) => {
      // 1. User処理: 同名なら既存、なければ新規作成
      let user = await tx
        .select()
        .from(users)
        .where(eq(users.name, body.userName))
        .limit(1)
        .get();

      if (!user) {
        const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const now = new Date();
        await tx.insert(users).values({
          id: userId,
          name: body.userName,
          createdAt: now,
          updatedAt: now,
        });
        user = await tx
          .select()
          .from(users)
          .where(eq(users.id, userId))
          .limit(1)
          .get();
      }

      if (!user) {
        throw new Error('Failed to create or retrieve user');
      }

      // 2. Post作成
      const postId = `post_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const now = new Date();
      await tx.insert(posts).values({
        id: postId,
        userId: user.id,
        title: body.title || null,
        createdAt: now,
        updatedAt: now,
      });

      // 3. Album Upsert処理
      const albumIds: string[] = [];
      for (const albumData of body.albums) {
        // spotify_idで検索
        let album = await tx
          .select()
          .from(albums)
          .where(eq(albums.spotifyId, albumData.spotifyId))
          .limit(1)
          .get();

        if (!album) {
          // 新規作成
          const albumId = `album_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
          await tx.insert(albums).values({
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
          album = await tx
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
        await tx.insert(postAlbums).values({
          id: postAlbumId,
          postId: postId,
          albumId: albumIds[i],
          position: i + 1, // 1-9の位置
          createdAt: now,
        });
      }

      return { postId, userId: user.id };
    });

    return c.json({
      success: true,
      id: result.postId,
      userId: result.userId,
    });
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

export default app;

