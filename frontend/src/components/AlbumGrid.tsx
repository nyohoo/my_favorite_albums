import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  type SortingStrategy,
} from '@dnd-kit/sortable';

export interface Album {
  spotifyId: string;
  name: string;
  artist: string;
  imageUrl: string;
  releaseDate?: string;
  spotifyUrl?: string;
  artistId?: string;
}

interface AlbumGridProps {
  albums: (Album | null)[];
  onAdd: (index: number) => void;
  onRemove: (index: number) => void;
  onReplace: (index: number) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  readonly?: boolean;
  onAlbumClick?: (album: Album) => void;
  shouldAnimate?: boolean;
}

import { AlbumSlot } from './AlbumSlot';

// 空のスロットも考慮したカスタム並べ替え戦略
// 各アイテムに対して個別にtransformを計算
const customRectSortingStrategy: SortingStrategy = (args) => {
  const { activeIndex, overIndex, index, rects, activeNodeRect } = args;
  
  if (activeIndex === -1 || overIndex === -1 || index === -1) {
    return null;
  }

  // ドラッグ中のアイテム自体のtransformを計算
  if (index === activeIndex) {
    // ドラッグ中のアイテムは、ドロップ先の位置に移動
    const overRect = rects[overIndex];
    if (!overRect || !activeNodeRect) {
      return null;
    }
    return {
      x: overRect.left - activeNodeRect.left,
      y: overRect.top - activeNodeRect.top,
      scaleX: 1,
      scaleY: 1,
    };
  }

  // 他のアイテムは移動しない（空のスロットへの移動の場合）
  // 既存のスロットへの移動の場合のみ、入れ替えが発生する
  // ただし、プレビューではドラッグ中のアイテムのみを移動させる
  return null;
};

export function AlbumGrid({
  albums,
  onAdd,
  onRemove,
  onReplace,
  onReorder,
  readonly = false,
  onAlbumClick,
  shouldAnimate = false,
}: AlbumGridProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // マウス操作では8px移動してからドラッグ開始（誤クリック防止）
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200, // タッチ操作では200ms長押しでドラッグ開始
        tolerance: 5, // 5pxまでの移動は許容
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const activeIndex = albums.findIndex(
      (_, index) => `album-${index}` === active.id
    );
    const overIndex = albums.findIndex(
      (_, index) => `album-${index}` === over.id
    );

    if (activeIndex !== -1 && overIndex !== -1) {
      // 空のスロットにドロップした場合の特別な処理
      if (albums[overIndex] === null) {
        // 空のスロットに直接配置（他のスロットは影響を受けない）
        onReorder(activeIndex, overIndex);
      } else {
        // 既存のアルバムがあるスロットにドロップした場合は通常の入れ替え
        onReorder(activeIndex, overIndex);
      }
    }
  };

  // すべてのスロット（空のスロットも含む）をドロップ先として認識できるようにする
  const sortableIds = albums.map((_, index) => `album-${index}`);

  // readonlyモードの場合は、ドラッグ&ドロップを無効化
  if (readonly) {
    return (
      <div className="grid grid-cols-3 gap-0 max-w-2xl mx-auto" style={{ perspective: '1000px' }}>
        {albums.map((album, index) => {
          // 左上から順に波打つアニメーションの遅延を計算（行ごとに0.1s、列ごとに0.05s）
          const row = Math.floor(index / 3);
          const col = index % 3;
          const delay = shouldAnimate ? row * 0.1 + col * 0.05 : 0;
          
          return (
            <div
              key={index}
              className={shouldAnimate ? '' : 'album-grid-item-pre-animate'}
              style={{
                animation: shouldAnimate
                  ? `waveIn 1.2s ease-out ${delay}s both`
                  : 'none',
                transformStyle: 'preserve-3d',
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
              }}
            >
              <AlbumSlot
                album={album}
                index={index}
                onAdd={() => {}}
                onRemove={() => {}}
                onReplace={() => {}}
                onClick={album && onAlbumClick ? () => onAlbumClick(album) : undefined}
                readonly={true}
              />
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      modifiers={[]} // アニメーションの修正を無効化
    >
      <SortableContext items={sortableIds} strategy={customRectSortingStrategy}>
        <div className="grid grid-cols-3 gap-3 sm:gap-4 max-w-2xl mx-auto">
          {albums.map((album, index) => (
            <AlbumSlot
              key={index}
              album={album}
              index={index}
              onAdd={() => onAdd(index)}
              onRemove={() => onRemove(index)}
              onReplace={() => onReplace(index)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
