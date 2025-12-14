# クイックスタートガイド

## 🚀 すぐに始める

### 1. 依存関係のインストール

```bash
npm install
```

### 2. ローカル開発サーバー起動

```bash
npm run dev
```

サーバーは `http://localhost:8787` で起動します。

### 3. 動作確認

ブラウザまたはcurlで以下のエンドポイントにアクセス：

```bash
# ヘルスチェック
curl http://localhost:8787/

# テスト用エンドポイント（モックデータ）
curl http://localhost:8787/api/vibe-card/test
```

## 📝 データベース操作

### 初回セットアップ

```bash
# マイグレーションファイルは既に生成済み
# ローカル環境にマイグレーションを適用
npx wrangler d1 migrations apply my-favorite-albums --local
```

### スキーマ変更時

```bash
# 1. src/db/schema.ts を編集

# 2. マイグレーションファイルを生成
npm run db:generate

# 3. ローカル環境に適用
npx wrangler d1 migrations apply my-favorite-albums --local
```

## 🔍 現在の状態

- ✅ 基本的なAPIエンドポイントは動作中
- ⚠️ 画像生成機能は未実装（@vercel/ogがWorkers非対応）
- ✅ データベーススキーマは定義済み

詳細は `SETUP.md` を参照してください。

