import satori from 'satori';
import { Resvg } from '@resvg/resvg-wasm';
import type { Album } from '../db/schema';

export interface VibeCardOptions {
  albums: Album[];
  title?: string;
  userName?: string;
  backgroundColor?: string;
  textColor?: string;
}

// 日本語フォントを読み込む（Google Fontsから取得）
async function loadFont(): Promise<ArrayBuffer> {
  try {
    const fontUrl = 'https://fonts.gstatic.com/s/notosansjp/v52/-F6jfjtqLzI2JPCgQBnw7HFyzSD-AsregP8VFBEj75s.ttf';
    const response = await fetch(fontUrl);
    if (!response.ok) {
      throw new Error(`Failed to load font: ${response.statusText} (${response.status})`);
    }
    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength === 0) {
      throw new Error('Font file is empty');
    }
    return arrayBuffer;
  } catch (error) {
    console.error('Error loading font:', error);
    throw error;
  }
}

// 画像をBase64に変換（Cloudflare Workersで使用可能な形式）
async function imageToBase64(url: string): Promise<string> {
  try {
    console.log(`[imageToBase64] Fetching image from: ${url}`);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText} (${response.status})`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    console.log(`[imageToBase64] Image fetched, size: ${arrayBuffer.byteLength} bytes`);
    
    if (arrayBuffer.byteLength === 0) {
      throw new Error('Image data is empty');
    }
    
    // 大きな配列でも安全に変換するため、チャンクに分けて処理
    const uint8Array = new Uint8Array(arrayBuffer);
    const chunkSize = 8192; // 8KBずつ処理
    let binaryString = '';
    
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.slice(i, i + chunkSize);
      binaryString += String.fromCharCode(...chunk);
    }
    
    const base64 = btoa(binaryString);
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    console.log(`[imageToBase64] Base64 conversion successful, length: ${base64.length}`);
    
    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    console.error('[imageToBase64] Error converting image to base64:', error);
    console.error('[imageToBase64] URL:', url);
    // エラーを再スローして、呼び出し元で処理できるようにする
    throw error;
  }
}

/**
 * satoriを使わずに直接SVGを生成する関数（フォールバック用）
 */
function generateSVGDirectly(options: VibeCardOptions, albumImages: (string | null)[]): string {
  const {
    albums,
    title = 'My Favorite Albums',
    userName,
    backgroundColor = '#1a1a1a',
    textColor = '#ffffff',
  } = options;

  const gridSize = 3;
  const spacing = 0; // 隙間なし
  // アルバムサイズは、全体のサイズから計算（例: 900x900の画像の場合、1枚あたり300x300）
  // 標準的なサイズとして、1枚あたり300pxを使用
  const albumSize = 300;
  const cardWidth = albumSize * gridSize;
  const cardHeight = albumSize * gridSize;

  // SVGを直接生成（アルバムのみ、隙間なし）
  let svg = `<svg width="${cardWidth}" height="${cardHeight}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${cardWidth}" height="${cardHeight}" fill="${backgroundColor}"/>
    
    <!-- アルバムグリッド（隙間なし） -->
    <g>`;

  for (let i = 0; i < 9; i++) {
    const album = albums[i];
    const albumImage = albumImages[i];
    const row = Math.floor(i / gridSize);
    const col = i % gridSize;
    const x = col * albumSize;
    const y = row * albumSize;

    if (album && albumImage) {
      // アルバム画像のみを表示（オーバーレイなし、角丸なし、隙間なし）
      // Base64データが正しい形式か確認
      const imageHref = albumImage.startsWith('data:') ? albumImage : `data:image/jpeg;base64,${albumImage}`;
      svg += `
      <!-- Album ${i + 1}: ${escapeXml(album.name)} -->
      <image href="${imageHref}" x="${x}" y="${y}" width="${albumSize}" height="${albumSize}" preserveAspectRatio="xMidYMid slice"/>`;
    } else if (album) {
      // 画像がない場合は背景色のみ
      svg += `
      <!-- Album ${i + 1} (no image): ${escapeXml(album.name)} -->
      <rect x="${x}" y="${y}" width="${albumSize}" height="${albumSize}" fill="rgba(255, 255, 255, 0.05)"/>`;
    } else {
      // 空のスロット
      svg += `
      <!-- Empty slot ${i + 1} -->
      <rect x="${x}" y="${y}" width="${albumSize}" height="${albumSize}" fill="rgba(255, 255, 255, 0.05)"/>`;
    }
  }

  svg += `
    </g>
  </svg>`;

  return svg;
}

/**
 * XMLの特殊文字をエスケープ
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * アルバムリストからVibe Card SVGを生成（DB保存用）
 * SVG文字列を返す（PNG変換なし）
 * satoriが失敗した場合は直接SVG生成にフォールバック
 */
export async function generateVibeCardSVG(options: VibeCardOptions): Promise<string> {
  console.log('[generateVibeCardSVG] Start');
  const {
    albums,
    title = 'My Favorite Albums',
    userName,
    backgroundColor = '#1a1a1a',
    textColor = '#ffffff',
  } = options;

  console.log('[generateVibeCardSVG] Options:', {
    albumCount: albums?.length || 0,
    title,
    userName: userName ? 'provided' : 'not provided',
  });

  if (!albums || albums.length === 0) {
    throw new Error('No albums provided for SVG generation');
  }

  // 3x3グリッドで9枚のアルバムを表示（隙間なし）
  const gridSize = 3;
  const spacing = 0; // 隙間なし
  const albumSize = 300; // 1枚あたり300px
  const cardWidth = albumSize * gridSize;
  const cardHeight = albumSize * gridSize;

  console.log('[generateVibeCardSVG] Card dimensions:', { cardWidth, cardHeight });

  // フォントを読み込む（satori用、直接SVG生成では不要だが互換性のため）
  let fontData: ArrayBuffer;
  try {
    console.log('[generateVibeCardSVG] Loading font...');
    fontData = await loadFont();
    if (!fontData || fontData.byteLength === 0) {
      throw new Error('Font data is empty');
    }
    console.log('[generateVibeCardSVG] Font loaded, size:', fontData.byteLength, 'bytes');
  } catch (fontError) {
    console.error('[generateVibeCardSVG] Failed to load font:', fontError);
    throw new Error(`Font loading failed: ${fontError instanceof Error ? fontError.message : String(fontError)}`);
  }

  // アルバム画像をBase64に変換（並列処理）
  console.log('[generateVibeCardSVG] Converting album images to base64...');
  const albumImages = await Promise.all(
    albums.slice(0, 9).map(async (album, index) => {
      if (album.imageUrl) {
        try {
          console.log(`[generateVibeCardSVG] Converting image ${index + 1}/${albums.length}: ${album.name}`);
          const base64 = await imageToBase64(album.imageUrl);
          console.log(`[generateVibeCardSVG] Image ${index + 1} converted, length: ${base64.length}`);
          return base64;
        } catch (imageError) {
          console.error(`[generateVibeCardSVG] Failed to convert image to base64 for album ${index} (${album.name}):`, imageError);
          // エラー時はnullを返してフォールバック画像を使用
          return null;
        }
      }
      return null;
    })
  );
  console.log('[generateVibeCardSVG] Album images converted:', albumImages.filter(img => img !== null).length, 'successful');

  // JSXをSVGに変換
  let svg: string;
  try {
    console.log('[generateVibeCardSVG] Calling satori...');
    console.log('[generateVibeCardSVG] satori type:', typeof satori);
    svg = await satori(
      (
        <div
          style={{
            position: 'relative',
            width: cardWidth,
            height: cardHeight,
            backgroundColor: backgroundColor,
          }}
        >
          {/* アルバムグリッド（隙間なし、オーバーレイなし） */}
          {Array.from({ length: 9 }).map((_, index) => {
            const album = albums[index];
            const albumImage = albumImages[index];
            const row = Math.floor(index / gridSize);
            const col = index % gridSize;

            if (!album || !albumImage) {
              // 空のスロットまたは画像がない場合
              return (
                <div
                  key={index}
                  style={{
                    width: albumSize,
                    height: albumSize,
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    position: 'absolute',
                    left: col * albumSize,
                    top: row * albumSize,
                  }}
                />
              );
            }

            // アルバム画像のみを表示（オーバーレイなし、角丸なし、隙間なし）
            return (
              <img
                key={album.id}
                src={albumImage}
                alt={album.name}
                width={albumSize}
                height={albumSize}
                style={{
                  objectFit: 'cover',
                  position: 'absolute',
                  left: col * albumSize,
                  top: row * albumSize,
                }}
              />
            );
          })}
        </div>
      ),
      {
        width: cardWidth,
        height: cardHeight,
        fonts: [
          {
            name: 'Noto Sans JP',
            data: fontData,
            weight: 400,
            style: 'normal',
          },
          {
            name: 'Noto Sans JP',
            data: fontData,
            weight: 700,
            style: 'normal',
          },
        ],
      }
    );

    console.log('[generateVibeCardSVG] satori completed, SVG length:', svg?.length || 0);

    // SVGの検証
    if (!svg || svg.trim().length === 0) {
      console.error('[generateVibeCardSVG] SVG is empty');
      throw new Error('satori returned empty SVG');
    }

    if (!svg.startsWith('<svg')) {
      console.error('[generateVibeCardSVG] Generated SVG does not start with <svg tag');
      console.error('[generateVibeCardSVG] SVG preview (first 500 chars):', svg.substring(0, 500));
      throw new Error('satori returned invalid SVG');
    }

    console.log('[generateVibeCardSVG] SVG validation passed');
    console.log('[generateVibeCardSVG] SVG preview (first 200 chars):', svg.substring(0, 200));
    return svg;
  } catch (satoriError) {
    console.error('[generateVibeCardSVG] Error in satori SVG generation:', satoriError);
    console.error('[generateVibeCardSVG] Error type:', satoriError?.constructor?.name);
    console.error('[generateVibeCardSVG] Error message:', satoriError instanceof Error ? satoriError.message : String(satoriError));
    console.error('[generateVibeCardSVG] Error stack:', satoriError instanceof Error ? satoriError.stack : 'No stack trace');
    
    // satoriが失敗した場合は直接SVG生成にフォールバック
    console.log('[generateVibeCardSVG] Falling back to direct SVG generation...');
    try {
      const fallbackSvg = generateSVGDirectly(options, albumImages);
      console.log('[generateVibeCardSVG] Direct SVG generation successful, length:', fallbackSvg.length);
      return fallbackSvg;
    } catch (fallbackError) {
      console.error('[generateVibeCardSVG] Direct SVG generation also failed:', fallbackError);
      throw new Error(`SVG generation failed (both satori and direct method): ${satoriError instanceof Error ? satoriError.message : String(satoriError)}`);
    }
  }
}

/**
 * アルバムリストからVibe Card画像を生成
 * Instagram StoriesやTikTokに投稿したくなる高品質な画像を生成
 * Cloudflare Workers対応版（satori + @resvg/resvg-wasm使用）
 */
export async function generateVibeCard(options: VibeCardOptions): Promise<Response> {
  const {
    albums,
    title = 'My Favorite Albums',
    userName,
    backgroundColor = '#1a1a1a',
    textColor = '#ffffff',
  } = options;

  // 3x3グリッドで9枚のアルバムを表示
  const gridSize = 3;
  const albumSize = 280;
  const spacing = 20;
  const cardWidth = albumSize * gridSize + spacing * (gridSize + 1);
  const cardHeight = albumSize * gridSize + spacing * (gridSize + 1) + 200; // ヘッダー領域を追加

  // フォントを読み込む
  const fontData = await loadFont();

  // アルバム画像をBase64に変換（並列処理）
  const albumImages = await Promise.all(
    albums.slice(0, 9).map(async (album) => {
      if (album.imageUrl) {
        return await imageToBase64(album.imageUrl);
      }
      return null;
    })
  );

  // JSXをSVGに変換
  const svg = await satori(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          backgroundColor: backgroundColor,
          fontFamily: 'Noto Sans JP',
        }}
      >
        {/* ヘッダー */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 20px',
            width: '100%',
          }}
        >
          <div
            style={{
              fontSize: 48,
              fontWeight: 'bold',
              color: textColor,
              marginBottom: userName ? 10 : 0,
            }}
          >
            {title}
          </div>
          {userName && (
            <div
              style={{
                fontSize: 28,
                color: textColor,
                opacity: 0.8,
              }}
            >
              by {userName}
            </div>
          )}
        </div>

        {/* アルバムグリッド */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            alignItems: 'center',
            padding: `0 ${spacing}px`,
            gap: spacing,
            width: '100%',
            flex: 1,
          }}
        >
          {Array.from({ length: 9 }).map((_, index) => {
            const album = albums[index];
            const albumImage = albumImages[index];

            if (!album) {
              // 空のスロット
              return (
                <div
                  key={index}
                  style={{
                    width: albumSize,
                    height: albumSize,
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                />
              );
            }

            return (
              <div
                key={album.id}
                style={{
                  position: 'relative',
                  width: albumSize,
                  height: albumSize,
                  borderRadius: 12,
                  overflow: 'hidden',
                  boxShadow: '0 8px 16px rgba(0, 0, 0, 0.3)',
                }}
              >
                {albumImage && (
                  <img
                    src={albumImage}
                    alt={album.name}
                    width={albumSize}
                    height={albumSize}
                    style={{
                      objectFit: 'cover',
                    }}
                  />
                )}
                {/* オーバーレイ（アルバム名とアーティスト名） */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
                    padding: '16px 12px',
                    color: textColor,
                  }}
                >
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 'bold',
                      marginBottom: 4,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {album.name}
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      opacity: 0.9,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {album.artist}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* フッター */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            width: '100%',
            borderTop: `1px solid rgba(255, 255, 255, 0.1)`,
          }}
        >
          <div
            style={{
              fontSize: 20,
              color: textColor,
              opacity: 0.6,
            }}
          >
            MyFavoriteAlbums
          </div>
        </div>
      </div>
    ),
    {
      width: cardWidth,
      height: cardHeight,
      fonts: [
        {
          name: 'Noto Sans JP',
          data: fontData,
          weight: 400,
          style: 'normal',
        },
        {
          name: 'Noto Sans JP',
          data: fontData,
          weight: 700,
          style: 'normal',
        },
      ],
    }
  );

  try {
    // SVGをPNGに変換
    const resvg = new Resvg(svg, {
      font: {
        loadSystemFonts: false,
      },
    });
    const pngData = resvg.render();
    const pngBuffer = pngData.asPng();

    // PNG画像をResponseとして返す
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
      },
    });
  }
}
