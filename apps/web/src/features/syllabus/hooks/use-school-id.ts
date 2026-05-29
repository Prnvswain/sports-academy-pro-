'use client';

import { useAuthStore } from '@/store/auth-store';

/** Active tenant school id from the authenticated session. */
export function useSchoolId(): string | null {
  return useAuthStore((s) => s.user?.schoolId ?? null);
}
