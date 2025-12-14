/**
 * Spotify API連携サービス
 * Client Credentials Flowを使用してアクセストークンを取得し、アルバム検索を行う
 */

export interface SpotifyAlbum {
  id: string;
  name: string;
  artist: string;
  imageUrl: string;
  releaseDate: string;
  spotifyUrl: string;
  spotifyId: string;
}

interface SpotifyAccessTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface SpotifySearchResponse {
  albums: {
    items: Array<{
      id: string;
      name: string;
      artists: Array<{ name: string }>;
      images: Array<{ url: string; height: number; width: number }>;
      release_date: string;
      external_urls: { spotify: string };
    }>;
  };
}

interface SpotifyServiceConfig {
  clientId: string;
  clientSecret: string;
}

/**
 * Spotify APIのアクセストークンを取得（Client Credentials Flow）
 */
async function getAccessToken(config: SpotifyServiceConfig): Promise<string> {
  const credentials = btoa(`${config.clientId}:${config.clientSecret}`);
  
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get access token: ${response.status} ${errorText}`);
  }

  const data: SpotifyAccessTokenResponse = await response.json();
  return data.access_token;
}

/**
 * Spotify APIでアルバムを検索
 */
export async function searchAlbums(
  query: string,
  config: SpotifyServiceConfig
): Promise<SpotifyAlbum[]> {
  if (!query || query.trim().length === 0) {
    return [];
  }

  // アクセストークンを取得
  const accessToken = await getAccessToken(config);

  // 検索クエリをエンコード
  const encodedQuery = encodeURIComponent(query);
  const url = `https://api.spotify.com/v1/search?q=${encodedQuery}&type=album&limit=20`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Spotify API error: ${response.status} ${errorText}`);
  }

  const data: SpotifySearchResponse = await response.json();

  // レスポンスをDBのalbumsテーブル形式に整形
  return data.albums.items.map((album) => {
    // 最大サイズの画像を取得（なければ最初の画像）
    const image = album.images.length > 0
      ? album.images.reduce((prev, current) => 
          (current.height || 0) > (prev.height || 0) ? current : prev
        )
      : null;

    // アーティスト名を結合（複数アーティストの場合）
    const artistName = album.artists.map((a) => a.name).join(', ');

    return {
      id: `spotify_${album.id}`, // DB用のID（Spotify IDをプレフィックス付きで保存）
      spotifyId: album.id,
      name: album.name,
      artist: artistName,
      imageUrl: image?.url || '',
      releaseDate: album.release_date || '',
      spotifyUrl: album.external_urls.spotify,
    };
  });
}

