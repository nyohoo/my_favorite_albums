import { Plus, X, GripVertical, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useSortable } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { Album } from './AlbumGrid';

interface AlbumSlotProps {
  album: Album | null;
  index: number;
  onAdd: () => void;
  onRemove: () => void;
  onReplace: () => void;
}

export function AlbumSlot({
  album,
  index,
  onAdd,
  onRemove,
  onReplace,
}: AlbumSlotProps) {
  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `album-${index}`,
    // 空のスロットも位置計算に含めるため、disabledをfalseにする
    // ただし、ドラッグはlistenersを適用しないことで防ぐ
    disabled: false,
    animateLayoutChanges: () => false, // レイアウト変更のアニメーションを無効化
  });

  const {
    setNodeRef: setDroppableRef,
    isOver,
  } = useDroppable({
    id: `album-${index}`,
    disabled: false, // すべてのスロットをドロップ可能に
  });

  // 既存のアルバムがあるスロットでも、ドロップ可能にするために両方のrefを設定
  const setNodeRef = (node: HTMLElement | null) => {
    if (album) {
      // 既存のアルバムがあるスロット：sortableとdroppableの両方を設定
      setSortableRef(node);
      setDroppableRef(node);
    } else {
      // 空のスロット：droppableのみ
      setDroppableRef(node);
    }
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : transition, // ドラッグ中のみアニメーション無効化
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 50 : 1,
  };

  if (!album) {
    return (
      <div
        ref={setDroppableRef}
        className="aspect-square"
      >
        <Card className={`h-full border-2 border-dashed transition-colors cursor-pointer ${isOver ? 'border-primary bg-primary/10' : 'border-muted-foreground/30 hover:border-primary/50'}`}>
          <CardContent className="h-full flex items-center justify-center p-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={onAdd}
              className="h-full w-full rounded-lg flex flex-col items-center justify-center gap-2"
            >
              <Plus className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground" />
              <span className="text-xs text-muted-foreground hidden sm:block">
                アルバムを追加
              </span>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`aspect-square ${isDragging ? 'cursor-grabbing' : ''}`}
    >
      <Card className={`relative h-full group ${isDragging ? 'ring-2 ring-primary' : ''}`}>
        <CardContent 
          className="p-0 h-full relative"
          {...attributes}
          {...listeners}
          style={{ cursor: album ? 'grab' : 'default' }}
        >
          {/* ドラッグハンドル（常に表示） */}
          {album && (
            <div
              className="absolute top-2 right-2 z-10 bg-black/60 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
              title="ドラッグして移動"
            >
              <GripVertical className="h-4 w-4 text-white" />
            </div>
          )}
          <img
            src={album.imageUrl}
            alt={album.name}
            className="w-full h-full object-cover rounded-lg pointer-events-none"
            draggable="false"
          />
          {/* ホバー時のオーバーレイ */}
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2 pointer-events-none">
            {/* アルバム変更ボタン */}
            {album && (
              <Button
                variant="secondary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onReplace();
                }}
                className="rounded-full pointer-events-auto"
                title="アルバムを変更"
              >
                <RefreshCw className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">アルバム変更</span>
              </Button>
            )}
            <Button
              variant="destructive"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="rounded-full pointer-events-auto"
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
    </div>
  );
}

