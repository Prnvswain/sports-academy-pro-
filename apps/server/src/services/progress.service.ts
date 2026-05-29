import { prisma } from '@school-syllabus/database';
import { AppError } from '../middleware/error-handler.js';
import { withTenant } from '../repositories/base.repository.js';
import {
  computeChapterStatus,
  computeCompletionPercentage,
  computeOverallProgress,
} from '../utils/chapter-progress.js';

export const progressService = {
  async updateChapterProgress(
    schoolId: string,
    teacherId: string,
    chapterId: string,
    userId: string,
    data: {
      teachingCompleted?: boolean;
      qaCompleted?: boolean;
      copyChecked?: boolean;
    },
  ) {
    const chapter = await prisma.chapter.findFirst({
      where: withTenant(schoolId, { id: chapterId }),
    });
    if (!chapter) throw new AppError('Chapter not found', 404);

    const existing = await prisma.chapterProgress.findUnique({
      where: {
        schoolId_chapterId_teacherId: { schoolId, chapterId, teacherId },
      },
    });

    const flags = {
      teachingCompleted: data.teachingCompleted ?? existing?.teachingCompleted ?? false,
      qaCompleted: data.qaCompleted ?? existing?.qaCompleted ?? false,
      copyChecked: data.copyChecked ?? existing?.copyChecked ?? false,
    };

    const chapterStatus = computeChapterStatus(flags);
    const completionPercentage = computeCompletionPercentage(flags);
    const completedAt = chapterStatus === 'COMPLETED' ? new Date() : null;

    return prisma.chapterProgress.upsert({
      where: {
        schoolId_chapterId_teacherId: { schoolId, chapterId, teacherId },
      },
      create: {
        schoolId,
        chapterId,
        teacherId,
        ...flags,
        chapterStatus,
        completionPercentage,
        completedAt,
        updatedById: userId,
      },
      update: {
        ...flags,
        chapterStatus,
        completionPercentage,
        completedAt,
        updatedById: userId,
      },
      include: { chapter: true },
    });
  },

  async getSchoolDashboardStats(schoolId: string) {
    const [totalTeachers, totalClasses, totalSubjects, totalChapters, completedChapters, totalTopics, completedTopics] =
      await Promise.all([
        prisma.teacher.count({ where: { schoolId, deletedAt: null } }),
        prisma.class.count({ where: { schoolId, deletedAt: null } }),
        prisma.subject.count({ where: { schoolId, deletedAt: null } }),
        prisma.chapter.count({ where: { schoolId, deletedAt: null } }),
        prisma.chapterProgress.count({
          where: { schoolId, chapterStatus: 'COMPLETED' },
        }),
        prisma.topic.count({ where: { schoolId, deletedAt: null } }),
        prisma.topicProgress.count({ where: { schoolId, status: 'COMPLETED' } }),
      ]);

    const pendingChapters = totalChapters - completedChapters;
    const chapterProgress = computeOverallProgress(completedChapters, totalChapters);
    const topicProgress = computeOverallProgress(completedTopics, totalTopics);

    return {
      totalTeachers,
      totalClasses,
      totalSubjects,
      totalChapters,
      completedChapters,
      pendingChapters: Math.max(0, pendingChapters),
      overallProgress: topicProgress || chapterProgress,
      totalTopics,
      completedTopics,
      pendingTopics: Math.max(0, totalTopics - completedTopics),
      topicProgress,
      chapterProgress,
    };
  },

  async getSuperAdminStats() {
    const [totalSchools, activeSchools, expiredSchools, totalTeachers, subscriptions] =
      await Promise.all([
        prisma.school.count({ where: { deletedAt: null } }),
        prisma.school.count({ where: { deletedAt: null, status: 'ACTIVE' } }),
        prisma.subscription.count({ where: { status: 'EXPIRED' } }),
        prisma.teacher.count({ where: { deletedAt: null } }),
        prisma.subscription.findMany({
          where: { status: 'ACTIVE' },
          include: { plan: true },
        }),
      ]);

    const monthlyRevenue = subscriptions.reduce(
      (sum, sub) => sum + Number(sub.plan.priceMonthly),
      0,
    );

    return { totalSchools, activeSchools, expiredSchools, monthlyRevenue, totalTeachers };
  },

  async getSubjectWiseProgress(schoolId: string) {
    const subjects = await prisma.subject.findMany({
      where: { schoolId, deletedAt: null },
      include: {
        _count: { select: { chapters: true } },
        chapters: {
          where: { deletedAt: null },
          select: { id: true },
        },
      },
    });

    const progressData = await Promise.all(
      subjects.map(async (subject) => {
        const chapterIds = subject.chapters.map((c) => c.id);
        const completed = await prisma.chapterProgress.count({
          where: {
            schoolId,
            chapterId: { in: chapterIds },
            chapterStatus: 'COMPLETED',
          },
        });
        return {
          name: subject.name,
          total: subject._count.chapters,
          completed,
          progress: computeOverallProgress(completed, subject._count.chapters),
        };
      }),
    );

    return progressData;
  },

  async updateTopicProgress(
    schoolId: string,
    teacherId: string,
    topicId: string,
    userId: string,
    status: 'PENDING' | 'COMPLETED',
  ) {
    const topic = await prisma.topic.findFirst({
      where: withTenant(schoolId, { id: topicId }),
    });
    if (!topic) throw new AppError('Topic not found', 404);

    return prisma.topicProgress.upsert({
      where: { schoolId_topicId_teacherId: { schoolId, topicId, teacherId } },
      create: {
        schoolId,
        topicId,
        teacherId,
        status,
        completedAt: status === 'COMPLETED' ? new Date() : null,
        updatedById: userId,
      },
      update: {
        status,
        completedAt: status === 'COMPLETED' ? new Date() : null,
        updatedById: userId,
      },
      include: { topic: true },
    });
  },

  async getTeacherTopicProgress(schoolId: string, teacherId: string) {
    const [totalTopics, completedTopics] = await Promise.all([
      prisma.topic.count({ where: { schoolId, deletedAt: null } }),
      prisma.topicProgress.count({
        where: { schoolId, teacherId, status: 'COMPLETED' },
      }),
    ]);

    return {
      totalTopics,
      completedTopics,
      progress: computeOverallProgress(completedTopics, totalTopics),
    };
  },

  async getTeacherWiseProgress(schoolId: string) {
    const teachers = await prisma.teacher.findMany({
      where: { schoolId, deletedAt: null },
      include: { user: { select: { name: true } } },
    });

    return Promise.all(
      teachers.map(async (t) => {
        const stats = await this.getTeacherTopicProgress(schoolId, t.id);
        return { name: t.user.name, ...stats };
      }),
    );
  },

  async getClassWiseProgress(schoolId: string) {
    const classes = await prisma.class.findMany({
      where: { schoolId, deletedAt: null },
      include: {
        subjects: {
          where: { deletedAt: null },
          include: {
            chapters: {
              where: { deletedAt: null },
              include: { topics: { where: { deletedAt: null } } },
            },
          },
        },
      },
    });

    return classes.map((cls) => {
      const allTopics = cls.subjects.flatMap((s) =>
        s.chapters.flatMap((c) => c.topics),
      );
      return {
        name: cls.name,
        total: allTopics.length,
        progress: 0,
      };
    });
  },
};
