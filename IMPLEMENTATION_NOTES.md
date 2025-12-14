# 画像生成機能実装ノート

## 実装完了内容

### ✅ 実装済み

1. **satori + @resvg/resvg-wasm の導入**
   - `@vercel/og`の代わりに、`satori`と`@resvg/resvg-wasm`を直接使用
   - Cloudflare Workers対応の画像生成機能を実装

2. **日本語フォント対応**
   - Google FontsからNoto Sans JPを動的に読み込み
   - 日本語テキストの表示に対応

3. **画像生成ロジック**
   - 3x3グリッドで9枚のアルバムを表示
   - アルバムジャケット画像をBase64に変換して埋め込み
   - カスタマイズ可能なタイトル・ユーザー名・色設定

4. **エラーハンドリング**
   - PNG変換に失敗した場合、SVGを直接返すフォールバック機能

### ⚠️ 既知の問題

**WASMコンパイルエラー（ローカル環境）**

ローカル開発環境（`wrangler dev --local`）で以下のエラーが発生する可能性があります：

```
WARNING: failed to asynchronously prepare wasm: CompileError: WebAssembly.instantiate(): Wasm code generation disallowed by embedder
```

**原因:**
- `satori`が内部で使用している`yoga-layout`のWASMモジュールが、ローカル環境で正しく動作していない

**対処法:**
1. **SVGフォールバック**: PNG変換に失敗した場合、SVGを直接返却（実装済み）
2. **本番環境での確認**: 本番環境（Cloudflare Workers）では動作する可能性が高い
3. **代替実装の検討**: 必要に応じて、別のアプローチを検討

### 📦 インストール済みパッケージ

```json
{
  "satori": "^0.18.3",
  "@resvg/resvg-wasm": "^2.6.2"
}
```

### 🔧 実装ファイル

- `src/utils/vibe-card.tsx` - 画像生成ロジック
- `src/index.ts` - APIエンドポイント（画像生成機能を有効化）

### 🚀 使用方法

#### テスト用エンドポイント

```bash
curl http://localhost:8787/api/vibe-card/test -o test-image.png
```

#### 投稿IDから画像生成

```bash
curl "http://localhost:8787/api/vibe-card?postId=xxx" -o vibe-card.png
```

### 📝 次のステップ

1. **本番環境での動作確認**
   - Cloudflare Workersにデプロイして、WASMモジュールが正常に動作するか確認

2. **パフォーマンス最適化**
   - フォントのキャッシュ
   - 画像のキャッシュ
   - 生成時間の最適化

3. **エラーハンドリングの強化**
   - より詳細なエラーメッセージ
   - リトライ機能

4. **代替実装の検討（必要に応じて）**
   - Cloudflare Pages Functionsを使用
   - 外部画像生成APIの利用
   - Canvas APIの代替実装

### 🔍 トラブルシューティング

#### WASMエラーが発生する場合

1. **SVGフォールバックを確認**
   - レスポンスのContent-Typeが`image/svg+xml`になっているか確認

2. **本番環境でテスト**
   - ローカル環境では動作しないが、本番環境では動作する可能性がある

3. **パッケージのバージョン確認**
   ```bash
   npm list satori @resvg/resvg-wasm
   ```

#### 画像が生成されない場合

1. **フォントの読み込み確認**
   - Google Fontsへのアクセスが可能か確認
   - ネットワークエラーがないか確認

2. **アルバム画像のURL確認**
   - 画像URLが有効か確認
   - CORSエラーがないか確認

3. **ログの確認**
   - Cloudflare Workersのログを確認
   - エラーメッセージを確認

