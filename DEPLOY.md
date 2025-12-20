# 本番デプロイ手順書

## 概要

MyFavoriteAlbumsは、Cloudflare Workers（バックエンド）とCloudflare Pages（フロントエンド）を使用してデプロイします。
両方とも無料プランで十分な帯域幅を提供し、**維持費0円**を実現できます。

## 前提条件

- Cloudflareアカウント（無料）
- Node.js 18以上
- Wrangler CLIがインストールされていること（`npm install -g wrangler`）
- Spotify Developerアカウント（無料）

## 1. 初回セットアップ

### 1.1 Cloudflareアカウントの準備

#### アカウント作成（未登録の場合）

1. [Cloudflare公式サイト](https://www.cloudflare.com/) にアクセス
2. 「Sign Up」をクリックしてアカウントを作成
   - メールアドレスとパスワードで登録可能（無料）
   - 電話番号認証が必要な場合があります
3. メール認証を完了

#### 既存アカウントの場合

1. [Cloudflare Dashboard](https://dash.cloudflare.com/) にログイン

#### Wrangler CLIでのログイン

ターミナルで以下のコマンドを実行:

```bash
npx wrangler login
```

実行すると、ブラウザが自動的に開き、Cloudflareアカウントへのログインを求められます。

1. ブラウザでCloudflareにログイン
2. 「Authorize」をクリックしてWrangler CLIに権限を付与
3. ターミナルに「Successfully logged in」と表示されれば完了

**注意**: 
- カスタムドメインは**必須ではありません**
- Cloudflare PagesとWorkersは、デフォルトのURL（`*.pages.dev`、`*.workers.dev`）で動作します
- カスタムドメインを設定する場合は、後述の「カスタムドメインの設定」セクションを参照してください

#### Workers.devサブドメインの登録（初回のみ）

初回デプロイ時は、Workersのサブドメインを登録する必要があります:

1. デプロイ時に表示されたURLにアクセス:
   ```
   https://dash.cloudflare.com/.../workers/onboarding
   ```
   または、[Cloudflare Dashboard](https://dash.cloudflare.com/) → 「Workers & Pages」→ 「Get started」をクリック

2. サブドメインを入力（例: `my-albums`）
   - このサブドメインは後で変更できます
   - 入力後、「Set up subdomain」をクリック

3. 登録が完了したら、再度デプロイを実行:
   ```bash
   npm run deploy:backend
   ```

**注意**: サブドメインは一度登録すると、アカウント全体で使用されます。複数のWorkerをデプロイする場合も、同じサブドメインを使用します。

### 1.2 D1データベースの作成

```bash
# D1データベースを作成
npx wrangler d1 create my-favorite-albums

# 出力されたdatabase_idを wrangler.toml の database_id に設定
```

`wrangler.toml` を編集:
```toml
[[d1_databases]]
binding = "DB"
database_name = "my-favorite-albums"
database_id = "取得したdatabase_idをここに設定"
```

### 1.3 データベースマイグレーションの適用

```bash
# 本番環境（リモート）にマイグレーションを適用
npm run db:migrate

# または直接実行する場合
npx wrangler d1 migrations apply my-favorite-albums --remote
```

**注意**: 本番環境に適用する場合は `--remote` フラグが必要です。ローカル環境に適用する場合は `npm run db:migrate:local` を使用してください。

## 2. 環境変数の設定

### 2.1 Spotify API認証情報の設定

本番環境のシークレットを設定:

```bash
# Spotify Client IDを設定
npx wrangler secret put SPOTIFY_CLIENT_ID

# Spotify Client Secretを設定
npx wrangler secret put SPOTIFY_CLIENT_SECRET
```

各コマンド実行時に、対話形式で値を入力します。

### 2.2 環境変数の確認

```bash
# 設定されたシークレットを確認（値は表示されません）
npx wrangler secret list
```

## 3. バックエンド（Cloudflare Workers）のデプロイ

### 3.1 デプロイ前チェック

```bash
# フロントエンドのビルドとデータベースチェック
npm run deploy:check
```

### 3.2 デプロイ実行

```bash
# バックエンドをデプロイ
npm run deploy:backend
# または
npx wrangler deploy
```

デプロイが成功すると、以下のようなURLが表示されます:
```
https://albums.favorite.albums.workers.dev
```

**`favorite.albums.workers.dev` 形式にする場合**:

1. **アカウントサブドメインを `favorite.albums` に設定**:
   - [Cloudflare Dashboard](https://dash.cloudflare.com/) にログイン
   - 右上のアカウント名をクリック → 「My Profile」
   - 「Workers」セクションで「Subdomain」を `favorite.albums` に設定
   - これにより、Worker名が `albums` の場合、URLは `albums.favorite.albums.workers.dev` になります

2. **より短いURLにする場合**:
   - Worker名を `api` や `www` など短い名前に変更すると、`api.favorite.albums.workers.dev` のようになります
   - または、カスタムドメインを使用して `favorite.albums` を直接設定することも可能です

このURLをメモしておいてください（フロントエンドの設定で使用します）。

#### WorkersのURLについて

WorkersのURLは以下の形式です:
```
https://{worker-name}.{account-subdomain}.workers.dev
```

**URLの変更方法**:

1. **Worker名の変更**（`my-favorite-albums`の部分）:
   - `wrangler.toml`の`name`フィールドを変更
   - 例: `name = "my-albums"` → `https://my-albums.your-subdomain.workers.dev`

2. **アカウントサブドメインの変更**（`your-subdomain`の部分）:
   - Cloudflareダッシュボードのアカウント設定で変更可能
   - 手順:
     1. [Cloudflare Dashboard](https://dash.cloudflare.com/) にログイン
     2. 右上のアカウント名をクリック → 「My Profile」
     3. 「Workers」セクションで「Subdomain」を変更
   - **注意**: アカウントサブドメインは一度設定すると変更が制限される場合があります

3. **カスタムドメインの使用**（推奨）:
   - `*.workers.dev`のURLを使わずに、カスタムドメインを使用
   - 例: `https://api.yourdomain.com`
   - 設定方法は「7. カスタムドメインの設定」セクションを参照

## 4. フロントエンド（Cloudflare Pages）のデプロイ

### 4.1 Cloudflare Pagesプロジェクトの作成

1. [Cloudflare Dashboard](https://dash.cloudflare.com/) にアクセス
2. 「Workers & Pages」→「Create application」→「Pages」を選択
3. 「Connect to Git」を選択してGitHubリポジトリを接続
4. プロジェクト設定:
   - **Project name**: `my-favorite-albums`
   - **Production branch**: `main`（またはデプロイしたいブランチ）
   - **Framework preset**: `Vite`
   - **Build command**: `cd frontend && npm run build`
   - **Build output directory**: `frontend/dist`
   - **Root directory**: `/`（プロジェクトルート）

### 4.2 環境変数の設定

Cloudflare Pagesのダッシュボードで環境変数を設定:

1. プロジェクトの「Settings」→「Environment variables」に移動
2. 以下の環境変数を追加:

```
VITE_API_BASE_URL=https://albums.albums.workers.dev/api
```

**重要**: 
- 実際のWorkersのURLに置き換えてください（現在は `https://albums.albums.workers.dev/api`）
- **セキュリティについて**: 
  - `VITE_API_BASE_URL`はビルド時にフロントエンドのJavaScriptコードに埋め込まれます
  - ユーザーが開発者ツールで確認できる可能性がありますが、**これは問題ありません**
  - APIエンドポイントのURL自体は公開されても問題ない情報です
  - 機密情報（Spotify API認証情報など）はWorkersのシークレットとして管理されており、フロントエンドには含まれません
  - この設計は一般的なWebアプリケーションの標準的な方法です

### 4.3 デプロイの実行

GitHubにプッシュすると、自動的にデプロイが開始されます:

```bash
git push origin main
```

または、手動でデプロイする場合:

```bash
# フロントエンドをビルド
npm run build:frontend

# Cloudflare Pagesにデプロイ（Wranglerを使用）
npx wrangler pages deploy frontend/dist --project-name=my-favorite-albums
```

デプロイが成功すると、以下のようなURLが表示されます:
```
https://{project-name}.pages.dev
```

**例**: プロジェクト名を `my-favorite-albums` に設定した場合:
```
https://my-favorite-albums.pages.dev
```

**ユーザーがアクセスするURL**:
- このURLがユーザーがブラウザでアクセスするフロントエンドのURLです
- このURLから、バックエンド（`https://albums.albums.workers.dev/api`）にAPIリクエストが送信されます
- ユーザーはフロントエンドのURLのみを知っていればよく、バックエンドのURLは直接見えません（開発者ツールで確認は可能ですが、通常のユーザーは見ません）

## 5. CORS設定の確認

フロントエンドのURLが確定したら、バックエンドのCORS設定を更新:

1. `src/index.ts` の `defaultAllowedOrigins` にフロントエンドのURLを追加
2. バックエンドを再デプロイ:
   ```bash
   npm run deploy:backend
   ```

または、`wrangler.toml` の `vars` セクションで環境変数として設定することも可能です。

## 6. 動作確認

### 6.1 バックエンドの確認

```bash
# ヘルスチェック
curl https://my-favorite-albums.your-subdomain.workers.dev/

# 期待されるレスポンス:
# {"message":"MyFavoriteAlbums API","version":"1.0.0","status":"ok"}
```

### 6.2 フロントエンドの確認

ブラウザでフロントエンドのURLにアクセス:
```
https://my-favorite-albums-frontend.pages.dev
```

以下を確認:
- [ ] ページが正常に表示される
- [ ] アルバム検索が動作する
- [ ] 投稿作成が動作する
- [ ] 投稿一覧が表示される
- [ ] 投稿詳細が表示される

## 7. カスタムドメインの設定（オプション）

### 7.0 カスタムドメインの費用について

**重要**: カスタムドメインを使用する場合の費用について

- **Cloudflare Pages/Workersでのカスタムドメイン使用**: **無料**（無料プランでも利用可能）
- **ドメインの取得費用**: **別途必要**（ドメインを新規取得する場合）
  - 例: `.com` ドメインは年間約1,000〜2,000円程度（ドメイン登録サービスによる）
  - Cloudflare Registrarで取得する場合も同様に年間費用がかかります
  - 既に所有しているドメインを使用する場合は追加費用なし

**結論**: 
- カスタムドメインを**使用する**こと自体は無料
- ドメインを**新規取得**する場合は別途費用が必要
- 既存のドメインを使用する場合は追加費用なし

**維持費0円を目指す場合**: カスタムドメインは必須ではありません。デフォルトの `*.pages.dev` と `*.workers.dev` のURLで十分に動作します。

### 7.1 Cloudflare Pagesでカスタムドメインを設定

1. Cloudflare Pagesのプロジェクト設定で「Custom domains」を選択
2. カスタムドメインを追加
3. DNS設定を確認（自動で設定される場合があります）

**注意**: ドメインがCloudflareで管理されている必要があります。他のドメイン登録サービスで取得したドメインも、CloudflareのDNSを使用するように設定すれば利用可能です。

### 7.2 Cloudflare Workersでカスタムドメインを設定

Workersでもカスタムドメインを使用できます:

1. [Cloudflare Dashboard](https://dash.cloudflare.com/) にアクセス
2. 「Workers & Pages」→ 対象のWorkerを選択
3. 「Settings」→「Triggers」→「Custom Domains」を選択
4. 「Add Custom Domain」をクリック
5. カスタムドメインを入力（例: `api.yourdomain.com`）
6. DNS設定を確認（自動で設定される場合があります）

**メリット**:
- `*.workers.dev`のURLではなく、カスタムドメインでアクセス可能
- よりプロフェッショナルなURL
- ドメインを変更してもWorkerのURLを変更する必要がない

### 7.3 バックエンドのCORS設定を更新

カスタムドメインを追加したら、`src/index.ts` の `defaultAllowedOrigins` に追加して再デプロイしてください。

## 8. トラブルシューティング

### 8.1 デプロイエラー

**エラー**: `Error: No D1 databases configured`

**解決方法**: `wrangler.toml` の `database_id` が正しく設定されているか確認してください。

**エラー**: `Error: Missing required secret: SPOTIFY_CLIENT_ID`

**解決方法**: 環境変数が正しく設定されているか確認:
```bash
npx wrangler secret list
```

### 8.2 CORSエラー

**エラー**: `Access to fetch at '...' from origin '...' has been blocked by CORS policy`

**解決方法**: 
1. フロントエンドのURLが `src/index.ts` の `defaultAllowedOrigins` に含まれているか確認
2. バックエンドを再デプロイ

### 8.3 データベースエラー

**エラー**: `Error: Database not found`

**解決方法**: 
1. D1データベースが正しく作成されているか確認
2. `wrangler.toml` の設定を確認
3. マイグレーションが適用されているか確認:
   ```bash
   npm run db:check
   ```

### 8.4 フロントエンドがAPIに接続できない

**エラー**: `Failed to fetch`

**解決方法**:
1. Cloudflare Pagesの環境変数 `VITE_API_BASE_URL` が正しく設定されているか確認
2. バックエンドのURLが正しいか確認
3. ブラウザの開発者ツールでネットワークエラーを確認

## 9. デプロイ後のメンテナンス

### 9.1 データベースマイグレーション

新しいマイグレーションを追加した場合:

```bash
# マイグレーションファイルを生成
npm run db:generate

# 本番環境に適用
npm run db:migrate
```

### 9.2 環境変数の更新

```bash
# シークレットを更新
npx wrangler secret put SPOTIFY_CLIENT_ID
npx wrangler secret put SPOTIFY_CLIENT_SECRET
```

### 9.3 ログの確認

```bash
# Workersのログを確認
npx wrangler tail

# リアルタイムでログを監視
npx wrangler tail --format pretty
```

## 10. コスト

### 無料プランの制限

- **Cloudflare Workers**: 
  - リクエスト数: 100,000リクエスト/日
  - CPU時間: 10ms/リクエスト（無料プラン）
  
- **Cloudflare Pages**:
  - ビルド数: 500ビルド/月
  - 帯域幅: 無制限（無料プラン）

- **Cloudflare D1**:
  - 読み取り: 5,000,000行/月
  - 書き込み: 100,000行/月
  - ストレージ: 5GB

個人開発や小規模なサービスでは、これらの制限内で十分に運用可能です。

### 費用の内訳

**維持費0円で運用可能な構成**:

| サービス | 費用 | 備考 |
|---------|------|------|
| Cloudflare Workers | **無料** | 無料プランで十分 |
| Cloudflare Pages | **無料** | 無料プランで十分 |
| Cloudflare D1 | **無料** | 無料プランで十分 |
| カスタムドメイン使用 | **無料** | Cloudflareで使用する場合 |
| ドメイン取得 | **別途必要** | 新規取得する場合のみ（年間約1,000〜2,000円） |

**結論**: 
- デフォルトURL（`*.pages.dev`、`*.workers.dev`）を使用する場合: **維持費0円**
- カスタムドメインを使用する場合（既存ドメイン）: **維持費0円**
- カスタムドメインを新規取得する場合: **ドメイン取得費用のみ**（年間約1,000〜2,000円）

**推奨**: まずはデフォルトURLで運用を開始し、必要に応じてカスタムドメインを追加することをおすすめします。

## 参考リンク

- [Cloudflare Workers ドキュメント](https://developers.cloudflare.com/workers/)
- [Cloudflare Pages ドキュメント](https://developers.cloudflare.com/pages/)
- [Cloudflare D1 ドキュメント](https://developers.cloudflare.com/d1/)
- [Wrangler CLI ドキュメント](https://developers.cloudflare.com/workers/wrangler/)
