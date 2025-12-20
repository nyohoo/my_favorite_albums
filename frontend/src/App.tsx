import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Hash, Plus } from 'lucide-react';

const HASHTAGS = [
  // 基本
  '#私を構成する9枚',
  
  // 時期・年代
  '#2025年のベストアルバム',
  '#最近ハマってる9枚',
  '#青春を支えてくれた9枚',
  
  // ジャンル（主要なものに絞る）
  '#私を構成する9枚のロック',
  '#私を構成する9枚のJ-POP',
  '#私を構成する9枚のHIP-HOP',
  '#私を構成する9枚のR&B',
  
  // 感情・シーン
  '#落ち込んだ時に聴く9枚',
  '#元気になりたい時に聴く9枚',
  '#ドライブで聴きたい9枚',
  
  // コミュニティ
  '#同じ趣味の人と繋がりたい',
  '#みんなに知ってほしい9枚',
];

function App() {
  const navigate = useNavigate();
  const [albums, setAlbums] = useState<(Album | null)[]>(Array(9).fill(null));
  const [isSearchDialogOpen, setIsSearchDialogOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [userName, setUserName] = useState('');
  const [selectedHashtag, setSelectedHashtag] = useState(HASHTAGS[0]);
  const [customHashtag, setCustomHashtag] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [hashtagList, setHashtagList] = useState<string[]>(HASHTAGS);

  // ローカルストレージからデータを取得
  useEffect(() => {
    // カスタムハッシュタグリストを読み込み
    const savedCustomHashtags = localStorage.getItem('customHashtags');
    if (savedCustomHashtags) {
      try {
        const parsed = JSON.parse(savedCustomHashtags);
        if (Array.isArray(parsed)) {
          setHashtagList(parsed);
        }
      } catch (e) {
        // エラー時はデフォルトを使用
      }
    }

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

    // ハッシュタグの決定（カスタムモードの場合はカスタムハッシュタグを使用）
    const finalHashtag = isCustomMode && customHashtag.trim() 
      ? customHashtag.trim().startsWith('#') 
        ? customHashtag.trim() 
        : `#${customHashtag.trim()}`
      : selectedHashtag;

    if (!finalHashtag || finalHashtag.trim() === '') {
      alert('タイトルを入力してください');
      return;
    }

    try {
      const result = await createPost({
        userName: userName.trim() || '', // 空欄の場合は空文字列を送信
        hashtag: finalHashtag,
        albums: selectedAlbums,
      });

      console.log('投稿作成成功:', result);

      // カスタムハッシュタグをリストに追加（まだ存在しない場合）
      if (isCustomMode && customHashtag.trim() && !hashtagList.includes(finalHashtag)) {
        const newHashtagList = [finalHashtag, ...hashtagList];
        setHashtagList(newHashtagList);
        // ローカルストレージにも保存
        localStorage.setItem('customHashtags', JSON.stringify(newHashtagList));
      }

      // リセット
      setAlbums(Array(9).fill(null));
      setUserName('');
      setCustomHashtag('');
      setIsCustomMode(false);
      setSelectedHashtag(HASHTAGS[0]);
      localStorage.removeItem('albums');

      // 詳細画面に遷移
      navigate(`/posts/${result.id}`);
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
            <label className="flex items-center gap-2 text-sm font-semibold mb-3 text-foreground">
              <Hash className="h-4 w-4 text-primary" />
              タイトル
            </label>
            <div className="space-y-3">
              {!isCustomMode ? (
                <>
                  <select
                    value={selectedHashtag}
                    onChange={(e) => handleHashtagChange(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 text-base"
                  >
                    {hashtagList.map((tag) => (
                      <option key={tag} value={tag}>
                        {tag}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setIsCustomMode(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-input rounded-lg bg-background text-foreground hover:border-primary hover:bg-accent/50 transition-all duration-200 text-sm font-medium"
                  >
                    <Plus className="h-4 w-4" />
                    カスタムタイトルを追加
                  </button>
                </>
              ) : (
                <>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customHashtag}
                      onChange={(e) => setCustomHashtag(e.target.value)}
                      placeholder="#カスタムタイトル"
                      className="flex-1 px-4 py-3 border-2 border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 text-base"
                    />
                    <Button
                      type="button"
                      onClick={() => {
                        setIsCustomMode(false);
                        setCustomHashtag('');
                      }}
                      variant="outline"
                      className="px-4"
                    >
                      キャンセル
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    # は自動で追加されます（入力しなくてもOK）
                  </p>
                </>
              )}
            </div>
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
          <DialogContent data-album-search-dialog="true" className="!top-4 !translate-y-0 sm:!top-[50%] sm:!-translate-y-1/2 !left-1/2 !-translate-x-1/2 max-w-[95vw] sm:max-w-2xl max-h-[80vh] sm:max-h-[85vh]">
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
