/**
 * バックエンドAPIクライアント
 */

const API_BASE_URL = '/api';

/**
 * ヘルスチェック
 */
export async function healthCheck(): Promise<{ message: string; version: string; status: string }> {
  const response = await fetch(`${API_BASE_URL}/`);
  if (!response.ok) {
    throw new Error(`Health check failed: ${response.statusText}`);
  }
  return await response.json();
}

/**
 * アルバム検索
 */
export async function searchAlbums(query: string): Promise<{
  query: string;
  count: number;
  albums: Array<{
    id: string;
    spotifyId: string;
    name: string;
    artist: string;
    imageUrl: string;
    releaseDate: string;
    spotifyUrl: string;
  }>;
}> {
  const response = await fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(query)}`);
  if (!response.ok) {
    throw new Error(`Search failed: ${response.statusText}`);
  }
  return await response.json();
}

/**
 * 投稿作成
 */
export async function createPost(data: {
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
}): Promise<{ success: boolean; id: string; userId: string }> {
  const response = await fetch(`${API_BASE_URL}/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `Post creation failed: ${response.statusText}`);
  }
  return await response.json();
}

/**
 * 投稿一覧取得
 */
export async function getPosts(limit = 20, offset = 0): Promise<{
  posts: Array<{
    id: string;
    userId: string;
    title: string | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
}> {
  const response = await fetch(`${API_BASE_URL}/posts?limit=${limit}&offset=${offset}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch posts: ${response.statusText}`);
  }
  return await response.json();
}

/**
 * 投稿詳細取得
 */
export async function getPost(id: string): Promise<{
  post: {
    id: string;
    userId: string;
    title: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
  albums: Array<{
    id: string;
    spotifyId: string;
    name: string;
    artist: string;
    imageUrl: string;
    releaseDate: string | null;
    spotifyUrl: string | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
}> {
  const response = await fetch(`${API_BASE_URL}/posts/${id}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch post: ${response.statusText}`);
  }
  return await response.json();
}

/**
 * Vibe Card画像URL取得
 */
export function getVibeCardUrl(postId: string): string {
  return `${API_BASE_URL}/vibe-card?postId=${encodeURIComponent(postId)}`;
}

