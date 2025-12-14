# 変更履歴

## 2025-12-14

### フロントエンドセットアップ

#### 新規追加
- **フロントエンドプロジェクト作成** (`frontend/`)
  - Vite + React + TypeScript プロジェクト
  - Tailwind CSS v3.4.19 導入
  - PostCSS設定
  - Viteプロキシ設定（`/api` → `http://localhost:8787`）

- **APIクライアント実装** (`frontend/src/lib/api.ts`)
  - `healthCheck()` - ヘルスチェック
  - `searchAlbums()` - アルバム検索
  - `createPost()` - 投稿作成
  - `getPosts()` - 投稿一覧取得
  - `getPost()` - 投稿詳細取得
  - `getVibeCardUrl()` - Vibe Card画像URL取得

- **初期UI実装** (`frontend/src/App.tsx`)
  - ヘルスチェック表示コンポーネント
  - Tailwind CSSを使用したシンプルなUI
  - バックエンド接続状態の表示

#### 設定ファイル
- `frontend/vite.config.ts` - Vite設定（プロキシ設定含む）
- `frontend/tailwind.config.js` - Tailwind CSS設定
- `frontend/postcss.config.js` - PostCSS設定
- `frontend/tsconfig.json` - TypeScript設定

#### ドキュメント更新
- `.gitignore` - フロントエンド関連の除外設定追加
- `README.md` - フロントエンド開発コマンド追加

---

## 2025-12-14（以前）

### バックエンド実装

#### 投稿作成機能
- **POST /api/posts** エンドポイント実装
  - User/Album/Post/PostAlbumのトランザクション処理
  - Album Upsert処理（spotify_idで重複排除）
  - バリデーション（userName必須、albums最大9件）
  - 検索→保存→画像生成の完全なフロー実装

#### Spotify API連携
- **Spotify Service実装** (`src/services/spotify.ts`)
  - Client Credentials Flowによるアクセストークン取得
  - アルバム検索機能
  - DBのalbumsテーブル形式に整形したレスポンス

- **GET /api/search** エンドポイント実装
  - クエリパラメータ `q` でアルバム検索
  - エラーハンドリングと環境変数チェック

#### 画像生成機能
- **Vibe Card画像生成** (`src/utils/vibe-card.tsx`)
  - `satori` + `@resvg/resvg-wasm`を使用した画像生成
  - Cloudflare Workers対応
  - 日本語フォント（Noto Sans JP）対応
  - SVGフォールバック機能実装

- **GET /api/vibe-card** エンドポイント実装
  - 投稿IDからVibe Card画像を生成
  - テスト用エンドポイント (`/api/vibe-card/test`)

#### プロジェクト初期化
- Cloudflare Workers + Hono + TypeScript セットアップ
- Cloudflare D1 データベース設定
- Drizzle ORM の設定
- データベーススキーマ定義（users, albums, posts, post_albums）
- 基本的なAPIエンドポイント実装

---

## ブランチ構成

### `feature/initial-setup`
バックエンドの初期セットアップとコア機能実装
- プロジェクト初期化
- データベーススキーマ定義
- 基本的なAPIエンドポイント
- 画像生成機能
- Spotify API連携
- 投稿作成機能

### `feature/frontend-setup`
フロントエンドのセットアップ
- Vite + React + TypeScript プロジェクト作成
- Tailwind CSS導入
- APIクライアント実装
- 初期UI実装

---

## 次のステップ

### フロントエンド実装
- [ ] アルバム検索画面
- [ ] アルバム選択画面（9枚選択）
- [ ] 投稿作成画面
- [ ] 投稿一覧画面
- [ ] 投稿詳細画面
- [ ] Vibe Card画像表示・ダウンロード機能

### バックエンド機能追加
- [ ] ユーザー認証機能
- [ ] 投稿編集・削除機能
- [ ] 画像キャッシュ機能（Cloudflare KV）
- [ ] 検索機能の強化

