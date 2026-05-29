'use client';

import { Moon, Sun, LogOut, Search, Download } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth-store';
import { useUiStore } from '@/store/ui-store';
import { api } from '@/services/api-client';

export function Navbar({ title }: { title: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const setCommandPaletteOpen = useUiStore((s) => s.setCommandPaletteOpen);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      clearAuth();
      router.push('/login');
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white/80 px-4 backdrop-blur-sm sm:px-6">
      <div className="flex items-center gap-3">
        <div className="hidden h-9 w-9 items-center justify-center rounded-xl bg-gray-100 ring-1 ring-gray-200 sm:flex">
          <div className="h-4 w-4 rounded bg-[linear-gradient(135deg,rgba(26,115,232,0.9),rgba(21,88,176,0.85),rgba(52,168,83,0.85))]" />
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500">Workspace</p>
          <h1 className="text-base font-semibold tracking-tight text-gray-800 sm:text-lg">{title}</h1>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCommandPaletteOpen(true)}
          className="border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-800"
        >
          <Search className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">Search</span>
          <kbd className="ml-2 hidden rounded border border-gray-200 bg-gray-50 px-1.5 text-xs text-gray-500 sm:inline">
            ⌘K
          </kbd>
        </Button>
        <Button variant="ghost" size="icon" title="Export" className="text-gray-500 hover:bg-gray-100">
          <Download className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => mounted && setTheme(theme === 'dark' ? 'light' : 'dark')}
          disabled={!mounted}
          aria-label="Toggle theme"
          className="text-gray-500 hover:bg-gray-100"
        >
          {mounted ? (
            <>
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </>
          ) : (
            <Sun className="h-4 w-4" />
          )}
        </Button>
        <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout" className="text-gray-500 hover:bg-gray-100">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
