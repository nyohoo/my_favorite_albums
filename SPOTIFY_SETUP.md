# Spotify API セットアップガイド

## 📋 概要

MyFavoriteAlbumsでSpotify APIを使用するためのセットアップ手順です。

## 🔑 Spotify Developer Dashboard での設定

### 1. Spotify Developerアカウントの作成

1. [Spotify for Developers](https://developer.spotify.com/dashboard) にアクセス
2. Spotifyアカウントでログイン（なければ作成）

### 2. アプリの作成

1. Dashboardで「Create app」をクリック
2. アプリ情報を入力：
   - **App name**: MyFavoriteAlbums（任意）
   - **App description**: アルバム検索サービス（任意）
   - **Website**: 任意（例: `http://localhost:8787`）
   - **Redirect URI**: 今回は不要（Client Credentials Flowを使用）
   - **Developer contact email**: あなたのメールアドレス
3. 「Save」をクリック

### 3. Client ID と Client Secret の取得

1. 作成したアプリのページで「Settings」をクリック
2. **Client ID** と **Client Secret** をコピー
   - Client Secretは「View client secret」をクリックして表示

## 🔧 ローカル開発環境の設定

### 1. `.dev.vars` ファイルの作成

プロジェクトルートに `.dev.vars` ファイルを作成（既に存在する場合は編集）：

```bash
# .dev.vars
SPOTIFY_CLIENT_ID=your-client-id-here
SPOTIFY_CLIENT_SECRET=your-client-secret-here
```

**重要**: `.dev.vars` は `.gitignore` に含まれているため、Gitにはコミットされません。

### 2. バックエンドサーバーの起動

```bash
# プロジェクトルートで実行
npx wrangler dev
```

サーバーが `http://localhost:8787` で起動します。

### 3. フロントエンドサーバーの起動

別のターミナルで：

```bash
cd frontend
npm run dev
```

フロントエンドが `http://localhost:5173` で起動します。

## ✅ 動作確認

### 1. ヘルスチェック

ブラウザで `http://localhost:8787/` にアクセス：

```json
{
  "message": "MyFavoriteAlbums API",
  "version": "1.0.0",
  "status": "ok"
}
```

### 2. Spotify検索APIのテスト

```bash
curl "http://localhost:8787/api/search?q=beatles"
```

正常な場合、アルバムのリストが返されます。

### 3. フロントエンドからの検索

1. `http://localhost:5173` にアクセス
2. 検索ダイアログを開く
3. アルバム名やアーティスト名で検索
4. 検索結果が表示されることを確認

## 🚨 トラブルシューティング

### エラー: "Spotify API credentials not configured"

**原因**: `.dev.vars` ファイルが正しく設定されていない、または読み込まれていない

**解決方法**:
1. `.dev.vars` ファイルがプロジェクトルートに存在するか確認
2. `SPOTIFY_CLIENT_ID` と `SPOTIFY_CLIENT_SECRET` が正しく設定されているか確認
3. バックエンドサーバーを再起動

### エラー: "Failed to get access token"

**原因**: Client ID または Client Secret が間違っている

**解決方法**:
1. Spotify Developer Dashboardで Client ID と Client Secret を再確認
2. `.dev.vars` ファイルの値を更新
3. バックエンドサーバーを再起動

### エラー: "NetworkError" または "Failed to fetch"

**原因**: バックエンドサーバーが起動していない、またはプロキシ設定の問題

**解決方法**:
1. バックエンドサーバー（`wrangler dev`）が起動しているか確認
2. `http://localhost:8787/` に直接アクセスして動作確認
3. フロントエンドの `vite.config.ts` のプロキシ設定を確認

### 検索結果が表示されない

**原因**: Spotify APIのレート制限、または検索クエリの問題

**解決方法**:
1. 別の検索キーワードで試す
2. ブラウザの開発者ツールでネットワークエラーを確認
3. バックエンドのログを確認

## 📝 本番環境での設定

本番環境（Cloudflare Workers）では、環境変数を `wrangler secret` コマンドで設定します：

```bash
# Cloudflare Workersにデプロイ後
npx wrangler secret put SPOTIFY_CLIENT_ID
npx wrangler secret put SPOTIFY_CLIENT_SECRET
```

または、`wrangler.toml` の `[vars]` セクションに設定することもできますが、**機密情報は `wrangler secret` を使用することを強く推奨**します。

## 🔒 セキュリティ注意事項

- **Client Secret は絶対にGitにコミットしない**
- `.dev.vars` は `.gitignore` に含まれていることを確認
- 本番環境では `wrangler secret` を使用
- Client Secret を他人と共有しない

## 📚 参考リンク

- [Spotify Web API Documentation](https://developer.spotify.com/documentation/web-api)
- [Client Credentials Flow](https://developer.spotify.com/documentation/web-api/tutorials/client-credentials-flow)
- [Cloudflare Workers Secrets](https://developers.cloudflare.com/workers/configuration/secrets/)

