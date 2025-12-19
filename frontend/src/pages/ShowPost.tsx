import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, Share2, Download, Calendar, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AlbumGrid, type Album } from '@/components/AlbumGrid';
import { SpotifyPlayer } from '@/components/SpotifyPlayer';
import { Header } from '@/components/Header';
import { getPost, getVibeCardUrl } from '@/lib/api';

// リリース日を英語形式でフォーマットする関数
const formatReleaseDate = (dateString: string): string => {
  try {
    // Spotify APIの日付形式に対応（YYYY-MM-DD, YYYY-MM, YYYY）
    const parts = dateString.split('-');
    if (parts.length === 3) {
      // YYYY-MM-DD形式
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      }
    } else if (parts.length === 2) {
      // YYYY-MM形式
      const date = new Date(dateString + '-01');
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
        });
      }
    } else if (parts.length === 1) {
      // YYYY形式
      return dateString;
    }
    // フォーマットできない場合はそのまま返す
    return dateString;
  } catch {
    return dateString;
  }
};

export function ShowPost() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [post, setPost] = useState<{
    id: string;
    userId: string;
    title: string | null;
    userName: string | null;
    createdAt: Date;
    updatedAt: Date;
  } | null>(null);
  const [albums, setAlbums] = useState<(Album | null)[]>(Array(9).fill(null));
  const [playerOpen, setPlayerOpen] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [selectedArtistId, setSelectedArtistId] = useState<string | null>(null);
  const [playerType, setPlayerType] = useState<'album' | 'artist'>('album');

  const handleAlbumClick = (album: Album) => {
    console.log('handleAlbumClick called with album:', album);
    console.log('album.spotifyId:', album.spotifyId);
    if (!album.spotifyId) {
      console.error('handleAlbumClick: album.spotifyId is missing!', album);
      return;
    }
    setSelectedAlbum(album);
    setSelectedArtistId(null);
    setPlayerType('album');
    setPlayerOpen(true);
  };

  const handleArtistClick = (album: Album) => {
    if (album.artistId) {
      setSelectedAlbum(null);
      setSelectedArtistId(album.artistId);
      setPlayerType('artist');
      setPlayerOpen(true);
    } else {
      // アーティストIDがない場合はアルバムプレーヤーを開く
      console.warn('アーティストIDが取得できませんでした。アルバムプレーヤーを開きます。');
      handleAlbumClick(album);
    }
  };

  // 画像生成処理を共通関数として抽出（SVG→PNG変換）
  const generatePngImage = async (postId: string, title: string | null): Promise<File> => {
    const imageUrl = getVibeCardUrl(postId);
    
    // SVGをfetchで取得
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error('画像の取得に失敗しました');
    }

    const svgText = await response.text();
    
    // SVGをImageオブジェクトに読み込む
    const img = new Image();
    const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    
    await new Promise<void>((resolve, reject) => {
      img.onload = () => {
        URL.revokeObjectURL(svgUrl);
        resolve();
      };
      img.onerror = () => {
        URL.revokeObjectURL(svgUrl);
        reject(new Error('SVGの読み込みに失敗しました'));
      };
      img.src = svgUrl;
    });

    // Canvasに描画してPNGに変換（高解像度化）
    // 元のサイズの2倍で描画して高画質を維持
    const scale = 2; // 2倍の解像度
    const canvas = document.createElement('canvas');
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;
    const ctx = canvas.getContext('2d', { 
      alpha: false, // 透明度を無効化してパフォーマンス向上
      willReadFrequently: false 
    });
    
    if (!ctx) {
      throw new Error('Canvasの初期化に失敗しました');
    }

    // 高品質な画像スケーリング設定
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // 背景色を描画（SVGが透明背景の場合に備えて）
    ctx.fillStyle = '#1a1a1a'; // ダークテーマの背景色
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // SVG画像を2倍サイズで描画
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    
    // PNGとしてBlobに変換（可逆圧縮で画質劣化なし）
    const pngBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('PNG変換に失敗しました'));
          } else {
            resolve(blob);
          }
        },
        'image/png' // PNG形式（可逆圧縮）
      );
    });

    // Fileオブジェクトに変換
    const fileName = `${title || 'my-favorite-albums'}-${postId}.png`;
    return new File([pngBlob], fileName, { type: 'image/png' });
  };

  useEffect(() => {
    if (!id) {
      setError('投稿IDが指定されていません');
      setLoading(false);
      return;
    }

    const fetchPost = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // 投稿データと画像の読み込みを並列実行
        const [data] = await Promise.all([
          getPost(id),
          // 画像をプリロード（バックグラウンドで読み込み開始）
          new Promise<void>((resolve) => {
            const img = new Image();
            img.src = getVibeCardUrl(id);
            img.onload = () => resolve();
            img.onerror = () => resolve(); // エラーでも続行
          }),
        ]);
        
        setPost(data.post);
        
        // APIから取得したアルバムデータをAlbum型に変換
        // APIは既にposition順にソートして返しているので、その順序を使用
        const formattedAlbums: Album[] = data.albums.map((album) => {
          console.log('Formatting album:', { 
            spotifyId: album.spotifyId, 
            name: album.name,
            rawAlbum: album 
          });
          return {
            spotifyId: album.spotifyId,
            name: album.name,
            artist: album.artist,
            artistId: album.artistId || undefined,
            imageUrl: album.imageUrl,
            releaseDate: album.releaseDate || undefined,
            spotifyUrl: album.spotifyUrl || undefined,
          };
        });
        
        // 9個のスロットに配置（APIがposition順にソート済みなので、その順序を使用）
        const albumsWithPositions: (Album | null)[] = Array(9).fill(null);
        formattedAlbums.forEach((album, index) => {
          if (index < 9) {
            albumsWithPositions[index] = album;
          }
        });
        
        setAlbums(albumsWithPositions);
      } catch (err) {
        console.error('投稿取得エラー:', err);
        setError(err instanceof Error ? err.message : '投稿の取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [id]);

  const handleShare = async () => {
    if (!id) return;

    try {
      // 画像生成を試みる（失敗してもテキスト+URLはシェア可能）
      let imageFile: File | null = null;
      try {
        imageFile = await generatePngImage(id, post?.title || null);
      } catch (imageError) {
        console.warn('画像生成に失敗しましたが、テキスト+URLのみでシェアします:', imageError);
      }

      // Web Share APIが使える場合
      if (navigator.share) {
        const shareData: ShareData = {
          title: post?.title || 'MyFavoriteAlbums',
          text: `${post?.title || '私を構成する9枚'} - MyFavoriteAlbums`,
          url: window.location.href,
        };

        // 画像が生成できた場合、filesに追加
        if (imageFile && navigator.canShare) {
          if (navigator.canShare({ ...shareData, files: [imageFile] })) {
            shareData.files = [imageFile];
          }
        }

        try {
          await navigator.share(shareData);
          return; // シェア成功で終了
        } catch (shareError) {
          // ユーザーがキャンセルした場合はエラーを無視
          if ((shareError as Error).name === 'AbortError') {
            return;
          }
          console.error('シェアエラー:', shareError);
          // フォールバック処理に進む
        }
      }

      // PCの場合：Twitter Intent URLを開く（画像は含められないため、別途ダウンロード）
      const shareText = `${post?.title || '私を構成する9枚'} - MyFavoriteAlbums\n${window.location.href}`;
      const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
      
      // 画像が生成できた場合は自動ダウンロード
      if (imageFile) {
        const blobUrl = URL.createObjectURL(imageFile);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = imageFile.name;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
        
        // Twitter Intent URLを開く（新しいタブで）
        window.open(twitterUrl, '_blank');
        
        // ユーザーに案内
        setTimeout(() => {
          alert('画像をダウンロードしました。\nTwitterの投稿画面で画像を添付してください。');
        }, 500);
      } else {
        // 画像生成に失敗した場合はTwitter Intent URLのみ開く
        window.open(twitterUrl, '_blank');
      }
    } catch (error) {
      console.error('シェア処理エラー:', error);
      alert('シェアに失敗しました');
    }
  };

  const handleDownload = async () => {
    if (!id) return;

    try {
      // 共通関数を使用してPNG画像を生成
      const imageFile = await generatePngImage(id, post?.title || null);
      const pngBlob = await imageFile.arrayBuffer().then(buffer => new Blob([buffer], { type: 'image/png' }));

      // スマホの場合：Web Share APIを使用（OSのシェア機能を利用）
      if (navigator.share && navigator.canShare) {
        // Web Share APIでシェア可能かチェック
        if (navigator.canShare({ files: [imageFile] })) {
          try {
            await navigator.share({
              title: post?.title || 'My Favorite Albums',
              text: `${post?.title || '私を構成する9枚'} - MyFavoriteAlbums`,
              files: [imageFile],
            });
            return; // シェア成功で終了
          } catch (shareError) {
            // ユーザーがキャンセルした場合は通常のダウンロードにフォールバック
            if ((shareError as Error).name !== 'AbortError') {
              console.error('シェアエラー:', shareError);
            }
          }
        }
      }

      // PCまたはWeb Share APIが使えない場合：通常のダウンロード
      const blobUrl = URL.createObjectURL(pngBlob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = imageFile.name;
      document.body.appendChild(link);
      
      // クリックしてダウンロードを開始
      link.click();
      
      // クリーンアップ
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('ダウンロードエラー:', error);
      alert('画像のダウンロードに失敗しました');
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
            <ArrowLeft className="h-4 w-4 mr-2" />
            作成画面に戻る
          </Button>
        </div>
      </div>
    );
  }

  if (!post) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-4xl">
        {/* ヘッダー */}
        <Header
          title={post.title || undefined}
          subtitle={
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
              {post.userName && (
                <span className="font-medium">by @{post.userName}</span>
              )}
              <span>
                {new Date(post.createdAt).toLocaleDateString('ja-JP', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>
          }
          showBackButton={true}
        />

        {/* アルバムグリッド（読み取り専用） */}
        <div className="mb-6 sm:mb-8">
          <AlbumGrid
            albums={albums}
            readonly={true}
            onAdd={() => {}}
            onRemove={() => {}}
            onReplace={() => {}}
            onReorder={() => {}}
            onAlbumClick={handleAlbumClick}
          />
        </div>

        {/* Spotifyプレーヤー */}
        <SpotifyPlayer
          isOpen={playerOpen}
          spotifyId={selectedAlbum?.spotifyId || selectedArtistId || ''}
          embedType={playerType}
          album={selectedAlbum || undefined}
          onClose={() => {
            setPlayerOpen(false);
            setSelectedAlbum(null);
            setSelectedArtistId(null);
          }}
        />

        {/* アルバム詳細リスト */}
        <div className="mt-12 sm:mt-16">
          <h2 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-center" style={{ fontWeight: 700 }}>
            アルバム詳細
          </h2>
          <div className="space-y-6 sm:space-y-8">
            {albums
              .filter((album): album is Album => album !== null)
              .map((album) => (
                <div key={album.spotifyId} className="border-b border-border pb-6 sm:pb-8 last:border-b-0">
                  <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-center sm:items-start">
                    {/* アルバム画像 */}
                    <div className="flex-shrink-0">
                      <div
                        className="w-32 h-32 sm:w-40 sm:h-40 rounded-none overflow-hidden cursor-pointer hover:opacity-85 transition-opacity"
                        onClick={() => handleAlbumClick(album)}
                      >
                        <img
                          src={album.imageUrl}
                          alt={album.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>

                    {/* アルバム情報 */}
                    <div className="flex-1 min-w-0 w-full sm:w-auto text-center sm:text-left">
                      <div className="space-y-2">
                        {/* アルバム名 */}
                        <h3
                          className="text-lg sm:text-xl font-bold cursor-pointer hover:text-primary transition-colors"
                          style={{ fontWeight: 700 }}
                          onClick={() => handleAlbumClick(album)}
                        >
                          {album.name}
                        </h3>

                        {/* アーティスト名 */}
                        <p
                          className="text-sm sm:text-base font-semibold text-foreground cursor-pointer hover:text-primary transition-colors"
                          onClick={() => handleArtistClick(album)}
                        >
                          {album.artist}
                        </p>

                        {/* リリース日 */}
                        {album.releaseDate && (
                          <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs sm:text-sm text-muted-foreground font-light">
                            <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" />
                            <span>{formatReleaseDate(album.releaseDate)}</span>
                          </div>
                        )}
                      </div>

                      {/* SongLink埋め込み */}
                      <div className="mt-4 sm:mt-6">
                        <div className="w-full overflow-hidden rounded-md" style={{ height: '43px', position: 'relative' }}>
                          <iframe
                            src={`https://embed.odesli.co/?url=spotify:album:${album.spotifyId}&theme=dark`}
                            frameBorder="0"
                            allowTransparency
                            allowFullScreen
                            sandbox="allow-same-origin allow-scripts allow-presentation allow-popups allow-popups-to-escape-sandbox"
                            className="h-full"
                            style={{ 
                              width: 'calc(100% + 80px)',
                              marginLeft: '-80px',
                              height: '100%'
                            }}
                            title={`SongLink for ${album.name}`}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* アクションボタン: AOTY風のフラットデザイン */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center">
          <Button
            onClick={handleShare}
            size="lg"
            variant="outline"
            className="min-w-32 border border-border hover:bg-accent font-bold transition-colors"
          >
            <Share2 className="h-4 w-4 mr-2" />
            Xでシェア
          </Button>
          <Button
            onClick={handleDownload}
            size="lg"
            className="min-w-32 bg-primary hover:bg-primary/90 text-white font-bold transition-colors"
          >
            <Download className="h-4 w-4 mr-2" />
            画像をダウンロード
          </Button>
        </div>
      </div>
    </div>
  );
}

