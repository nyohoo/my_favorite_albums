import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, Share2, Download, Calendar, ArrowLeft, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AlbumGrid, type Album } from '@/components/AlbumGrid';
import { SpotifyPlayer } from '@/components/SpotifyPlayer';
import { Header } from '@/components/Header';
import { getPost, getVibeCardUrl, createShortUrl } from '@/lib/api';

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
    hashtag: string;
    userName: string | null;
    createdAt: Date;
    updatedAt: Date;
  } | null>(null);
  const [albums, setAlbums] = useState<(Album | null)[]>(Array(9).fill(null));
  const [playerOpen, setPlayerOpen] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [selectedArtistId, setSelectedArtistId] = useState<string | null>(null);
  const [playerType, setPlayerType] = useState<'album' | 'artist'>('album');
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);

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
    console.log('handleArtistClick called with album:', album);
    console.log('album.artistId:', album.artistId);
    if (album.artistId) {
      setSelectedAlbum(null);
      setSelectedArtistId(album.artistId);
      setPlayerType('artist');
      setPlayerOpen(true);
      console.log('Opening artist player with artistId:', album.artistId);
    } else {
      // アーティストIDがない場合はアルバムプレーヤーを開く
      console.warn('アーティストIDが取得できませんでした。アルバムプレーヤーを開きます。', album);
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
    // titleはhashtagまたはtitleのフォールバック値
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
        
        // 画像の読み込みを待ってからアニメーションを開始
        const imagePromises = formattedAlbums.map((album) => {
          return new Promise<void>((resolve) => {
            const img = new Image();
            img.src = album.imageUrl;
            img.onload = () => resolve();
            img.onerror = () => resolve(); // エラーでも続行
          });
        });
        
        // すべての画像が読み込まれた後、少し遅延させてからアニメーション開始
        await Promise.all(imagePromises);
        await new Promise(resolve => setTimeout(resolve, 300)); // 300ms遅延
        
        setShouldAnimate(true);
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
      // 短縮URLを生成
      let shareUrl = window.location.href;
      try {
        const shortUrlData = await createShortUrl(id);
        shareUrl = shortUrlData.shortUrl;
      } catch (shortUrlError) {
        console.warn('短縮URL生成に失敗しましたが、元のURLでシェアします:', shortUrlError);
        // 短縮URL生成に失敗しても元のURLでシェアを続行
      }

      // 画像生成を試みる（失敗してもテキスト+URLはシェア可能）
      let imageFile: File | null = null;
      try {
        imageFile = await generatePngImage(id, post?.hashtag || post?.title || null);
      } catch (imageError) {
        console.warn('画像生成に失敗しましたが、テキスト+URLのみでシェアします:', imageError);
      }

      // Web Share APIが使える場合
      if (navigator.share) {
        const shareData: ShareData = {
          title: post?.hashtag || post?.title || 'MyFavoriteAlbums',
          text: `${post?.hashtag || post?.title || '私を構成する9枚'} - MyFavoriteAlbums\n\n詳細はこちら 👇\n${shareUrl}`,
          url: shareUrl,
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
      const shareText = `${post?.hashtag || post?.title || '私を構成する9枚'} - MyFavoriteAlbums\n\n詳細はこちら 👇\n${shareUrl}`;
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

  const handleCopyUrl = async () => {
    if (!id) return;

    try {
      // 短縮URLを生成（バックグラウンドで実行、タイムアウト付き）
      let urlToCopy = window.location.href;
      try {
        // 1秒以内に短縮URLを取得、失敗したら元のURLを使用
        const shortUrlData = await Promise.race([
          createShortUrl(id),
          new Promise<{ shortUrl: string }>((resolve) => 
            setTimeout(() => resolve({ shortUrl: window.location.href }), 1000)
          )
        ]);
        urlToCopy = shortUrlData.shortUrl;
      } catch (shortUrlError) {
        console.warn('短縮URL生成に失敗しましたが、元のURLをコピーします:', shortUrlError);
        // 短縮URL生成に失敗しても元のURLでコピーを続行
      }

      // モバイル対応: より確実なコピー方法
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      // モバイルでは、promptを使用して確実にコピーできるようにする
      // PCでも、Clipboard APIが失敗した場合はpromptを使用
      if (isMobile) {
        // モバイルでは、promptでURLを表示して手動コピーを促す（最も確実）
        const message = `以下のURLをコピーしてください:`;
        const promptResult = prompt(message, urlToCopy);
        if (promptResult !== null) {
          // ユーザーが手動でコピーした可能性があるので、成功として扱う
          setUrlCopied(true);
          setTimeout(() => setUrlCopied(false), 2000);
        }
        return;
      }

      // PCでのコピー処理
      let copySuccess = false;
      
      // 方法1: Clipboard API（モダンブラウザ、HTTPS必須）
      if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext) {
        try {
          await navigator.clipboard.writeText(urlToCopy);
          // 実際にコピーされたか検証（読み取って確認）
          // 注意: readTextは権限が必要で、多くのブラウザで失敗する可能性がある
          try {
            const copiedText = await navigator.clipboard.readText();
            if (copiedText === urlToCopy) {
              copySuccess = true;
            } else {
              console.warn('コピーされたテキストが一致しません');
            }
          } catch {
            // 読み取り権限がない場合、writeTextが成功していれば成功とみなす
            // ただし、モバイルでは信頼性が低いため、promptを使用
            copySuccess = true;
          }
        } catch (clipboardError) {
          console.warn('Clipboard API failed:', clipboardError);
        }
      }

      // 方法2: execCommand（フォールバック、PCのみ）
      if (!copySuccess) {
        const textArea = document.createElement('textarea');
        textArea.value = urlToCopy;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        textArea.style.top = '-9999px';
        textArea.style.width = '2em';
        textArea.style.height = '2em';
        textArea.style.padding = '0';
        textArea.style.border = 'none';
        textArea.style.outline = 'none';
        textArea.style.boxShadow = 'none';
        textArea.style.background = 'transparent';
        textArea.setAttribute('readonly', '');
        
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        textArea.setSelectionRange(0, 999999);
        
        try {
          const execSuccess = document.execCommand('copy');
          if (execSuccess) {
            copySuccess = true;
          }
        } catch (execError) {
          console.warn('execCommand failed:', execError);
        } finally {
          document.body.removeChild(textArea);
        }
      }

      // コピーが成功した場合のみ「コピーしました」を表示
      if (copySuccess) {
        setUrlCopied(true);
        setTimeout(() => setUrlCopied(false), 2000);
      } else {
        // コピーに失敗した場合は、promptでURLを表示
        const message = `URLを自動コピーできませんでした。\n\n以下のURLを手動でコピーしてください:`;
        const promptResult = prompt(message, urlToCopy);
        if (promptResult !== null) {
          // ユーザーが手動でコピーした可能性があるので、成功として扱う
          setUrlCopied(true);
          setTimeout(() => setUrlCopied(false), 2000);
        }
      }
    } catch (error) {
      console.error('URLコピーエラー:', error);
      // エラー時もpromptでURLを表示
      const urlToCopy = window.location.href;
      const promptResult = prompt('URLをコピーできませんでした。\n\n以下のURLを手動でコピーしてください:', urlToCopy);
      if (promptResult !== null) {
        setUrlCopied(true);
        setTimeout(() => setUrlCopied(false), 2000);
      }
    }
  };

  const handleDownload = async () => {
    if (!id) return;

    try {
      // 共通関数を使用してPNG画像を生成
      const imageFile = await generatePngImage(id, post?.hashtag || post?.title || null);
      const pngBlob = await imageFile.arrayBuffer().then(buffer => new Blob([buffer], { type: 'image/png' }));

      // スマホの場合：Web Share APIを使用（OSのシェア機能を利用）
      if (navigator.share && navigator.canShare) {
        // Web Share APIでシェア可能かチェック
        if (navigator.canShare({ files: [imageFile] })) {
          try {
            await navigator.share({
              title: post?.hashtag || post?.title || 'My Favorite Albums',
              text: `${post?.hashtag || post?.title || '私を構成する9枚'} - MyFavoriteAlbums`,
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
      <div className="container mx-auto px-4 py-4 sm:py-6 max-w-6xl">
        {/* ヘッダー */}
        <Header
          title={post.hashtag || post.title || undefined}
          subtitle={
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-sm sm:text-base">
              {post.userName && (
                <span className="text-muted-foreground">
                  created by <span className="font-medium text-foreground">{post.userName}</span>
                </span>
              )}
              <span className="text-muted-foreground">
                {new Date(post.createdAt).toLocaleDateString('ja-JP', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>
          }
        />

        {/* アルバムグリッド（読み取り専用） - AOTY風の中央配置 */}
        <div className="mb-12 sm:mb-16">
          <AlbumGrid
            albums={albums}
            readonly={true}
            onAdd={() => {}}
            onRemove={() => {}}
            onReplace={() => {}}
            onReorder={() => {}}
            onAlbumClick={handleAlbumClick}
            shouldAnimate={shouldAnimate}
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

        {/* アルバム詳細リスト - AOTY風のモダンなカードデザイン */}
        <div className="mt-16 sm:mt-20">
          <h2 className="text-2xl sm:text-3xl font-bold mb-8 sm:mb-12 text-center" style={{ fontWeight: 700 }}>
            アルバム詳細
          </h2>
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 gap-6 sm:gap-8">
            {albums
              .filter((album): album is Album => album !== null)
              .map((album, index) => (
                <div
                  key={album.spotifyId}
                  className="group bg-card border border-border/50 rounded-lg p-6 sm:p-8 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-1"
                  style={{
                    animation: `fadeInUp 0.5s ease-out ${index * 0.05}s both`,
                  }}
                >
                  <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
                    {/* アルバム画像 - AOTY風のサイズとホバーエフェクト */}
                    <div className="flex-shrink-0">
                      <div
                        className="w-32 h-32 sm:w-40 sm:h-40 overflow-hidden cursor-pointer transition-all duration-300 group-hover:scale-105 shadow-lg group-hover:shadow-xl"
                        onClick={() => handleAlbumClick(album)}
                      >
                        <img
                          src={album.imageUrl}
                          alt={album.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>

                    {/* アルバム情報 - AOTY風のタイポグラフィ */}
                    <div className="flex-1 min-w-0 w-full sm:w-auto text-center sm:text-left max-w-2xl">
                      <div className="space-y-3">
                        {/* アルバム名 */}
                        <h3
                          className="text-xl sm:text-2xl font-bold cursor-pointer hover:text-primary transition-colors duration-200 line-clamp-2"
                          style={{ fontWeight: 700 }}
                          onClick={() => handleAlbumClick(album)}
                        >
                          {album.name}
                        </h3>

                        {/* アーティスト名 */}
                        <p
                          className="text-base sm:text-lg font-semibold text-foreground cursor-pointer hover:text-primary transition-colors duration-200"
                          onClick={() => handleArtistClick(album)}
                        >
                          {album.artist}
                        </p>

                        {/* リリース日 */}
                        {album.releaseDate && (
                          <div className="flex items-center justify-center sm:justify-start gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4 flex-shrink-0" />
                            <span>{formatReleaseDate(album.releaseDate)}</span>
                          </div>
                        )}
                      </div>

                      {/* SongLink埋め込み */}
                      <div className="mt-6">
                        <div className="w-full overflow-hidden rounded-lg" style={{ height: '43px', position: 'relative' }}>
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
        </div>

        {/* アクションボタン - AOTY風のモダンなスタイル */}
        <div className="mt-12 sm:mt-16 flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button
            onClick={handleShare}
            size="lg"
            variant="outline"
            className="min-w-40 border-2 border-border hover:bg-accent hover:border-primary/50 font-semibold transition-all duration-200 rounded-lg px-8 py-3"
          >
            <Share2 className="h-5 w-5 mr-2" />
            Xでシェア
          </Button>
          <Button
            onClick={handleCopyUrl}
            size="lg"
            variant="outline"
            className="min-w-40 border-2 border-border hover:bg-accent hover:border-primary/50 font-semibold transition-all duration-200 rounded-lg px-8 py-3"
          >
            {urlCopied ? (
              <>
                <Check className="h-5 w-5 mr-2" />
                コピーしました
              </>
            ) : (
              <>
                <Copy className="h-5 w-5 mr-2" />
                URLをコピー
              </>
            )}
          </Button>
          <Button
            onClick={handleDownload}
            size="lg"
            className="min-w-40 bg-primary hover:bg-primary/90 text-white font-semibold transition-all duration-200 rounded-lg px-8 py-3 shadow-lg hover:shadow-xl hover:scale-105"
          >
            <Download className="h-5 w-5 mr-2" />
            画像をダウンロード
          </Button>
        </div>
      </div>
    </div>
  );
}

