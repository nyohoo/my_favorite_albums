import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

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
  onReorder: (fromIndex: number, toIndex: number) => void;
}

import { AlbumSlot } from './AlbumSlot';

export function AlbumGrid({
  albums,
  onAdd,
  onRemove,
  onReplace,
  onReorder,
}: AlbumGridProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10, // 10px移動してからドラッグ開始（誤タップ防止）
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

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      modifiers={[]} // アニメーションの修正を無効化
    >
      <SortableContext items={sortableIds} strategy={rectSortingStrategy}>
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
