import { Link } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';

export default function Navbar({ children, brandTo = '/' }) {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface/95 backdrop-blur transition-colors duration-200">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 lg:px-6">
        <Link 
          to={brandTo} 
          className="flex items-center gap-2.5 font-black text-foreground no-underline hover:no-underline select-none tracking-tight"
        >
          {/* Rebuilt Emerald Sports Accent Branding Identity Badge Container */}
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-xs font-black text-white shadow-sm">
            SA
          </span>
          <span className="tracking-tight uppercase text-base lg:text-lg">
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