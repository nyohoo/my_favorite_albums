# 🚀 クイックスタートガイド

## 前提条件

- Node.js 18以上
- npm または yarn
- Spotify Developerアカウント（無料）

## 1. リポジトリのクローンとセットアップ

```bash
git clone <repository-url>
cd MyFavoriteAlbums
npm install
cd frontend
npm install
cd ..
```

## 2. Spotify API認証情報の設定

### 2.1 Spotify Developer Dashboardでアプリ作成

1. [Spotify for Developers](https://developer.spotify.com/dashboard) にアクセス
2. 「Create app」をクリック
3. アプリ情報を入力して作成
4. **Client ID** と **Client Secret** をコピー

### 2.2 環境変数の設定

プロジェクトルートに `.dev.vars` ファイルを作成：

```bash
SPOTIFY_CLIENT_ID=your-client-id-here
SPOTIFY_CLIENT_SECRET=your-client-secret-here
```

**重要**: `.dev.vars` は `.gitignore` に含まれているため、Gitにはコミットされません。

## 3. データベースのセットアップ

```bash
# マイグレーションの適用（ローカル環境）
npx wrangler d1 migrations apply my-favorite-albums --local
```

## 4. 開発サーバーの起動

### 4.1 バックエンドサーバー（ターミナル1）

```bash
npm run dev
```

バックエンドが `http://localhost:8787` で起動します。

### 4.2 フロントエンドサーバー（ターミナル2）

```bash
cd frontend
npm run dev
```

フロントエンドが `http://localhost:5173` で起動します。

## 5. 動作確認

### 5.1 バックエンドのヘルスチェック

ブラウザで `http://localhost:8787/` にアクセス：

```json
{
  "message": "MyFavoriteAlbums API",
  "version": "1.0.0",
  "status": "ok"
}
```

### 5.2 Spotify検索APIのテスト

```bash
curl "http://localhost:8787/api/search?q=beatles"
```

正常な場合、アルバムのリストが返されます。

### 5.3 フロントエンドからの検索

1. `http://localhost:5173` にアクセス
2. 3x3グリッドの空きスロット（プラスボタン）をクリック
3. 検索ダイアログでアルバム名やアーティスト名を入力
4. 検索結果からアルバムを選択
5. 選択したアルバムがグリッドに表示されることを確認

## 6. トラブルシューティング

### エラー: "Spotify API credentials not configured"

**解決方法**:
- `.dev.vars` ファイルが正しく設定されているか確認
- バックエンドサーバーを再起動

### エラー: "Failed to fetch" または "NetworkError"

**解決方法**:
- バックエンドサーバー（`npm run dev`）が起動しているか確認
- `http://localhost:8787/` に直接アクセスして動作確認

### 検索結果が表示されない

**解決方法**:
- ブラウザの開発者ツール（F12）でネットワークタブを確認
- バックエンドのログを確認
- 別の検索キーワードで試す

## 7. 次のステップ

- [ ] 9枚のアルバムを選択
- [ ] ユーザー名とタイトルを入力
- [ ] 「投稿を作成」ボタンをクリック
- [ ] 投稿が正常に作成されることを確認

詳細な情報は [`SPOTIFY_SETUP.md`](./SPOTIFY_SETUP.md) を参照してください。
