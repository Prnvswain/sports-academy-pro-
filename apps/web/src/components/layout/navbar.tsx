'use client';

import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth-store';
import { api } from '@/services/api-client';

export function Navbar({ title }: { title: string }) {
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      clearAuth();
      router.push('/login');
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6">
      {/* Left — workspace + page title */}
      <div className="flex items-center gap-3">
        <div>
          <p className="text-xs font-medium text-gray-400">Workspace</p>
          <h1 className="text-base font-semibold tracking-tight text-gray-800 sm:text-lg">
            {title}
          </h1>
        </div>
      </div>

      {/* Right — logout only */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleLogout}
        title="Logout"
        className="text-gray-400 hover:bg-gray-100 hover:text-gray-600"
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </header>
  );
}
