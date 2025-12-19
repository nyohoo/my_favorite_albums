# テストデータ作成スクリプト

## create-test-post.sh

参考投稿（`post_1765907847954_9qa5cv7`）のデータを基に、テスト投稿を作成するスクリプトです。

### 使用方法

```bash
# 基本的な使用（デフォルト設定）
./scripts/create-test-post.sh

# ユーザー名を指定
./scripts/create-test-post.sh "ユーザー名"

# ユーザー名とタイトルを指定
./scripts/create-test-post.sh "ユーザー名" "投稿タイトル"

# 複数の投稿を一度に作成
./scripts/create-test-post.sh "ユーザー名" "投稿タイトル" 5

# ユーザー名なしで投稿
./scripts/create-test-post.sh "" "投稿タイトル"
```

### パラメータ

1. **USER_NAME** (オプション): ユーザー名。空文字列または未指定で匿名投稿
2. **TITLE** (オプション): 投稿タイトル。未指定時は自動生成
3. **POST_COUNT** (オプション): 作成する投稿数。デフォルトは1

### 環境変数

- `API_BASE_URL`: APIのベースURL（デフォルト: `http://localhost:8788/api`）

### 例

```bash
# 1件のテスト投稿を作成
./scripts/create-test-post.sh "テストユーザー" "2025年のお気に入り"

# 10件のテスト投稿を一括作成（ページネーションテスト用）
./scripts/create-test-post.sh "テストユーザー" "テスト投稿" 10
```

### 注意事項

- バックエンドサーバー（`npm run dev`）が起動している必要があります
- 同じアルバムデータを使用して複数の投稿を作成します
- 複数作成時は、投稿間で0.5秒の待機時間があります
