import { Link, useLocation } from 'react-router-dom';
import { Music, ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';

interface HeaderProps {
  title?: string;
  subtitle?: string | ReactNode;
}

export function Header({ title, subtitle }: HeaderProps) {
  const location = useLocation();
  const isPostsPage = location.pathname === '/posts';

  return (
    <header className="mb-6 sm:mb-8">
      {/* 上部: ロゴとナビゲーション */}
      <div className="flex items-center justify-between border-b border-border/50 pb-3 sm:pb-4 mb-4 sm:mb-6">
        {/* ロゴ（左上） */}
        <Link
          to="/posts"
          className="inline-flex items-center gap-2 text-foreground hover:text-primary transition-colors group"
        >
          <Music className="h-5 w-5 sm:h-6 sm:w-6 text-primary group-hover:scale-110 transition-transform" />
          <span className="text-lg sm:text-xl font-bold" style={{ fontWeight: 700 }}>
            MyFavoriteAlbums
          </span>
        </Link>

        {/* ナビゲーション（右上） */}
        <nav className="flex items-center gap-3 sm:gap-4">
          {!isPostsPage && (
            <Link
              to="/posts"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all duration-200 group"
            >
              <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
              <span>一覧に戻る</span>
            </Link>
          )}
        </nav>
      </div>

      {/* タイトルとサブタイトル（中央） */}
      {(title || subtitle) && (
        <div className="text-center">
          {title && (
            <h1 className="text-2xl sm:text-3xl font-bold mb-2" style={{ fontWeight: 700 }}>
              {title}
            </h1>
          )}
          {subtitle && (
            <div className="text-sm sm:text-base text-muted-foreground">
              {subtitle}
            </div>
          )}
        </div>
      )}
    </header>
  );
}

