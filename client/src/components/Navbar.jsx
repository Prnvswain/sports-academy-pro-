import { Link } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';

export default function Navbar({ children, brandTo = '/' }) {
  return (
    <header className="border-border bg-surface/95 sticky top-0 z-50 border-b backdrop-blur transition-colors duration-200">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 lg:px-6">
        <Link
          to={brandTo}
          className="text-foreground flex select-none items-center gap-2.5 font-black tracking-tight no-underline hover:no-underline"
        >
          {/* Rebuilt Emerald Sports Accent Branding Identity Badge Container */}
          <span className="bg-accent text-foreground flex h-9 w-9 items-center justify-center rounded-xl text-xs font-black shadow-sm">
            SA
          </span>
          <span className="text-base uppercase tracking-tight lg:text-lg">
            SAMS<span className="text-accent">.</span>
          </span>
        </Link>
        <div className="flex items-center gap-2">{children}</div>
      </div>
    </header>
  );
}

export function NavbarActions({ children }) {
  return (
    <>
      <ThemeToggle />
      {children}
    </>
  );
}
