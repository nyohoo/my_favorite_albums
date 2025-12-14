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
}

export function AlbumGrid({ albums, onAdd, onRemove }: AlbumGridProps) {
  return (
    <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
      {albums.map((album, index) => (
        <div key={index} className="aspect-square">
          {album ? (
            <Card className="relative h-full group">
              <CardContent className="p-0 h-full">
                <img
                  src={album.imageUrl}
                  alt={album.name}
                  className="w-full h-full object-cover rounded-lg"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => onRemove(index)}
                    className="rounded-full"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 rounded-b-lg">
                  <p className="text-white text-xs font-bold truncate">
                    {album.name}
                  </p>
                  <p className="text-white/80 text-xs truncate">
                    {album.artist}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors">
              <CardContent className="h-full flex items-center justify-center p-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onAdd(index)}
                  className="h-full w-full rounded-lg"
                >
                  <Plus className="h-8 w-8 text-gray-400" />
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      ))}
    </div>
  );
}

