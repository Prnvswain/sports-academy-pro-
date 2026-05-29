import type { JwtPayload } from '@school-syllabus/types';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      schoolId?: string | null;
    }
  }
}

export {};
