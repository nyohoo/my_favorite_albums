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
  type SortingStrategy,
} from '@dnd-kit/sortable';
import type { Active, Over } from '@dnd-kit/core';

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

// 空のスロットも考慮したカスタム並べ替え戦略
// rectSortingStrategyはdisabledなアイテムを無視するため、空のスロットを考慮した位置計算を行う
const customRectSortingStrategy: SortingStrategy = (args) => {
  const { active, over, rects, scrollAdjustedTranslate } = args;
  
  if (!over || !active) {
    return null;
  }

  // すべてのスロット（空も含む）の位置を計算
  const activeRect = rects[active.id];
  const overRect = rects[over.id];

  if (!activeRect || !overRect) {
    return null;
  }

  // 空のスロットも含めて、実際のインデックス位置を計算
  const activeIndex = parseInt(active.id.toString().replace('album-', ''));
  const overIndex = parseInt(over.id.toString().replace('album-', ''));

  // 位置の差分を計算
  const delta = {
    x: overRect.left - activeRect.left,
    y: overRect.top - activeRect.top,
  };

  return {
    x: delta.x + (scrollAdjustedTranslate?.x || 0),
    y: delta.y + (scrollAdjustedTranslate?.y || 0),
  };
};

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
