import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, Plus, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Header } from '@/components/Header';
import { getPosts, getVibeCardUrl } from '@/lib/api';

interface Post {
  id: string;
  userId: string;
  title: string | null;
  hashtag: string;
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
      <div className="container mx-auto px-4 py-4 sm:py-6 max-w-7xl">
        {/* ヘッダー */}
        <Header
          title="投稿一覧"
          subtitle="みんなの好きな9枚のアルバム"
        />
        
        {/* 作成ボタン - AOTY風の配置 */}
        <div className="flex justify-center mb-8 sm:mb-12">
          <Button
            onClick={() => navigate('/')}
            size="lg"
            className="bg-primary hover:bg-primary/90 text-white px-8 py-3 font-semibold transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 rounded-lg"
          >
            <Plus className="h-5 w-5 mr-2" />
            新しい投稿を作成
          </Button>
        </div>

        {/* 投稿一覧 - AOTY風のモダンなグリッド */}
        {posts.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground mb-6 text-lg">まだ投稿がありません</p>
            <Button
              onClick={() => navigate('/')}
              variant="outline"
              className="rounded-lg px-6 py-2.5 hover:bg-accent transition-colors"
            >
              最初の投稿を作成する
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
              {posts.map((post, index) => (
                <Link
                  key={post.id}
                  to={`/posts/${post.id}`}
                  className="block group"
                  style={{
                    animation: `fadeInUp 0.5s ease-out ${index * 0.05}s both`,
                  }}
                >
                  <Card className="h-full overflow-hidden bg-card border border-border/50 rounded-lg transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10 hover:border-primary/30 hover:-translate-y-1 cursor-pointer">
                    <CardContent className="p-0">
                      {/* Vibe Card画像 - AOTY風のアスペクト比 */}
                      <div className="aspect-square w-full bg-muted relative overflow-hidden">
                        <img
                          src={getVibeCardUrl(post.id)}
                          alt={post.hashtag || post.title || '無題の投稿'}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                        {/* ホバー時のオーバーレイ */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                      </div>
                      
                      {/* 投稿情報 - AOTY風のコンパクトなレイアウト */}
                      <div className="p-4 sm:p-5 space-y-2 text-center sm:text-left">
                        {post.hashtag || post.title ? (
                          <h3 className="font-bold text-base sm:text-lg leading-tight line-clamp-2 text-foreground group-hover:text-primary transition-colors duration-200">
                            {post.hashtag || post.title}
                          </h3>
                        ) : (
                          <h3 className="font-bold text-base sm:text-lg text-muted-foreground">
                            無題の投稿
                          </h3>
                        )}
                        <div className="flex items-center justify-center sm:justify-start gap-2 text-xs sm:text-sm text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          <time>
                            {new Date(post.createdAt).toLocaleDateString('ja-JP', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </time>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
            
            {/* もっと見るボタン - AOTY風のスタイル */}
            {hasMore && (
              <div className="mt-12 sm:mt-16 text-center">
                <Button
                  onClick={loadMore}
                  disabled={loadingMore}
                  variant="outline"
                  size="lg"
                  className="rounded-lg px-8 py-3 font-semibold border-2 hover:bg-accent hover:border-primary/50 transition-all duration-200"
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

