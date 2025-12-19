#!/bin/bash

# テストデータ作成用シェルスクリプト
# 参考: http://localhost:5173/posts/post_1765907847954_9qa5cv7

set -e

API_BASE_URL="${API_BASE_URL:-http://localhost:8788/api}"

# 参考投稿から取得したアルバムデータ
# フォーマット: spotifyId|name|artist|imageUrl|releaseDate|spotifyUrl|artistId
ALBUMS_DATA=(
  "3MATDdrpHmQCmuOcozZjDa|TESTING|A\$AP Rocky|https://i.scdn.co/image/ab67616d0000b273bfcb8d00cee4f8257a6b7fe1|2018-05-25|https://open.spotify.com/album/3MATDdrpHmQCmuOcozZjDa|13ubrt8QOOCPljQ2FL1Kca"
  "1HQ0NnMTN1btuwBbstnoYm|Test Driving Toothless (from How to Train Your Dragon)|John Powell|https://i.scdn.co/image/ab67616d0000b273db42df198144518240bfa7b4|2025-05-27|https://open.spotify.com/album/1HQ0NnMTN1btuwBbstnoYm|null"
  "5h0KYWMZIg8xT6eRGYkNMh|Because the Internet|Childish Gambino|https://i.scdn.co/image/ab67616d0000b27321b2b485aef32bcc96c1875c|2013-12-10|https://open.spotify.com/album/5h0KYWMZIg8xT6eRGYkNMh|73sIBHcqh3Z3NyqHKZ7FOL"
  "5ieP11rJQvuYz0Ov3k03cy|Sea Change|Beck|https://i.scdn.co/image/ab67616d0000b273e7fc5b50ff71f92809db9d79|2002-01-01|https://open.spotify.com/album/5ieP11rJQvuYz0Ov3k03cy|3vbKDsSS70ZX9D2OcvbZmS"
  "26ZgfJUzodn8bwZNmY6xhu|LOST AND FOUND|ROTH BART BARON|https://i.scdn.co/image/ab67616d0000b27327d5dc079e0f8108373f1968|2025-11-05|https://open.spotify.com/album/26ZgfJUzodn8bwZNmY6xhu|3WwL2Gya2VH0zHzOdakOX2"
  "1DMMv1Kmoli3Y9fVEZDUVC|Ágætis byrjun|Sigur Rós|https://i.scdn.co/image/ab67616d0000b2730437f55af98eab3a385f5ce0|1999-06-12|https://open.spotify.com/album/1DMMv1Kmoli3Y9fVEZDUVC|6UUrUCIZtQeOf8tC0WuzRy"
  "4X0bhkSBOfcnOPyfG5Ef6a|I Had The Blues But I Shook Them Loose|Bombay Bicycle Club|https://i.scdn.co/image/ab67616d0000b273bb076ef98d5f02467a3be611|2009-01-01|https://open.spotify.com/album/4X0bhkSBOfcnOPyfG5Ef6a|3pTE9iaJTkWns3mxpNQlJV"
  "5sY6UIQ32GqwMLAfSNEaXb|Circles|Mac Miller|https://i.scdn.co/image/ab67616d0000b27326b7dd89810cc1a40ada642c|2020-01-17|https://open.spotify.com/album/5sY6UIQ32GqwMLAfSNEaXb|4LLpKhyESsyAXpc4laK94U"
  "3KuXEGcqLcnEYWnn3OEGy0|The 2nd Law|Muse|https://i.scdn.co/image/ab67616d0000b273fc192c54d1823a04ffb6c8c9|2012-09-24|https://open.spotify.com/album/3KuXEGcqLcnEYWnn3OEGy0|12Chz98pHFMPJEknJQMWvI"
)

# パラメータ
USER_NAME="${1:-}"
TITLE="${2:-テスト投稿 $(date +%Y-%m-%d\ %H:%M:%S)}"
POST_COUNT="${3:-1}"

echo "=== テスト投稿作成スクリプト ==="
echo "API Base URL: $API_BASE_URL"
echo "ユーザー名: ${USER_NAME:-（未指定）}"
echo "タイトル: $TITLE"
echo "作成数: $POST_COUNT"
echo ""

# アルバムデータをJSON配列に変換
albums_json="["
for i in "${!ALBUMS_DATA[@]}"; do
  IFS='|' read -r spotify_id name artist image_url release_date spotify_url artist_id <<< "${ALBUMS_DATA[$i]}"
  
  if [ $i -gt 0 ]; then
    albums_json+=","
  fi
  
  albums_json+="{"
  albums_json+="\"spotifyId\":\"$spotify_id\","
  albums_json+="\"name\":\"$name\","
  albums_json+="\"artist\":\"$artist\","
  albums_json+="\"imageUrl\":\"$image_url\""
  
  if [ "$release_date" != "null" ] && [ -n "$release_date" ]; then
    albums_json+=",\"releaseDate\":\"$release_date\""
  fi
  
  if [ "$spotify_url" != "null" ] && [ -n "$spotify_url" ]; then
    albums_json+=",\"spotifyUrl\":\"$spotify_url\""
  fi
  
  albums_json+="}"
done
albums_json+="]"

# 投稿作成
for i in $(seq 1 $POST_COUNT); do
  if [ $POST_COUNT -gt 1 ]; then
    current_title="${TITLE} #$i"
  else
    current_title="$TITLE"
  fi
  
  # JSONペイロード作成
  payload="{"
  if [ -n "$USER_NAME" ]; then
    payload+="\"userName\":\"$USER_NAME\","
  fi
  payload+="\"title\":\"$current_title\","
  payload+="\"albums\":$albums_json"
  payload+="}"
  
  echo "[$i/$POST_COUNT] 投稿作成中..."
  
  response=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE_URL/posts" \
    -H "Content-Type: application/json" \
    -d "$payload")
  
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')
  
  if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
    post_id=$(echo "$body" | jq -r '.id // empty')
    if [ -n "$post_id" ]; then
      echo "✅ 投稿作成成功: $post_id"
      echo "   詳細: http://localhost:5173/posts/$post_id"
    else
      echo "✅ 投稿作成成功（ID取得失敗）"
      echo "$body" | jq '.'
    fi
  else
    echo "❌ 投稿作成失敗 (HTTP $http_code)"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
    exit 1
  fi
  
  echo ""
  
  # 複数作成時は少し待機
  if [ $POST_COUNT -gt 1 ] && [ $i -lt $POST_COUNT ]; then
    sleep 0.5
  fi
done

echo "=== 完了 ==="

