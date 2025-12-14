import { useState } from 'react';
import { Heart, HeartPlus, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { Album } from './AlbumGrid';

interface SongListProps {
  result: Album;
  isSelected: boolean;
  selectedIndex: number | null;
  onSelect: (album: Album) => void;
  onRemove: (album: Album) => void;
  canAdd: boolean;
}

export function SongList({ result, isSelected, selectedIndex, onSelect, onRemove, canAdd }: SongListProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Card className="group bg-card border-border hover:border-primary/50 transition-all duration-200 overflow-hidden">
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="relative aspect-square"
      >
        <img
          src={result.imageUrl}
          alt={result.name}
          className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
        />
        {/* ホバー時のオーバーレイ */}
        <div
          className={`absolute inset-0 bg-black/60 flex items-center justify-center gap-2 transition-opacity duration-200 ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full bg-white/20 hover:bg-white/30 text-white"
          >
            <Play className="h-5 w-5" />
          </Button>
          {isSelected ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full bg-primary/80 hover:bg-primary text-white relative"
              onClick={() => onRemove(result)}
            >
              <Heart className="h-5 w-5 fill-white" />
              {selectedIndex !== null && (
                <span className="absolute -top-1 -right-1 bg-white text-primary rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                  {selectedIndex + 1}
                </span>
              )}
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full bg-white/20 hover:bg-white/30 text-white"
              onClick={() => canAdd && onSelect(result)}
              disabled={!canAdd}
            >
              <HeartPlus className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
      <CardContent className="p-3">
        <p className="font-semibold text-sm truncate mb-1">{result.name}</p>
        <p className="text-xs text-muted-foreground truncate">{result.artist}</p>
      </CardContent>
    </Card>
  );
}
