import { Link, useLocation } from 'react-router-dom';
import { Music, ArrowLeft } from 'lucide-react';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showBackButton?: boolean;
}

export function Header({ title, subtitle, showBackButton = false }: HeaderProps) {
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  const isPostsPage = location.pathname === '/posts';

  return (
    <header className="mb-6 sm:mb-8">
      {/* 上部: ロゴとナビゲーション */}
      <div className="flex items-center justify-between border-b border-border pb-4 sm:pb-6 mb-4 sm:mb-6">
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
          {showBackButton && (
            <>
              <Link
                to="/posts"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>一覧に戻る</span>
              </Link>
              <span className="text-muted-foreground/50">|</span>
            </>
          )}
          {!isPostsPage && !isHomePage && (
            <Link
              to="/posts"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              一覧
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

