# MyFavoriteAlbums

## ■サービス概要  
好きな音楽のアルバムを  
「#私を構成する9枚」という共通のフォーマットを介して  
簡単にシェアすることが可能なサービスです  

## ■新生プロジェクトの特徴

### 技術スタック
- **Runtime:** Cloudflare Workers (TypeScript)
- **Framework:** Hono (軽量・高速でエッジに最適)
- **Database:** Cloudflare D1 (SQLite)
- **ORM:** Drizzle ORM
- **Image Gen:** @vercel/og (SatoriベースでJSXから画像を生成)

### 目標
1. **維持費0円** - 個人開発として持続可能な構成
2. **新しい拡散モデル** - 高品質なVibe Card画像の生成・ダウンロード機能
3. **エッジコンピューティング** - RailsからCloudflareへ完全移行

## ■メインのターゲットユーザー  
・音楽好きなツイッタラー  
・自分の知らない音楽を探したい人  
・他の人に自分の音楽の趣味趣向を知って欲しい人  

## ■ユーザーの抱える課題  
・「#私を構成する9枚」というハッシュタグで自分の好きな音楽を  
　　共有する文化がTwitterで定着しているが、  
　　現状では、9枚のジャケットをGoogleなどで検索・保存し、それらをまとめた画像を  
　　ユーザー自身が作成する必要があり、投稿するまでのハードルが高い。    

  ・他の人が共有してくれた音楽の詳細情報を入手することが困難。  
  ・ツイッターの投稿のみだと時間の経過と共に流れてしまい、  
　気になったユーザーがいた際に過去の投稿を辿ることが困難。  

## ■解決方法  
  SpotifyAPIを利用し、アルバム名やアーティスト名をサービス上で検索・選択するだけで、  
  9枚のジャケット写真を一つにまとめた画像が簡単に作成できるようにし、  
  手軽に共有できる仕組みを作成する。  
  また、ユーザー登録機能を実装し、過去の投稿を簡単に辿れるようにする。  

## ■実装予定の機能  
  ●ユーザー（ログインなし）  
  ・投稿の一覧、詳細  
  ・投稿一覧画面には、9枚のジャケットをまとめた画像とユーザー名を表示する  
  ・投稿詳細画面には、9枚のアルバムそれぞれのアルバム名・アーティスト名・ジャンル名・リリース年の情報を表示  
  ・また、9枚のアルバムそれぞれにSpotifyで再生できるリンクを表示  
  
  ・ユーザーの詳細画面にて投稿一覧を閲覧可能  
  ●ユーザー（ログインあり）  
  ・投稿の新規作成、検索、一覧、詳細  
  ・新規作成では、アルバムをアーティスト名・アルバム名から検索可能  
  ・9枚のアルバムを選択すると、1つの画像にまとめてサービス上に投稿することが可能  
  ・投稿した内容をツイッターに連携しシェアできる  

  ●MVPリリース後  
  ・「＃私を構成する9枚」以外のハッシュタグで投稿可能にする  
  ・投稿一覧画面に検索機能の実施  
  ・アルバム名で検索すると、該当アルバムを含んだ投稿を表示
  ・投稿一覧画面でハッシュタグごとに絞り込めるようにする

## ■開発コマンド

### セットアップ
```bash
npm install
```

### ローカル開発
```bash
npm run dev
```

### デプロイ
```bash
npm run deploy
```

### データベース操作
```bash
# マイグレーションファイルの生成
npm run db:generate

# マイグレーションの適用
npm run db:migrate

# Drizzle Studio（DB管理UI）の起動
npm run db:studio
```

## ■APIエンドポイント

### 画像生成
- `GET /api/vibe-card?postId=xxx` - 投稿IDからVibe Card画像を生成
- `GET /api/vibe-card/test` - テスト用（モックデータで画像生成）

### 投稿
- `GET /api/posts` - 投稿一覧取得
- `GET /api/posts/:id` - 投稿詳細取得（アルバム情報含む）

### Spotify API連携
- `GET /api/search?q=検索クエリ` - Spotify APIでアルバム検索

## ■プロジェクト構造

```
MyFavoriteAlbums/
├── src/
│   ├── index.ts          # メインエントリーポイント（APIルート定義）
│   ├── db/
│   │   ├── index.ts      # DB接続設定
│   │   └── schema.ts     # Drizzleスキーマ定義
│   ├── services/
│   │   └── spotify.ts    # Spotify API連携サービス
│   ├── types/
│   │   └── env.d.ts      # 環境変数の型定義
│   └── utils/
│       └── vibe-card.tsx # Vibe Card画像生成ロジック
├── migrations/            # マイグレーションファイル
├── wrangler.toml         # Cloudflare Workers設定
├── drizzle.config.ts     # Drizzle設定
└── package.json
```

## ■実装済み機能

✅ **プロジェクト初期化**
- Wrangler + Hono + TypeScript のセットアップ
- Cloudflare D1 データベース設定
- Drizzle ORM の設定
- マイグレーションファイル生成

✅ **基本的なAPIエンドポイント**
- ヘルスチェック (`GET /`)
- 投稿一覧取得 (`GET /api/posts`)
- 投稿詳細取得 (`GET /api/posts/:id`)

✅ **画像生成機能（Vibe Card）**
- `satori` + `@resvg/resvg-wasm`を使用した画像生成
- Cloudflare Workers対応
- 日本語フォント（Noto Sans JP）対応
- SVGフォールバック機能実装

✅ **Spotify API連携**
- Client Credentials Flowによるアクセストークン取得
- アルバム検索機能 (`GET /api/search`)
- DBのalbumsテーブル形式に整形したレスポンス

## ■環境変数の設定

### Spotify API認証情報の設定

1. [Spotify for Developers](https://developer.spotify.com/dashboard) でアプリを作成
2. `Client ID` と `Client Secret` を取得
3. ローカル開発環境では、`.dev.vars`ファイルを作成（`.gitignore`に含まれています）:

```bash
SPOTIFY_CLIENT_ID=your-client-id
SPOTIFY_CLIENT_SECRET=your-client-secret
```

4. 本番環境では、Wrangler CLIでシークレットを設定:

```bash
npx wrangler secret put SPOTIFY_CLIENT_ID
npx wrangler secret put SPOTIFY_CLIENT_SECRET
```

## ■次のステップ

- [x] Spotify API連携（アルバム検索・取得）✅
- [ ] ユーザー認証機能
- [ ] 投稿作成・編集・削除機能
- [ ] フロントエンド実装
- [ ] 画像ダウンロード機能の最適化
