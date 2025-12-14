// Cloudflare Workers環境の型定義
export interface Env {
  DB: D1Database;
  // 必要に応じて他のバインディングを追加
  // CACHE?: KVNamespace;
  // ASSETS?: R2Bucket;
}

