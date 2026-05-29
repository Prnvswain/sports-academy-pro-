import type { UserRole } from './enums.js';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  schoolId: string | null;
  sessionId: string;
  iat?: number;
  exp?: number;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  schoolId: string | null;
  avatar: string | null;
}

export interface LoginResponse {
  user: AuthUser;
  accessToken: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}
