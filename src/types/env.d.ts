// Cloudflare Workers環境の型定義
export interface Env {
  DB: D1Database;
  // Spotify API認証情報
  SPOTIFY_CLIENT_ID: string;
  SPOTIFY_CLIENT_SECRET: string;
  // 必要に応じて他のバインディングを追加
  // CACHE?: KVNamespace;
  // ASSETS?: R2Bucket;
}

