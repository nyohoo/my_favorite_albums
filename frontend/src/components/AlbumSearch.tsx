import { useState, useEffect } from 'react';
import { Search, Loader2, Play } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { searchAlbums } from '@/lib/api';
import { SpotifyPlayer } from './SpotifyPlayer';
import type { Album } from './AlbumGrid';

interface AlbumSearchProps {
  isOpen: boolean;
  onSelect: (album: Album) => void;
  onClose: () => void;
}

export function AlbumSearch({ isOpen, onSelect, onClose }: AlbumSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Album[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playerOpen, setPlayerOpen] = useState(false);
  const [playerSpotifyId, setPlayerSpotifyId] = useState<string>('');
  const [playerType, setPlayerType] = useState<'album' | 'artist'>('album');

  // ダイアログが開いた時に検索フィールドにフォーカス
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults([]);
      setError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    // ダイアログが閉じている場合は何もしない
    if (!isOpen) {
      return;
    }

    if (query.trim().length === 0) {
      setResults([]);
      setError(null);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await searchAlbums(query);
        setResults(
          data.albums.map((album) => ({
            spotifyId: album.spotifyId,
            name: album.name,
            artist: album.artist,
            imageUrl: album.imageUrl,
            releaseDate: album.releaseDate,
            spotifyUrl: album.spotifyUrl,
          }))
        );
      } catch (err) {
        console.error('検索エラー:', err);
        const errorMessage = err instanceof Error ? err.message : '検索に失敗しました';
        
        // エラーメッセージをユーザーフレンドリーに変換
        let userFriendlyMessage = errorMessage;
        if (errorMessage.includes('Spotify API credentials not configured')) {
          userFriendlyMessage = 'Spotify APIの設定が完了していません。管理者にお問い合わせください。';
        } else if (errorMessage.includes('Failed to get access token')) {
          userFriendlyMessage = 'Spotify APIの認証に失敗しました。';
        } else if (errorMessage.includes('NetworkError') || errorMessage.includes('Failed to fetch')) {
          userFriendlyMessage = 'サーバーに接続できません。バックエンドサーバーが起動しているか確認してください。';
        }
        
        setError(userFriendlyMessage);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 500); // デバウンス: 500ms

    return () => clearTimeout(timeoutId);
  }, [query, isOpen]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
        <Input
          type="text"
          placeholder="アルバム名やアーティスト名で検索..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
          }}
          className="pl-10 text-foreground relative z-0"
          autoFocus={isOpen}
        />
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">検索中...</span>
        </div>
      )}

      {error && (
        <div className="text-center text-destructive py-4">
          {error}
        </div>
      )}

      {!loading && !error && results.length === 0 && query.trim().length > 0 && (
        <div className="text-center text-muted-foreground py-8">
          検索結果が見つかりませんでした
        </div>
      )}

      {!loading && !error && query.trim().length === 0 && (
        <div className="text-center text-muted-foreground py-8">
          検索キーワードを入力してください
        </div>
      )}

      <div className="max-h-[60vh] overflow-y-auto space-y-2">
        {results.map((album) => (
          <Card
            key={album.spotifyId}
            className="hover:bg-accent transition-colors"
          >
            <CardContent className="p-3">
              <div className="flex gap-3">
                <img
                  src={album.imageUrl}
                  alt={album.name}
                  className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => {
                    setPlayerSpotifyId(album.spotifyId);
                    setPlayerType('album');
                    setPlayerOpen(true);
                  }}
                />
                <div className="flex-1 min-w-0">
                  <p
                    className="font-semibold truncate text-sm sm:text-base cursor-pointer hover:text-primary transition-colors"
                    onClick={() => {
                      setPlayerSpotifyId(album.spotifyId);
                      setPlayerType('album');
                      setPlayerOpen(true);
                    }}
                  >
                    {album.name}
                  </p>
                  <p
                    className="text-sm text-muted-foreground truncate cursor-pointer hover:text-primary transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      // アーティストIDは現在のデータ構造に含まれていないため、一旦アルバムを開く
                      // 将来的にアーティストIDを追加する場合は、ここでアーティストプレーヤーを開く
                      setPlayerSpotifyId(album.spotifyId);
                      setPlayerType('album');
                      setPlayerOpen(true);
                    }}
                  >
                    {album.artist}
                  </p>
                  {album.releaseDate && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {album.releaseDate}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-2 items-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPlayerSpotifyId(album.spotifyId);
                      setPlayerType('album');
                      setPlayerOpen(true);
                    }}
                    title="アルバムを再生"
                  >
                    <Play className="h-4 w-4 text-primary" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(album);
                      onClose();
                    }}
                    title="アルバムを選択"
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Spotifyプレーヤー */}
      <SpotifyPlayer
        isOpen={playerOpen}
        spotifyId={playerSpotifyId}
        embedType={playerType}
        onClose={() => setPlayerOpen(false)}
      />
    </div>
  );
}
