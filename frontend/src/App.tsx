import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlbumGrid, type Album } from '@/components/AlbumGrid';
import { AlbumSearch } from '@/components/AlbumSearch';
import { createPost } from '@/lib/api';

function App() {
  const [albums, setAlbums] = useState<(Album | null)[]>(Array(9).fill(null));
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [userName, setUserName] = useState('');
  const [title, setTitle] = useState('');

  const handleAdd = (index: number) => {
    setSelectedIndex(index);
    setIsDialogOpen(true);
  };

  const handleRemove = (index: number) => {
    const newAlbums = [...albums];
    newAlbums[index] = null;
    setAlbums(newAlbums);
  };

  const handleSelect = (album: Album) => {
    if (selectedIndex !== null) {
      const newAlbums = [...albums];
      newAlbums[selectedIndex] = album;
      setAlbums(newAlbums);
      setIsDialogOpen(false);
      setSelectedIndex(null);
    }
  };

  const handleCreate = async () => {
    const selectedAlbums = albums.filter((album): album is Album => album !== null);
    
    if (selectedAlbums.length === 0) {
      alert('少なくとも1枚のアルバムを選択してください');
      return;
    }

    if (!userName.trim()) {
      alert('ユーザー名を入力してください');
      return;
    }

    try {
      const result = await createPost({
        userName: userName.trim(),
        title: title.trim() || undefined,
        albums: selectedAlbums,
      });
      
      console.log('投稿作成成功:', result);
      alert(`投稿を作成しました！\nPost ID: ${result.id}`);
      
      // リセット
      setAlbums(Array(9).fill(null));
      setUserName('');
      setTitle('');
    } catch (error) {
      console.error('投稿作成エラー:', error);
      alert(`エラー: ${error instanceof Error ? error.message : '投稿の作成に失敗しました'}`);
    }
  };

  const selectedCount = albums.filter(album => album !== null).length;
  const canCreate = selectedCount > 0 && userName.trim().length > 0;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-2">MyFavoriteAlbums</h1>
          <p className="text-muted-foreground">
            あなたの好きな9枚のアルバムを選んでシェアしましょう
          </p>
        </div>

        <div className="mb-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              ユーザー名 <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="あなたの名前"
              className="w-full px-3 py-2 border border-input rounded-md bg-background"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              タイトル（任意）
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例: 私を構成する9枚"
              className="w-full px-3 py-2 border border-input rounded-md bg-background"
            />
          </div>
        </div>

        <AlbumGrid
          albums={albums}
          onAdd={handleAdd}
          onRemove={handleRemove}
        />

        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            {selectedCount} / 9 枚選択中
          </p>
          <Button
            onClick={handleCreate}
            disabled={!canCreate}
            size="lg"
            className="min-w-32"
          >
            投稿を作成
          </Button>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>アルバムを検索</DialogTitle>
              <DialogDescription>
                Spotifyからアルバムを検索して選択してください
              </DialogDescription>
            </DialogHeader>
            <AlbumSearch onSelect={handleSelect} />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default App;
