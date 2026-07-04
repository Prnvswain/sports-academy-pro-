import { Link } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';

export default function Navbar({ children, brandTo = '/' }) {
  return (
    <header className="bg-background/80 backdrop-blur-xl border-b border-border/40 sticky top-0 z-50 transition-all duration-300 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 lg:px-8">
        <Link
          to={brandTo}
          className="group text-foreground flex select-none items-center gap-3 font-black tracking-tight no-underline outline-none rounded-lg focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          {/* Rebuilt Emerald Sports Accent Branding Identity Badge Container */}
          <span className="bg-primary/10 text-primary border border-primary/20 flex h-9 w-9 items-center justify-center rounded-xl text-[11px] font-extrabold shadow-sm transition-all duration-300 group-hover:scale-105 group-hover:bg-primary/15 group-hover:shadow-md">
            SA
          </span>
          <span className="text-base uppercase tracking-wider text-foreground/90 transition-colors duration-300 group-hover:text-foreground lg:text-lg">
            SAMS<span className="text-primary font-black">.</span>
          </span>
        </Link>
        <div className="flex items-center gap-3">{children}</div>
      </div>
    </header>
  );
}

export function NavbarActions({ children }) {
  return (
    <>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        {/* Optional elegant divider if there are additional children actions */}
        {children && <div className="h-5 w-px bg-border/60 mx-1 hidden sm:block"></div>}
        {children}
      </div>
    </>
  );
}