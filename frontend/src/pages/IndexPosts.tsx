import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Header } from '@/components/Header';
import { getPosts, getVibeCardUrl } from '@/lib/api';

interface Post {
  id: string;
  userId: string;
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export function IndexPosts() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const POSTS_PER_PAGE = 18; // 1ページあたりの投稿数

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getPosts(POSTS_PER_PAGE, 0);
        setPosts(data.posts);
        setOffset(POSTS_PER_PAGE);
        setHasMore(data.posts.length === POSTS_PER_PAGE);
      } catch (err) {
        console.error('投稿一覧取得エラー:', err);
        setError(err instanceof Error ? err.message : '投稿の取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;

    try {
      setLoadingMore(true);
      const data = await getPosts(POSTS_PER_PAGE, offset);
      if (data.posts.length === 0) {
        setHasMore(false);
      } else {
        setPosts((prev) => [...prev, ...data.posts]);
        setOffset((prev) => prev + POSTS_PER_PAGE);
        setHasMore(data.posts.length === POSTS_PER_PAGE);
      }
    } catch (err) {
      console.error('追加投稿取得エラー:', err);
      setError(err instanceof Error ? err.message : '投稿の取得に失敗しました');
    } finally {
      setLoadingMore(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={() => navigate('/')} variant="outline">
            作成画面に戻る
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-4xl">
        {/* ヘッダー */}
        <Header
          title="投稿一覧"
          subtitle="みんなの好きな9枚のアルバム"
        />
        <div className="flex justify-center mb-6 sm:mb-8">
          <Button
            onClick={() => navigate('/')}
            size="lg"
            className="bg-primary hover:bg-primary/90 text-white px-6 py-2.5 font-bold transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            新しい投稿を作成
          </Button>
        </div>

        {/* 投稿一覧 */}
        {posts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">まだ投稿がありません</p>
            <Button
              onClick={() => navigate('/')}
              variant="outline"
              className="rounded-full"
            >
              最初の投稿を作成する
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {posts.map((post) => (
                <Link
                  key={post.id}
                  to={`/posts/${post.id}`}
                  className="block"
                >
                  <Card className="card-shadow cursor-pointer h-full overflow-hidden group bg-card">
                    <CardContent className="p-0">
                      {/* Vibe Card画像: フラット、角丸なし */}
                      <div className="aspect-square w-full bg-muted relative overflow-hidden">
                        <img
                          src={getVibeCardUrl(post.id)}
                          alt={post.title || '無題の投稿'}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      {/* 投稿情報: AOTY風のコンパクトなレイアウト */}
                      <div className="p-3 space-y-1">
                        {post.title ? (
                          <h3 className="font-bold text-sm leading-tight line-clamp-2 text-foreground">
                            {post.title}
                          </h3>
                        ) : (
                          <h3 className="font-bold text-sm text-muted-foreground">
                            無題の投稿
                          </h3>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {new Date(post.createdAt).toLocaleDateString('ja-JP', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
            {/* もっと見るボタン */}
            {hasMore && (
              <div className="mt-8 text-center">
                <Button
                  onClick={loadMore}
                  disabled={loadingMore}
                  variant="outline"
                  size="lg"
                  className="rounded-full"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      読み込み中...
                    </>
                  ) : (
                    'もっと見る'
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

