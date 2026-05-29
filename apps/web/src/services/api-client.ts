import type { PaginatedResponse } from '@school-syllabus/types';
import { env } from '@/config/env';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | undefined>;
  skipAuth?: boolean;
}

let accessTokenGetter: () => string | null = () => null;

export function setAccessTokenGetter(getter: () => string | null) {
  accessTokenGetter = getter;
}

async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await fetch(`${env.apiUrl}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    if (res.ok && data.success && data.data?.accessToken) {
      return data.data.accessToken as string;
    }
  } catch {
    // ignore
  }
  return null;
}

async function request<T>(endpoint: string, options: RequestOptions = {}, retried = false): Promise<T> {
  const { params, skipAuth, ...init } = options;
  const url = new URL(`${env.apiUrl}${endpoint}`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) url.searchParams.set(key, String(value));
    });
  }

  const token = skipAuth ? null : accessTokenGetter();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(url.toString(), {
    ...init,
    credentials: 'include',
    headers,
  });

  const data = await response.json();

  if (response.status === 401 && !retried && !skipAuth && !endpoint.includes('/auth/')) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      const { useAuthStore } = await import('@/store/auth-store');
      const user = useAuthStore.getState().user;
      if (user) useAuthStore.getState().setAuth(user, newToken);
      return request<T>(endpoint, options, true);
    }
  }

  if (!response.ok || !data.success) {
    throw new ApiError(data.error ?? 'Request failed', response.status);
  }

  return data.data as T;
}

export const api = {
  get: <T>(endpoint: string, params?: Record<string, string | number | undefined>) =>
    request<T>(endpoint, { method: 'GET', params }),

  getPaginated: <T>(endpoint: string, params?: Record<string, string | number | undefined>) =>
    request<PaginatedResponse<T>>(endpoint, { method: 'GET', params }),

  post: <T>(endpoint: string, body?: unknown, skipAuth?: boolean) =>
    request<T>(endpoint, { method: 'POST', body: JSON.stringify(body), skipAuth }),

  patch: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, { method: 'PATCH', body: JSON.stringify(body) }),

  delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
};
