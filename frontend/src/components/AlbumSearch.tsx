import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { searchAlbums } from '@/lib/api';
import type { Album } from './AlbumGrid';

interface AlbumSearchProps {
  onSelect: (album: Album) => void;
}

export function AlbumSearch({ onSelect }: AlbumSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Album[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (query.trim().length === 0) {
      setResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await searchAlbums(query);
        setResults(data.albums.map(album => ({
          spotifyId: album.spotifyId,
          name: album.name,
          artist: album.artist,
          imageUrl: album.imageUrl,
          releaseDate: album.releaseDate,
          spotifyUrl: album.spotifyUrl,
        })));
      } catch (err) {
        setError(err instanceof Error ? err.message : '検索に失敗しました');
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 500); // デバウンス: 500ms

    return () => clearTimeout(timeoutId);
  }, [query]);

  return (
    <div className="space-y-4">
      <Input
        type="text"
        placeholder="アルバム名やアーティスト名で検索..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full"
      />

      {loading && (
        <div className="text-center text-muted-foreground py-4">
          検索中...
        </div>
      )}

      {error && (
        <div className="text-center text-destructive py-4">
          {error}
        </div>
      )}

      {!loading && !error && results.length === 0 && query.trim().length > 0 && (
        <div className="text-center text-muted-foreground py-4">
          検索結果が見つかりませんでした
        </div>
      )}

      <div className="max-h-96 overflow-y-auto space-y-2">
        {results.map((album) => (
          <Card
            key={album.spotifyId}
            className="cursor-pointer hover:bg-accent transition-colors"
            onClick={() => onSelect(album)}
          >
            <CardContent className="p-3">
              <div className="flex gap-3">
                <img
                  src={album.imageUrl}
                  alt={album.name}
                  className="w-16 h-16 object-cover rounded"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{album.name}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {album.artist}
                  </p>
                  {album.releaseDate && (
                    <p className="text-xs text-muted-foreground">
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

