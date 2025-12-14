import { X, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface SpotifyPlayerProps {
  isOpen: boolean;
  spotifyId: string;
  embedType: 'album' | 'artist';
  onClose: () => void;
}

export function SpotifyPlayer({
  isOpen,
  spotifyId,
  embedType,
  onClose,
}: SpotifyPlayerProps) {
  if (!spotifyId) return null;

  const embedUrl = `https://open.spotify.com/embed/${embedType}/${spotifyId}?utm_source=generator`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md sm:max-w-lg p-0 bg-transparent border-none shadow-none">
        <DialogHeader className="sr-only">
          <DialogTitle>Spotifyプレーヤー</DialogTitle>
          <DialogDescription>
            {embedType === 'album' ? 'アルバム' : 'アーティスト'}のSpotifyプレーヤー
          </DialogDescription>
        </DialogHeader>
        <div className="bg-background/95 rounded-lg p-4 space-y-3 animate-in fade-in duration-300">
          {/* ヘッダー */}
          <div className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">音量注意</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-6 w-6 rounded-full hover:bg-destructive/10"
              aria-label="プレーヤーを閉じる"
            >
              <X className="h-4 w-4 text-destructive" />
            </Button>
          </div>

          {/* Spotify埋め込みプレーヤー */}
          <div className="w-full">
            <iframe
              src={embedUrl}
              width="100%"
              height="380"
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              className="rounded-xl"
              loading="lazy"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

