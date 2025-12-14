import { useState, useEffect } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { searchAlbums } from '@/lib/api';
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

  // ダイアログが開いた時に検索フィールドにフォーカス
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults([]);
      setError(null);
    }
  }, [isOpen]);

  useEffect(() => {
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
        setError(err instanceof Error ? err.message : '検索に失敗しました');
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 500); // デバウンス: 500ms

    return () => clearTimeout(timeoutId);
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="アルバム名やアーティスト名で検索..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10"
          autoFocus
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
            className="cursor-pointer hover:bg-accent transition-colors"
            onClick={() => {
              onSelect(album);
              onClose();
            }}
          >
            <CardContent className="p-3">
              <div className="flex gap-3">
                <img
                  src={album.imageUrl}
                  alt={album.name}
                  className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate text-sm sm:text-base">{album.name}</p>
                  <p className="text-sm text-muted-foreground truncate">{album.artist}</p>
                  {album.releaseDate && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {album.releaseDate}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
