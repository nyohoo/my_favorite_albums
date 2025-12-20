import { useState, useRef } from 'react';
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
  onClick?: () => void;
  readonly?: boolean;
}

export function AlbumSlot({
  album,
  index,
  onAdd,
  onRemove,
  onReplace,
  onClick,
  readonly = false,
}: AlbumSlotProps) {
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([]);
  const rippleIdRef = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const touchMovedRef = useRef(false);

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

  // リップルエフェクトを生成する関数
  const createRipple = (event: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!cardRef.current || !onClick) return;

    const rect = cardRef.current.getBoundingClientRect();
    let x: number;
    let y: number;

    if ('touches' in event) {
      // タッチイベント
      x = event.touches[0].clientX - rect.left;
      y = event.touches[0].clientY - rect.top;
    } else {
      // マウスイベント
      x = event.clientX - rect.left;
      y = event.clientY - rect.top;
    }

    const newRipple = {
      x,
      y,
      id: rippleIdRef.current++,
    };

    setRipples((prev) => [...prev, newRipple]);

    // アニメーション終了後にリップルを削除
    setTimeout(() => {
      setRipples((prev) => prev.filter((ripple) => ripple.id !== newRipple.id));
    }, 600);
  };

  // クリック/タッチハンドラー（タッチ感度を調整）
  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (readonly && onClick) {
      createRipple(event);
      // 少し遅延させてからonClickを実行（リップルが見えるように）
      setTimeout(() => {
        onClick();
      }, 50);
    } else if (onClick) {
      onClick();
    }
  };

  // タッチ開始位置と時刻を記録
  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (readonly && onClick) {
      const touch = event.touches[0];
      touchStartRef.current = { 
        x: touch.clientX, 
        y: touch.clientY,
        time: Date.now()
      };
      touchMovedRef.current = false;
    }
  };

  // タッチ移動を検出（スクロール判定用）
  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (readonly && onClick && touchStartRef.current) {
      const touch = event.touches[0];
      const moveX = Math.abs(touch.clientX - touchStartRef.current.x);
      const moveY = Math.abs(touch.clientY - touchStartRef.current.y);
      
      // 5px以上移動したらスクロールと判断
      if (moveX > 5 || moveY > 5) {
        touchMovedRef.current = true;
      }
    }
  };

  // タッチハンドラー（タッチ感度を調整：タッチ終了時に反応）
  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (readonly && onClick && touchStartRef.current) {
      const touch = event.changedTouches[0];
      const moveX = Math.abs(touch.clientX - touchStartRef.current.x);
      const moveY = Math.abs(touch.clientY - touchStartRef.current.y);
      const touchDuration = Date.now() - touchStartRef.current.time;
      
      // スクロールと判断された場合は処理しない
      if (touchMovedRef.current) {
        touchStartRef.current = null;
        touchMovedRef.current = false;
        return;
      }
      
      // 8px以内の移動かつ300ms以内のタップのみ反応（誤タッチ防止、スクロール優先）
      if (moveX < 8 && moveY < 8 && touchDuration < 300) {
        createRipple(event);
        // 少し遅延させてからonClickを実行（リップルが見えるように）
        setTimeout(() => {
          onClick();
        }, 50);
      }
      
      touchStartRef.current = null;
      touchMovedRef.current = false;
    }
  };

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
    // readonlyモードでは空のスロットを表示しない
    if (readonly) {
      return null;
    }
    
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

  // readonlyモードの場合は、角丸をなくし、シームレスなデザインにする
  // タップ可能であることを示すアニメーションクラスを追加
  // アルバム詳細セクションと同じようなふわっとした反応を追加
  const cardClassName = readonly
    ? `relative h-full rounded-none border-0 shadow-none transition-all duration-300 ${onClick ? 'cursor-pointer active:scale-[0.98] active:opacity-90 sm:hover:scale-[1.02] sm:hover:opacity-95' : ''}`
    : `relative h-full group ${isDragging ? 'ring-2 ring-primary' : ''} ${onClick ? 'cursor-pointer' : ''}`;
  
  const imageClassName = readonly
    ? 'w-full h-full object-cover pointer-events-none'
    : 'w-full h-full object-cover rounded-lg pointer-events-none';
  
  const overlayClassName = readonly
    ? 'absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 pointer-events-none'
    : 'absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2 pointer-events-none';
  
  const infoClassName = readonly
    ? 'absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-2'
    : 'absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-2 rounded-b-lg';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`aspect-square ${isDragging ? 'cursor-grabbing' : ''}`}
    >
      <Card 
        ref={cardRef}
        className={`${cardClassName} relative overflow-hidden`}
        onClick={readonly && onClick ? handleClick : onClick}
        onTouchStart={readonly && onClick ? handleTouchStart : undefined}
        onTouchMove={readonly && onClick ? handleTouchMove : undefined}
        onTouchEnd={readonly && onClick ? handleTouchEnd : undefined}
        style={{ touchAction: readonly && onClick ? 'pan-y' : undefined }}
      >
        {/* リップルエフェクト */}
        {readonly && onClick && (
          <div className="absolute inset-0 pointer-events-none z-20">
            {ripples.map((ripple) => (
              <span
                key={ripple.id}
                className="ripple-effect"
                style={{
                  left: ripple.x,
                  top: ripple.y,
                }}
              />
            ))}
          </div>
        )}
        <CardContent 
          className="p-0 h-full relative"
          {...(onClick ? (readonly ? {} : { onClick }) : { ...attributes, ...listeners })}
          style={{ 
            cursor: onClick ? 'pointer' : (album ? 'grab' : 'default'), 
            WebkitTouchCallout: 'none',
            touchAction: readonly && onClick ? 'pan-y' : undefined
          }}
        >
          {/* ドラッグハンドル（readonlyモードでは非表示） */}
          {album && !readonly && (
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
            className={imageClassName}
            draggable="false"
          />
          {/* readonlyモードでタップ可能な場合の視覚的インジケーター */}
          {readonly && onClick && (
            <div className="absolute inset-0 border-2 border-transparent hover:border-primary/50 transition-all duration-300 rounded-none pointer-events-none" />
          )}
          {/* ホバー時のオーバーレイ（readonlyモードでは非表示） */}
          {!readonly && (
            <div className={overlayClassName}>
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
          )}
          {/* アルバム情報（readonlyモードでは非表示） */}
          {!readonly && (
            <div className={infoClassName}>
              <p className="text-white text-xs font-bold truncate">
                {album.name}
              </p>
              <p className="text-white/80 text-xs truncate">
                {album.artist}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

