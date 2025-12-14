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
  type SortingStrategy,
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

// 空のスロットも考慮したカスタム並べ替え戦略
// handleDragEndと同じロジックで位置を計算して、プレビュー位置を正確に表示
const customRectSortingStrategy: SortingStrategy = (args) => {
  const { activeIndex, overIndex, rects, activeNodeRect } = args;
  
  if (activeIndex === -1 || overIndex === -1) {
    return null;
  }

  // activeNodeRectはドラッグ中のアイテムの現在の位置
  // rects[overIndex]はドロップ先の位置
  // この差分を計算することで、空のスロットも考慮した正確な位置を計算
  const overRect = rects[overIndex];
  
  if (!overRect || !activeNodeRect) {
    return null;
  }

  // handleDragEndと同じロジックで位置の差分を計算
  // activeNodeRect（ドラッグ中の現在位置）からoverRect（ドロップ先）への差分
  const delta = {
    x: overRect.left - activeNodeRect.left,
    y: overRect.top - activeNodeRect.top,
  };

  return {
    x: delta.x,
    y: delta.y,
    scaleX: 1,
    scaleY: 1,
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
