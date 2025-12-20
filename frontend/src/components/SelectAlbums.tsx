import { useState } from 'react';
import { X, Check, Pencil, Trash2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { createPost } from '@/lib/api';
import type { Album } from './AlbumGrid';

interface SelectAlbumsProps {
  isOpen: boolean;
  onClose: () => void;
  albums: Album[];
  onAlbumsChange: (albums: Album[]) => void;
  hashtag: string;
}

export function SelectAlbums({
  isOpen,
  onClose,
  albums,
  onAlbumsChange,
  hashtag,
}: SelectAlbumsProps) {
  const [isEdit, setIsEdit] = useState(false);
  const [checkedDeleteList, setCheckedDeleteList] = useState<Album[]>([]);
  const [flashDelete, setFlashDelete] = useState(false);
  const [flashCreate, setFlashCreate] = useState(false);
  const [processing, setProcessing] = useState(false);

  const handleDelete = () => {
    if (checkedDeleteList.length === 0) {
      setFlashDelete(true);
      setTimeout(() => setFlashDelete(false), 3000);
      return;
    }

    const newAlbums = albums.filter(
      (album) => !checkedDeleteList.some((a) => a.spotifyId === album.spotifyId)
    );
    onAlbumsChange(newAlbums);
    setCheckedDeleteList([]);

    if (newAlbums.length === 0) {
      setIsEdit(false);
    }
  };

  const handleCreate = async () => {
    if (processing) return;
    setProcessing(true);

    if (albums.length !== 9) {
      setFlashCreate(true);
      setProcessing(false);
      setTimeout(() => setFlashCreate(false), 3000);
      return;
    }

    try {
      const userName = 'user_' + Date.now();
      const result = await createPost({
        userName,
        hashtag,
        albums,
      });

      localStorage.removeItem('albums');
      onAlbumsChange([]);
      onClose();
      
      console.log('投稿作成成功:', result);
      alert(`投稿を作成しました！\nPost ID: ${result.id}`);
    } catch (error) {
      console.error('投稿作成エラー:', error);
      alert(`エラー: ${error instanceof Error ? error.message : '投稿の作成に失敗しました'}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleClose = () => {
    setIsEdit(false);
    setCheckedDeleteList([]);
    setFlashDelete(false);
    setFlashCreate(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="top-[50%] -translate-y-1/2 max-w-4xl max-h-[90vh] bg-card border-border overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-foreground text-2xl">選択したアルバム</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {albums.length} / 9 枚選択中
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {albums.length > 0 ? (
            <div className="grid grid-cols-3 gap-4 p-6">
              {albums.map((album, index) => (
                <div key={album.spotifyId} className="relative aspect-square group">
                  <div className="relative w-full h-full rounded-lg overflow-hidden bg-card border border-border">
                    <img
                      src={album.imageUrl}
                      alt={album.name}
                      className="w-full h-full object-cover"
                    />
                    {/* 編集モード時のチェックボックス */}
                    {isEdit && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-12 w-12 rounded-full ${
                            checkedDeleteList.some((a) => a.spotifyId === album.spotifyId)
                              ? 'bg-red-500 text-white'
                              : 'bg-white/20 text-white hover:bg-white/30'
                          }`}
                          onClick={() => {
                            if (checkedDeleteList.some((a) => a.spotifyId === album.spotifyId)) {
                              setCheckedDeleteList(
                                checkedDeleteList.filter((a) => a.spotifyId !== album.spotifyId)
                              );
                            } else {
                              setCheckedDeleteList([...checkedDeleteList, album]);
                            }
                          }}
                        >
                          <X className="h-6 w-6" />
                        </Button>
                      </div>
                    )}
                    {/* 番号表示 */}
                    {!isEdit && (
                      <div className="absolute top-2 left-2 bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </div>
                    )}
                  </div>
                  <p className="mt-2 text-xs font-semibold truncate">{album.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{album.artist}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-[400px] flex items-center justify-center">
              <div className="text-center">
                <Info className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground text-lg font-semibold">
                  ここに選んだアルバムが表示されます
                </p>
                <p className="text-muted-foreground text-sm mt-2">
                  検索結果からアルバムを選択してください
                </p>
              </div>
            </div>
          )}

          {/* 使い方説明 */}
          {isEdit && !flashDelete && albums.length > 0 && (
            <div className="text-center mt-4 mb-2">
              <p className="text-sm text-muted-foreground">
                <Info className="inline h-4 w-4 mr-1" />
                削除するアルバムを選択してください
              </p>
            </div>
          )}

          {/* エラーメッセージ */}
          {flashDelete && isEdit && (
            <div className="mt-4 mb-2 text-center">
              <div className="bg-destructive/20 border border-destructive text-destructive text-sm py-2 px-4 rounded-md inline-block">
                削除するアルバムを選択してください
              </div>
            </div>
          )}
          {flashCreate && !isEdit && (
            <div className="mt-4 mb-2 text-center">
              <div className="bg-destructive/20 border border-destructive text-destructive text-sm py-2 px-4 rounded-md inline-block">
                アルバムを9枚選択してください
              </div>
            </div>
          )}
        </div>

        {/* ボタン */}
        <div className="flex justify-center items-center gap-3 mt-6 mb-4 flex-shrink-0 border-t border-border pt-4">
          {albums.length > 0 && !isEdit && (
            <>
              <Button
                onClick={handleCreate}
                disabled={processing || albums.length !== 9}
                className="bg-green-600 hover:bg-green-700 text-white rounded-full px-6"
              >
                <Check className="h-4 w-4 mr-2" />
                作成
              </Button>
              <Button
                onClick={() => setIsEdit(true)}
                variant="outline"
                className="border-blue-500 text-blue-500 hover:bg-blue-500/10 rounded-full"
              >
                <Pencil className="h-4 w-4 mr-2" />
                編集
              </Button>
            </>
          )}
          {albums.length > 0 && isEdit && (
            <>
              <Button
                onClick={handleDelete}
                variant="outline"
                className="border-red-500 text-red-500 hover:bg-red-500/10 rounded-full"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                削除
              </Button>
              <Button
                onClick={() => setIsEdit(false)}
                variant="outline"
                className="border-blue-500 text-blue-500 hover:bg-blue-500/10 rounded-full"
              >
                <Pencil className="h-4 w-4 mr-2" />
                編集完了
              </Button>
            </>
          )}
          <Button
            onClick={handleClose}
            variant="outline"
            className="border-border text-foreground hover:bg-muted rounded-full"
          >
            閉じる
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
