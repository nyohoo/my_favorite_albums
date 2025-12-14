import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export interface Album {
  spotifyId: string;
  name: string;
  artist: string;
  imageUrl: string;
  releaseDate?: string;
  spotifyUrl?: string;
}

interface AlbumGridProps {
  albums: (Album | null)[];
  onAdd: (index: number) => void;
  onRemove: (index: number) => void;
  onReplace: (index: number) => void;
}

export function AlbumGrid({ albums, onAdd, onRemove, onReplace }: AlbumGridProps) {
  return (
    <div className="grid grid-cols-3 gap-3 sm:gap-4 max-w-2xl mx-auto">
      {albums.map((album, index) => (
        <div key={index} className="aspect-square">
          {album ? (
            <Card className="relative h-full group cursor-pointer">
              <CardContent className="p-0 h-full relative">
                <img
                  src={album.imageUrl}
                  alt={album.name}
                  className="w-full h-full object-cover rounded-lg"
                />
                {/* ホバー時のオーバーレイ */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onReplace(index);
                    }}
                    className="rounded-full"
                  >
                    入れ替え
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(index);
                    }}
                    className="rounded-full"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                {/* アルバム情報 */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-2 rounded-b-lg">
                  <p className="text-white text-xs font-bold truncate">
                    {album.name}
                  </p>
                  <p className="text-white/80 text-xs truncate">
                    {album.artist}
                  </p>
                </div>
                {/* 番号表示 */}
                <div className="absolute top-2 left-2 bg-primary text-primary-foreground rounded-full w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center text-xs font-bold">
                  {index + 1}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 transition-colors cursor-pointer">
              <CardContent className="h-full flex items-center justify-center p-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onAdd(index)}
                  className="h-full w-full rounded-lg flex flex-col items-center justify-center gap-2"
                >
                  <Plus className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground hidden sm:block">
                    アルバムを追加
                  </span>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      ))}
    </div>
  );
}
