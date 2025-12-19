import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/Header';
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

const HASHTAGS = [
  '#私を構成する9枚',
  '#2023上半期ベストアルバム',
  '#邦ロック好きな人と繋がりたい',
  '#私を構成する9枚のロックアルバム',
  '#私を構成する9枚の邦ロック',
  '#私を構成する9枚のJ-POP',
  '#私を構成する9枚のHIP-HOP',
  '#私を構成する9枚のR&B',
  '#私を構成する9枚のデスメタル',
  '#私を構成する9枚のインディーロック',
  '#私を構成する9枚の電子音楽',
  '#私を構成する9枚のアニソン',
  '#私を構成するアイドル',
];

function App() {
  const [albums, setAlbums] = useState<(Album | null)[]>(Array(9).fill(null));
  const [isSearchDialogOpen, setIsSearchDialogOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [userName, setUserName] = useState('');
  const [title, setTitle] = useState('');
  const [selectedHashtag, setSelectedHashtag] = useState(HASHTAGS[0]);

  // ローカルストレージからデータを取得
  useEffect(() => {
    const savedAlbums = localStorage.getItem('albums');
    if (savedAlbums) {
      try {
        const parsed = JSON.parse(savedAlbums);
        if (parsed.hashtag) {
          setSelectedHashtag(parsed.hashtag);
        }
        if (parsed.albums && Array.isArray(parsed.albums)) {
          // 9個のスロットに配置（位置情報を保持）
          const newAlbums: (Album | null)[] = Array(9).fill(null);
          // 保存されたデータに位置情報が含まれている場合はそれを使用
          if (parsed.albumsWithPositions && Array.isArray(parsed.albumsWithPositions)) {
            // 位置情報付きで保存されている場合
            parsed.albumsWithPositions.forEach((item: { album: Album; position: number }) => {
              if (item.position >= 0 && item.position < 9) {
                newAlbums[item.position] = item.album;
              }
            });
          } else {
            // 旧形式のデータ（位置情報なし）の場合は、詰めて配置
            parsed.albums.forEach((album: Album, index: number) => {
              if (index < 9) {
                newAlbums[index] = album;
              }
            });
          }
          setAlbums(newAlbums);
        }
      } catch (e) {
        // エラー時はデフォルトを使用
      }
    }
  }, []);

  const handleAdd = (index: number) => {
    setSelectedIndex(index);
    setIsSearchDialogOpen(true);
  };

  const handleReplace = (index: number) => {
    setSelectedIndex(index);
    setIsSearchDialogOpen(true);
  };

  const handleRemove = (index: number) => {
    const newAlbums = [...albums];
    newAlbums[index] = null;
    setAlbums(newAlbums);
    saveToLocalStorage(newAlbums);
  };

  const handleReorder = (fromIndex: number, toIndex: number) => {
    const newAlbums = [...albums];
    const movedAlbum = newAlbums[fromIndex];
    
    if (!movedAlbum) {
      return; // 移動するアルバムがない場合は何もしない
    }
    
    // 空のスロットにドロップした場合
    if (newAlbums[toIndex] === null) {
      // 元の位置をnullにし、新しい位置に配置
      newAlbums[fromIndex] = null;
      newAlbums[toIndex] = movedAlbum;
    } else {
      // 既存のアルバムがあるスロットにドロップした場合は入れ替え
      const targetAlbum = newAlbums[toIndex];
      newAlbums[fromIndex] = targetAlbum;
      newAlbums[toIndex] = movedAlbum;
    }
    
    setAlbums(newAlbums);
    saveToLocalStorage(newAlbums);
  };

  const handleSelect = (album: Album) => {
    if (selectedIndex !== null) {
      const newAlbums = [...albums];
      newAlbums[selectedIndex] = album;
      setAlbums(newAlbums);
      saveToLocalStorage(newAlbums);
      setIsSearchDialogOpen(false);
      setSelectedIndex(null);
    }
  };

  const saveToLocalStorage = (albumsToSave: (Album | null)[]) => {
    // 位置情報を保持して保存
    const albumsWithPositions = albumsToSave
      .map((album, index) => ({ album, position: index }))
      .filter((item): item is { album: Album; position: number } => item.album !== null);
    
    // 後方互換性のため、旧形式も保存
    const selectedAlbums = albumsToSave.filter((album): album is Album => album !== null);
    
    localStorage.setItem(
      'albums',
      JSON.stringify({
        albums: selectedAlbums, // 旧形式（後方互換性のため）
        albumsWithPositions, // 新形式（位置情報付き）
        hashtag: selectedHashtag,
      })
    );
  };

  const handleHashtagChange = (hashtag: string) => {
    setSelectedHashtag(hashtag);
    const selectedAlbums = albums.filter((album): album is Album => album !== null);
    localStorage.setItem(
      'albums',
      JSON.stringify({
        albums: selectedAlbums,
        hashtag,
      })
    );
  };

  const handleCreate = async () => {
    const selectedAlbums = albums.filter((album): album is Album => album !== null);

    if (selectedAlbums.length === 0) {
      alert('少なくとも1枚のアルバムを選択してください');
      return;
    }

    try {
      const result = await createPost({
        userName: userName.trim() || '', // 空欄の場合は空文字列を送信
        title: title.trim() || selectedHashtag,
        albums: selectedAlbums,
      });

      console.log('投稿作成成功:', result);
      alert(`投稿を作成しました！\nPost ID: ${result.id}`);

      // リセット
      setAlbums(Array(9).fill(null));
      setUserName('');
      setTitle('');
      localStorage.removeItem('albums');
    } catch (error) {
      console.error('投稿作成エラー:', error);
      alert(`エラー: ${error instanceof Error ? error.message : '投稿の作成に失敗しました'}`);
    }
  };

  const selectedCount = albums.filter((album): album is Album => album !== null).length;
  const canCreate = selectedCount > 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-4xl">
        {/* ヘッダー */}
        <Header
          subtitle="あなたの好きな9枚のアルバムを選んでシェアしましょう"
        />

        {/* 入力フィールド */}
        <div className="mb-6 sm:mb-8 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              ユーザー名（任意）
            </label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="あなたの名前（任意）"
              className="w-full px-3 py-2 sm:px-4 sm:py-2.5 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
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
              className="w-full px-3 py-2 sm:px-4 sm:py-2.5 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              ハッシュタグ
            </label>
            <select
              value={selectedHashtag}
              onChange={(e) => handleHashtagChange(e.target.value)}
              className="w-full px-3 py-2 sm:px-4 sm:py-2.5 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            >
              {HASHTAGS.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* アルバムグリッド */}
        <AlbumGrid
          albums={albums}
          onAdd={handleAdd}
          onRemove={handleRemove}
          onReplace={handleReplace}
          onReorder={handleReorder}
        />

        {/* 作成ボタン */}
        <div className="mt-6 sm:mt-8 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            {selectedCount} / 9 枚選択中
          </p>
          <Button
            onClick={handleCreate}
            disabled={!canCreate}
            size="lg"
            className="min-w-32 bg-primary hover:bg-primary/90 text-white rounded-full px-8"
          >
            投稿を作成
          </Button>
        </div>

        {/* 検索ダイアログ */}
        <Dialog open={isSearchDialogOpen} onOpenChange={setIsSearchDialogOpen}>
          <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[80vh] sm:max-h-[85vh] mx-2 sm:mx-0">
            <DialogHeader>
              <DialogTitle>アルバムを検索</DialogTitle>
              <DialogDescription>
                Spotifyからアルバムを検索して選択してください
              </DialogDescription>
            </DialogHeader>
            <AlbumSearch
              isOpen={isSearchDialogOpen}
              onSelect={handleSelect}
              onClose={() => {
                setIsSearchDialogOpen(false);
                setSelectedIndex(null);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default App;
