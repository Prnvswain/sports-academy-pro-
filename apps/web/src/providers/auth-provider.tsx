'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { UserRole, type AuthUser } from '@school-syllabus/types';
import { api, setAccessTokenGetter } from '@/services/api-client';
import { useAuthStore } from '@/store/auth-store';

// FIXED: Added the landing page path '/' explicitly as a public route
const PUBLIC_PATHS = ['/', '/login', '/register', '/unauthorized', '/forbidden'];

const roleHome: Record<UserRole, string> = {
  [UserRole.SUPER_ADMIN]: '/super-admin',
  [UserRole.SCHOOL_ADMIN]: '/admin',
  [UserRole.TEACHER]: '/teacher',
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, accessToken, isAuthenticated, setAuth, clearAuth } = useAuthStore();

  useEffect(() => {
    setAccessTokenGetter(() => useAuthStore.getState().accessToken);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      try {
        const me = await api.get<AuthUser & { teacher?: unknown }>('/auth/me');
        if (!cancelled && me) {
          setAuth(
            {
              id: me.id,
              email: me.email,
              name: me.name,
              role: me.role,
              schoolId: me.schoolId,
              avatar: me.avatar,
            },
            useAuthStore.getState().accessToken || 'cookie-session',
          );
        }
      } catch {
        // FIXED: Replaced loose startsWith matching with strict checks to avoid masking protected sub-routes
        const isCurrentlyPublic = PUBLIC_PATHS.includes(pathname);
        if (!cancelled && !isCurrentlyPublic) {
          clearAuth();
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    hydrate();
    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!ready) return;

    // FIXED: Use exact inclusion check for the public paths array instead of loose prefix matching
    const isPublic = PUBLIC_PATHS.includes(pathname);

    if (!isAuthenticated && !isPublic) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    if (isAuthenticated && user && (pathname === '/login' || pathname === '/register')) {
      router.replace(roleHome[user.role] ?? '/admin');
    }
  }, [ready, isAuthenticated, user, pathname, router]);

  // FIXED: Keeps the loading spinner from completely overriding your public landing page presentation frame
  const isPublicRootOrAsset = PUBLIC_PATHS.includes(pathname);
  if (!ready && !isPublicRootOrAsset) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
