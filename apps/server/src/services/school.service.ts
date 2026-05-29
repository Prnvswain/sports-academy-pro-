import { prisma, SchoolStatus } from '@school-syllabus/database';
import { AppError } from '../middleware/error-handler.js';
import { getPagination, softDeleteFilter } from '../repositories/base.repository.js';
import { withTenant } from '../repositories/base.repository.js';
export const schoolService = {
  async list(params: { page: number; pageSize: number; search?: string; status?: string }) {
    const { skip, page, pageSize } = getPagination(params.page, params.pageSize);
    const where = {
      ...softDeleteFilter(),
      ...(params.status && { status: params.status as SchoolStatus }),
      ...(params.search && {
        OR: [
          { name: { contains: params.search } },
          { email: { contains: params.search } },
          { slug: { contains: params.search } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      prisma.school.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { teachers: true, users: true } },
          subscriptions: {
            where: { status: 'ACTIVE' },
            take: 1,
            include: { plan: true },
          },
        },
      }),
      prisma.school.count({ where }),
    ]);

    return { items, total, page, pageSize };
  },

  async getById(id: string) {
    const school = await prisma.school.findFirst({
      where: { id, ...softDeleteFilter() },
      include: {
        subscriptions: { include: { plan: true }, orderBy: { createdAt: 'desc' }, take: 1 },
        _count: { select: { teachers: true, classes: true, subjects: true } },
      },
    });
    if (!school) throw new AppError('School not found', 404);
    return school;
  },

  async create(data: {
    name: string;
    email: string;
    phone?: string;
    address?: string;
    planId?: string;
  }) {
    const slug = `${data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`;
    return prisma.$transaction(async (tx) => {
      const school = await tx.school.create({
        data: {
          name: data.name,
          slug,
          email: data.email,
          phone: data.phone,
          address: data.address,
        },
      });

      if (data.planId) {
        await tx.subscription.create({
          data: {
            schoolId: school.id,
            planId: data.planId,
            status: 'ACTIVE',
            startDate: new Date(),
            endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          },
        });
      }

      return school;
    });
  },

  async update(
    id: string,
    data: { name?: string; email?: string; phone?: string; address?: string; logo?: string },
  ) {
    await this.getById(id);
    return prisma.school.update({ where: { id }, data });
  },

  async updateStatus(id: string, status: SchoolStatus) {
    const school = await this.getById(id);
    return prisma.school.update({
      where: { id: school.id },
      data: { status },
    });
  },

  async softDelete(id: string) {
    await this.getById(id);
    return prisma.school.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'INACTIVE' },
    });
  },
  async getClassDetails(schoolId: string, id: string, teacherId?: string) {
  console.log('[getClassDetails]', { schoolId, id, teacherId });

  const classItem = await prisma.class.findFirst({
    where: withTenant(schoolId, {
      id,
      ...softDeleteFilter(),
    }),
    include: {
      subjects: {
        where: softDeleteFilter(),
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        include: {
          chapters: {
            where: softDeleteFilter(),
            orderBy: [{ sortOrder: 'asc' }],
            include: {
              topics: {
                where: softDeleteFilter(),
                orderBy: [{ sortOrder: 'asc' }],
              },

              chapterProgress: teacherId
                ? {
                    where: { teacherId },
                  }
                : false,
            },
          },

          _count: {
            select: {
              chapters: true,
            },
          },
        },
      },
    },
  });

  if (!classItem) {
    throw new AppError('Class not found', 404);
  }

  const chapters = await prisma.chapter.findMany({
    where: withTenant(schoolId, {
      classId: id,
      ...softDeleteFilter(),
    }),
    select: {
      id: true,
      subjectId: true,
      chapterProgress: {
        where: {
          chapterStatus: 'COMPLETED',
        },
        select: {
          chapterStatus: true,
        },
      },
    },
  });

  const subjectProgressMap = new Map<
    string,
    { total: number; completed: number }
  >();

  let completedChapters = 0;

  for (const chapter of chapters) {
    const current = subjectProgressMap.get(chapter.subjectId) ?? {
      total: 0,
      completed: 0,
    };

    current.total += 1;

    if (chapter.chapterProgress.length > 0) {
      current.completed += 1;
      completedChapters += 1;
    }

    subjectProgressMap.set(chapter.subjectId, current);
  }

  const subjectDetails = classItem.subjects.map((subject) => {
    const progress = subjectProgressMap.get(subject.id);

    const totalChapters = progress?.total ?? 0;
    const completed = progress?.completed ?? 0;

    return {
      ...subject,
      totalChapters,
      completedChapters: completed,
      progressPercentage:
        totalChapters > 0
          ? Math.round((completed / totalChapters) * 100)
          : 0,
    };
  });

  const overallProgress =
    chapters.length > 0
      ? Math.round((completedChapters / chapters.length) * 100)
      : 0;

  return {
    ...classItem,
    subjects: subjectDetails,
    overallProgress,
    totalChapters: chapters.length,
    completedChapters,
  };
},
};
