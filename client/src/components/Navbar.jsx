import { Link } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';

export default function Navbar({ children, brandTo = '/' }) {
  return (
    <header className="sticky top-0 z-30 w-full border-b-2 border-slate-200/80 bg-slate-100/90 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/90 transition-colors">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          to={brandTo}
          className="group flex select-none items-center gap-3 outline-none"
        >
          {/* Logo Image - Put your image in the public folder as logo.png */}
          <img 
            src="/logo.png" 
            alt="Academy Logo" 
            className="h-10 w-10 object-contain transition-all duration-300 group-hover:scale-105"
          />
          
          {/* Sports Academy Pro Text Layout */}
          <div className="flex flex-col items-center justify-center -space-y-1 pt-1">
            <span className="text-[13px] sm:text-base font-black italic uppercase tracking-wide text-slate-800 transition-colors duration-300 group-hover:text-slate-600 dark:text-white dark:group-hover:text-slate-300 leading-none">
              SPORTS ACADEMY
            </span>
            <span className="text-[11px] sm:text-[13px] font-black italic uppercase tracking-widest text-lime-500 leading-none drop-shadow-sm">
              PRO
            </span>
          </div>
        </Link>
        
        <div className="flex items-center gap-4 sm:gap-6">
          {children}
        </div>
      </div>
    </header>
  );
}

export function NavbarActions({ children }) {
  return (
    <div className="flex items-center gap-4">
      <ThemeToggle />
      
      {/* Sharp slate divider */}
      {children && (
        <div className="hidden h-5 w-[2px] bg-slate-300 dark:bg-slate-700 sm:block"></div>
      )}
      
      {children}
    </div>
  );
}