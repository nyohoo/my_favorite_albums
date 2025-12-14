# MyFavoriteAlbums セットアップまとめ

## 📋 プロジェクト概要

**MyFavoriteAlbums** - 維持費0円を目指したモダンな音楽アルバム共有サービス

### 技術スタック

- **Runtime**: Cloudflare Workers (TypeScript)
- **Framework**: Hono 4.6.11 (軽量・高速でエッジに最適)
- **Database**: Cloudflare D1 (SQLite)
- **ORM**: Drizzle ORM 0.36.4
- **Image Gen**: @vercel/og 1.0.0 (※現在は未使用、Workers非対応のため)

---

## ✅ 完了したセットアップ

### 1. プロジェクト初期化

- ✅ Wrangler + Hono + TypeScript のセットアップ完了
- ✅ 必要な依存関係のインストール完了
- ✅ TypeScript設定 (`tsconfig.json`) の設定完了

### 2. データベース設定

- ✅ Cloudflare D1 データベース設定 (`wrangler.toml`)
- ✅ Drizzle ORM の設定 (`drizzle.config.ts`)
- ✅ データベーススキーマ定義 (`src/db/schema.ts`)
- ✅ マイグレーションファイル生成 (`migrations/0000_opposite_xorn.sql`)

#### データベーススキーマ

以下の4つのテーブルが定義されています：

1. **users** - ユーザー情報
   - `id`, `name`, `created_at`, `updated_at`

2. **albums** - アルバム情報
   - `id`, `spotify_id`, `name`, `artist`, `image_url`, `release_date`, `spotify_url`, `created_at`, `updated_at`

3. **posts** - 投稿情報（9枚のアルバムリスト）
   - `id`, `user_id`, `title`, `created_at`, `updated_at`

4. **post_albums** - 投稿とアルバムの中間テーブル
   - `id`, `post_id`, `album_id`, `position` (1-9), `created_at`

### 3. APIエンドポイント実装

#### 実装済みエンドポイント

- ✅ `GET /` - ヘルスチェック
- ✅ `GET /api/posts` - 投稿一覧取得
- ✅ `GET /api/posts/:id` - 投稿詳細取得（アルバム情報含む）
- ✅ `GET /api/vibe-card?postId=xxx` - Vibe Card画像生成（※現在はJSON返却）
- ✅ `GET /api/vibe-card/test` - テスト用エンドポイント（モックデータ）

### 4. 画像生成機能（プロトタイプ）

- ✅ `src/utils/vibe-card.tsx` - Vibe Card画像生成ロジック（実装済み）
- ⚠️ **注意**: `@vercel/og`はCloudflare Workersでは動作しないため、現在は無効化されています
- 代替実装が必要（後述の「次のステップ」参照）

---

## 📁 プロジェクト構造

```
MyFavoriteAlbums/
├── src/
│   ├── index.ts              # メインエントリーポイント（APIルート定義）
│   ├── db/
│   │   ├── index.ts          # DB接続設定（Drizzle初期化）
│   │   └── schema.ts         # Drizzleスキーマ定義
│   ├── types/
│   │   └── env.d.ts          # 環境変数の型定義
│   └── utils/
│       └── vibe-card.tsx     # Vibe Card画像生成ロジック（未使用）
├── migrations/               # データベースマイグレーションファイル
│   ├── 0000_opposite_xorn.sql
│   └── meta/
├── drizzle.config.ts         # Drizzle Kit設定
├── wrangler.toml            # Cloudflare Workers設定
├── tsconfig.json            # TypeScript設定
├── package.json             # 依存関係
└── README.md                # プロジェクト説明
```

---

## 🛠️ 開発コマンド

### セットアップ（初回のみ）

```bash
# 依存関係のインストール
npm install
```

### ローカル開発

```bash
# ローカル開発サーバー起動（ポート8787）
npm run dev
# または
npx wrangler dev --local --port 8787
```

### データベース操作

```bash
# マイグレーションファイルの生成（スキーマ変更時）
npm run db:generate

# ローカル環境にマイグレーション適用
npx wrangler d1 migrations apply my-favorite-albums --local

# 本番環境にマイグレーション適用（APIトークン必要）
npm run db:migrate

# Drizzle Studio（DB管理UI）の起動
npm run db:studio
```

### デプロイ

```bash
# 本番環境にデプロイ
npm run deploy
```

---

## 🌐 動作確認

### ローカル開発サーバー起動後

以下のエンドポイントにアクセス可能：

1. **ヘルスチェック**
   ```
   http://localhost:8787/
   ```
   レスポンス例:
   ```json
   {
     "message": "MyFavoriteAlbums API",
     "version": "1.0.0",
     "status": "ok"
   }
   ```

2. **テスト用エンドポイント**
   ```
   http://localhost:8787/api/vibe-card/test
   ```
   モックアルバムデータ（9件）をJSON形式で返却

3. **投稿一覧**
   ```
   http://localhost:8787/api/posts
   ```

4. **投稿詳細**
   ```
   http://localhost:8787/api/posts/:id
   ```

---

## ⚠️ 既知の問題・制限事項

### 1. 画像生成機能が未実装

**問題**: `@vercel/og`はNode.js環境向けのため、Cloudflare Workersでは動作しません。

**現在の状態**: 
- `src/utils/vibe-card.tsx`は実装済みだが、使用されていない
- 画像生成エンドポイントはJSONを返却

**解決策の選択肢**:
1. **SVG生成 + クライアント側レンダリング**: SVGを生成し、ブラウザでPNGに変換
2. **Cloudflare Pages Functions**: Node.js環境で`@vercel/og`を使用
3. **外部画像生成API**: 別サービスを利用
4. **Workers互換ライブラリ**: 代替画像生成ライブラリを検討

---

## 📝 次のステップ

### 優先度: 高

1. **画像生成機能の実装**
   - Cloudflare Workers向けの画像生成ソリューションを選択・実装
   - Vibe Card画像生成機能を有効化

2. **Spotify API連携**
   - Spotify API認証の実装
   - アルバム検索機能
   - アルバム情報取得機能

3. **ユーザー認証機能**
   - OAuth認証（Spotify、Google等）
   - セッション管理

### 優先度: 中

4. **投稿作成・編集・削除機能**
   - POST `/api/posts` - 投稿作成
   - PUT `/api/posts/:id` - 投稿編集
   - DELETE `/api/posts/:id` - 投稿削除

5. **フロントエンド実装**
   - 投稿一覧画面
   - 投稿詳細画面
   - 投稿作成画面

### 優先度: 低

6. **画像ダウンロード機能の最適化**
7. **キャッシュ機能の実装**（Cloudflare KV）
8. **検索機能の実装**

---

## 🔧 設定ファイル詳細

### `wrangler.toml`

```toml
name = "my-favorite-albums"
main = "src/index.ts"
compatibility_date = "2025-01-20"
compatibility_flags = ["nodejs_compat"]

[[d1_databases]]
binding = "DB"
database_name = "my-favorite-albums"
database_id = "" # 初回デプロイ後に自動生成される
```

### `drizzle.config.ts`

```typescript
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './migrations',
  dialect: 'sqlite',
  driver: 'd1-http',
  dbCredentials: {
    wranglerConfigPath: './wrangler.toml',
    dbName: 'my-favorite-albums',
  },
});
```

---

## 📦 インストール済みパッケージ

### 依存関係 (dependencies)

- `hono`: ^4.6.11 - Webフレームワーク
- `drizzle-orm`: ^0.36.4 - ORM
- `@vercel/og`: ^1.0.0 - 画像生成（※Workers非対応）
- `react`: ^19.2.3 - React（JSX使用のため）
- `@types/react`: ^19.2.7 - React型定義

### 開発依存関係 (devDependencies)

- `wrangler`: ^4.54.0 - Cloudflare Workers CLI
- `drizzle-kit`: ^0.30.0 - Drizzle ORM CLI
- `typescript`: ^5.7.2 - TypeScript
- `@cloudflare/workers-types`: ^4.20250115.0 - Workers型定義
- `@types/node`: ^20.17.6 - Node.js型定義

---

## 🚀 本番環境デプロイ手順

### 1. Cloudflare APIトークンの取得

1. [Cloudflare Dashboard](https://dash.cloudflare.com/) にログイン
2. 「My Profile」→「API Tokens」に移動
3. 「Create Token」をクリック
4. 適切な権限を設定してトークンを作成

### 2. 環境変数の設定

```bash
export CLOUDFLARE_API_TOKEN="your-api-token"
```

### 3. D1データベースの作成

```bash
npx wrangler d1 create my-favorite-albums
```

生成された`database_id`を`wrangler.toml`に設定

### 4. マイグレーションの適用

```bash
npm run db:migrate
```

### 5. デプロイ

```bash
npm run deploy
```

---

## 📚 参考資料

- [Cloudflare Workers ドキュメント](https://developers.cloudflare.com/workers/)
- [Hono ドキュメント](https://hono.dev/)
- [Drizzle ORM ドキュメント](https://orm.drizzle.team/)
- [Cloudflare D1 ドキュメント](https://developers.cloudflare.com/d1/)

---

## 📝 変更履歴

### 2025-12-14

- ✅ プロジェクト初期化完了
- ✅ データベーススキーマ定義完了
- ✅ 基本的なAPIエンドポイント実装完了
- ✅ ローカル開発環境のセットアップ完了
- ⚠️ 画像生成機能は未実装（@vercel/ogがWorkers非対応のため）

