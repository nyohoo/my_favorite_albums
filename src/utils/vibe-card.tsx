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
  const fontUrl = 'https://fonts.gstatic.com/s/notosansjp/v52/-F6jfjtqLzI2JPCgQBnw7HFyzSD-AsregP8VFBEj75s.ttf';
  const response = await fetch(fontUrl);
  if (!response.ok) {
    throw new Error(`Failed to load font: ${response.statusText}`);
  }
  return await response.arrayBuffer();
}

// 画像をBase64に変換（Cloudflare Workersで使用可能な形式）
async function imageToBase64(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const base64 = btoa(
      String.fromCharCode(...new Uint8Array(arrayBuffer))
    );
    return `data:image/jpeg;base64,${base64}`;
  } catch (error) {
    console.error('Error converting image to base64:', error);
    // フォールバック: 透明な1x1画像
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
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
