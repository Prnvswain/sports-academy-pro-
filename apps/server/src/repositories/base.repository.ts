import type { Prisma } from '@school-syllabus/database';

export type TenantWhere = { schoolId: string };

export function withTenant<T extends Record<string, unknown>>(
  schoolId: string,
  where: T = {} as T,
): T & TenantWhere {
  return { ...where, schoolId };
}

export function softDeleteFilter(): { deletedAt: null } {
  return { deletedAt: null };
}

export interface PaginationParams {
  page: number;
  pageSize: number;
  skip: number;
}

export function getPagination(page = 1, pageSize = 10): PaginationParams {
  const safePage = Math.max(1, page);
  const safeSize = Math.min(Math.max(1, pageSize), 100);
  return {
    page: safePage,
    pageSize: safeSize,
    skip: (safePage - 1) * safeSize,
  };
}

export type PrismaTransaction = Prisma.TransactionClient;
