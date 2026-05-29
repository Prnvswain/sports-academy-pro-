import { prisma } from '@school-syllabus/database';
import { AppError } from '../middleware/error-handler.js';
import { getPagination, softDeleteFilter, withTenant } from '../repositories/base.repository.js';

export const syllabusService = {
  // Classes
  async listClasses(
    schoolId: string,
    params: { page: number; pageSize: number; search?: string },
    teacherId?: string,
  ) {
    const { skip, page, pageSize } = getPagination(params.page, params.pageSize);
    const where = withTenant(schoolId, {
      ...softDeleteFilter(),
      ...(params.search && { name: { contains: params.search } }),
      ...(teacherId && { teacherClasses: { some: { teacherId } } }),
    });

    const [items, total] = await Promise.all([
      prisma.class.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        include: { _count: { select: { subjects: true } } },
      }),
      prisma.class.count({ where }),
    ]);

    if (!teacherId || items.length === 0) {
      return { items, total, page, pageSize };
    }

    const classIds = items.map((cls) => cls.id);
    const chapters = await prisma.chapter.findMany({
      where: withTenant(schoolId, { classId: { in: classIds }, ...softDeleteFilter() }),
      select: { id: true, classId: true },
    });
    const chapterIds = chapters.map((chapter) => chapter.id);
    const completedProgress = await prisma.chapterProgress.findMany({
      where: {
        schoolId,
        teacherId,
        chapterId: { in: chapterIds },
        chapterStatus: 'COMPLETED',
      },
      select: { chapterId: true },
    });
    const completedSet = new Set(completedProgress.map((item) => item.chapterId));

    const chapterCountByClass = chapters.reduce<Record<string, number>>((acc, chapter) => {
      acc[chapter.classId] = (acc[chapter.classId] || 0) + 1;
      return acc;
    }, {});

    const completedCountByClass = chapters.reduce<Record<string, number>>((acc, chapter) => {
      if (completedSet.has(chapter.id)) {
        acc[chapter.classId] = (acc[chapter.classId] || 0) + 1;
      }
      return acc;
    }, {});

    return {
      items: items.map((cls) => ({
        ...cls,
        totalChapters: chapterCountByClass[cls.id] ?? 0,
        completedChapters: completedCountByClass[cls.id] ?? 0,
        progress:
          (chapterCountByClass[cls.id] ?? 0) > 0
            ? Math.round(
                ((completedCountByClass[cls.id] ?? 0) / (chapterCountByClass[cls.id] ?? 1)) * 100,
              )
            : 0,
      })),
      total,
      page,
      pageSize,
    };
  },

  async listAssignedClasses(
    schoolId: string,
    teacherId: string,
    params: { page: number; pageSize: number; search?: string },
  ) {
    return this.listClasses(schoolId, params, teacherId);
  },

  async createClass(
    schoolId: string,
    data: { name: string; grade?: string; section?: string; description?: string; subjects?: string[] },
  ) {
    return prisma.class.create({
      data: {
        schoolId,
        name: data.name,
        grade: data.grade,
        section: data.section,
        description: data.description,
        subjects: data.subjects?.length
          ? {
              create: data.subjects.map((name, index) => ({
                schoolId,
                name,
                sortOrder: index + 1,
              })),
            }
          : undefined,
      },
      include: {
        subjects: {
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        },
      },
    });
  },

  async getClassDetails(schoolId: string, id: string, teacherId?: string) {
    console.log('[syllabusService.getClassDetails]', { schoolId, id, teacherId: teacherId ?? null });

    const classItem = await prisma.class.findFirst({
      where: withTenant(schoolId, { id, ...softDeleteFilter() }),
      include: {
        subjects: {
          where: {
            ...softDeleteFilter(),
            // ✅ If teacher: only subjects assigned to this teacher
            ...(teacherId && {
              teacherClasses: { some: { teacherId } },
            }),
          },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          include: {
            chapters: {
              where: softDeleteFilter(),
              orderBy: [{ sortOrder: 'asc' }],
              include: {
                // ✅ No topics included — removed
                chapterProgress: teacherId
                  ? {
                      where: { teacherId },
                      select: {
                        teachingCompleted: true,
                        qaCompleted: true,
                        copyChecked: true,
                        chapterStatus: true,
                        completionPercentage: true,
                      },
                    }
                  : false,
              },
            },
            teacherClasses: {
              include: {
                teacher: { include: { user: true } },
              },
            },
            _count: { select: { chapters: true } },
          },
        },
        teacherClasses: {
          include: {
            teacher: { include: { user: true } },
            subject: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!classItem) {
      console.log('[syllabusService.getClassDetails] class not found', { schoolId, id, teacherId });
      throw new AppError('Class not found', 404);
    }

    const chapters = await prisma.chapter.findMany({
      where: withTenant(schoolId, {
        classId: id,
        ...softDeleteFilter(),
        // ✅ If teacher: only chapters in their assigned subjects
        ...(teacherId && {
          subject: { teacherClasses: { some: { teacherId } } },
        }),
      }),
      select: {
        id: true,
        subjectId: true,
        chapterProgress: {
          where: { chapterStatus: 'COMPLETED' },
          select: { chapterStatus: true },
        },
      },
    });

    const subjectProgressMap = new Map<string, { total: number; completed: number }>();
    let completedChapters = 0;

    for (const chapter of chapters) {
      const current = subjectProgressMap.get(chapter.subjectId) ?? { total: 0, completed: 0 };
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
      const teachers = subject.teacherClasses
        .map((tc) => tc.teacher)
        .filter((t) => t.deletedAt === null);
      const { teacherClasses: _teacherClasses, ...subjectRest } = subject;

      // ✅ Strip topics out of chapters before returning
      const chaptersWithoutTopics = subjectRest.chapters.map(({ ...chapter }) => chapter);

      return {
        ...subjectRest,
        chapters: chaptersWithoutTopics,
        teachers,
        totalChapters,
        completedChapters: completed,
        progressPercentage: totalChapters > 0 ? Math.round((completed / totalChapters) * 100) : 0,
      };
    });

    const overallProgress =
      chapters.length > 0 ? Math.round((completedChapters / chapters.length) * 100) : 0;

    return {
      ...classItem,
      subjects: subjectDetails,
      assignedTeachers: classItem.teacherClasses
        .filter((a) => a.subject !== null)
        .map((a) => ({
          id: a.teacher.id,
          name: a.teacher.user.name,
          email: a.teacher.user.email,
          subject: a.subject?.name ?? null,
        })),
      overallProgress,
      totalChapters: chapters.length,
      completedChapters,
    };
  },

  async updateClass(schoolId: string, id: string, data: Record<string, unknown>) {
    const item = await prisma.class.findFirst({ where: withTenant(schoolId, { id, ...softDeleteFilter() }) });
    if (!item) throw new AppError('Class not found', 404);
    return prisma.class.update({ where: { id }, data });
  },

  async updateSubject(schoolId: string, id: string, data: Record<string, unknown>) {
    const item = await prisma.subject.findFirst({ where: withTenant(schoolId, { id, ...softDeleteFilter() }) });
    if (!item) throw new AppError('Subject not found', 404);

    const updateData = Object.keys(data).reduce<Record<string, unknown>>((acc, key) => {
      if (data[key] !== undefined) acc[key] = data[key];
      return acc;
    }, {});

    if (Object.keys(updateData).length === 0) throw new AppError('At least one field is required', 400);

    return prisma.subject.update({ where: { id }, data: updateData });
  },

  async deleteSubject(schoolId: string, subjectId: string) {
    await prisma.topic.deleteMany({
      where: { chapter: { subjectId, schoolId } },
    });
    await prisma.chapter.deleteMany({ where: { subjectId, schoolId } });
    return prisma.subject.delete({ where: { id: subjectId, schoolId } });
  },

  async deleteTopic(schoolId: string, topicId: string) {
    return prisma.topic.delete({ where: { id: topicId, schoolId } });
  },

  async updateChapter(schoolId: string, id: string, data: Record<string, unknown>) {
    const item = await prisma.chapter.findFirst({ where: withTenant(schoolId, { id, ...softDeleteFilter() }) });
    if (!item) throw new AppError('Chapter not found', 404);
    return prisma.chapter.update({ where: { id }, data });
  },

  async updateTopic(schoolId: string, id: string, data: Record<string, unknown>) {
    const item = await prisma.topic.findFirst({ where: withTenant(schoolId, { id, ...softDeleteFilter() }) });
    if (!item) throw new AppError('Topic not found', 404);
    return prisma.topic.update({ where: { id }, data });
  },

  async deleteChapter(schoolId: string, id: string) {
    const item = await prisma.chapter.findFirst({ where: withTenant(schoolId, { id }) });
    if (!item) throw new AppError('Chapter not found', 404);
    return prisma.chapter.update({ where: { id }, data: { deletedAt: new Date() } });
  },

  async deleteClass(schoolId: string, id: string) {
    const item = await prisma.class.findFirst({ where: withTenant(schoolId, { id }) });
    if (!item) throw new AppError('Class not found', 404);
    return prisma.class.update({ where: { id }, data: { deletedAt: new Date() } });
  },

  // Subjects
  async listSubjects(schoolId: string, classId?: string) {
    return prisma.subject.findMany({
      where: withTenant(schoolId, {
        ...softDeleteFilter(),
        ...(classId && { classId }),
      }),
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        class: true,
        _count: { select: { chapters: true, teacherClasses: true } },
      },
    });
  },

  async createSubject(
    schoolId: string,
    data: { classId?: string; name: string; code?: string; description?: string; color?: string },
  ) {
    return prisma.subject.create({
      data: {
        schoolId,
        name: data.name,
        code: data.code,
        description: data.description,
        color: data.color,
        ...(data.classId ? { classId: data.classId } : {}),
      },
    });
  },

  // Chapters
  async listChapters(schoolId: string, subjectId?: string, teacherId?: string) {
    return prisma.chapter.findMany({
      where: withTenant(schoolId, {
        ...softDeleteFilter(),
        ...(subjectId && { subjectId }),
        ...(teacherId && {
          subject: { teacherClasses: { some: { teacherId } } },
        }),
      }),
      orderBy: [{ sortOrder: 'asc' }],
      include: {
        topics: {
          where: softDeleteFilter(),
          orderBy: { sortOrder: 'asc' },
          include: teacherId ? { topicProgress: { where: { teacherId } } } : undefined,
        },
        subject: true,
        class: true,
        chapterProgress: teacherId ? { where: { teacherId } } : false,
      },
    });
  },

  async createChapter(
    schoolId: string,
    data: { subjectId: string; classId: string; title: string; description?: string; notes?: string },
  ) {
    const maxOrder = await prisma.chapter.aggregate({
      where: { schoolId, subjectId: data.subjectId },
      _max: { sortOrder: true },
    });
    return prisma.chapter.create({
      data: { schoolId, ...data, sortOrder: (maxOrder._max.sortOrder ?? 0) + 1 },
    });
  },

  // Topics
  async createTopic(
    schoolId: string,
    data: { chapterId: string; title: string; description?: string; notes?: string },
  ) {
    const chapter = await prisma.chapter.findFirst({
      where: withTenant(schoolId, { id: data.chapterId }),
    });
    if (!chapter) throw new AppError('Chapter not found', 404);

    const maxOrder = await prisma.topic.aggregate({
      where: { chapterId: data.chapterId },
      _max: { sortOrder: true },
    });
    return prisma.topic.create({
      data: { schoolId, ...data, sortOrder: (maxOrder._max.sortOrder ?? 0) + 1 },
    });
  },

  async getTree(schoolId: string) {
    const classes = await prisma.class.findMany({
      where: withTenant(schoolId, softDeleteFilter()),
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        subjects: {
          where: softDeleteFilter(),
          orderBy: [{ sortOrder: 'asc' }],
          include: {
            chapters: {
              where: softDeleteFilter(),
              orderBy: [{ sortOrder: 'asc' }],
              include: {
                topics: { where: softDeleteFilter(), orderBy: [{ sortOrder: 'asc' }] },
              },
            },
          },
        },
      },
    });
    return classes;
  },

  async listTopics(schoolId: string, chapterId: string) {
    return prisma.topic.findMany({
      where: withTenant(schoolId, { chapterId, ...softDeleteFilter() }),
      orderBy: [{ sortOrder: 'asc' }],
    });
  },

  async reorderChapters(schoolId: string, orderedIds: string[]) {
    await Promise.all(
      orderedIds.map((id, index) =>
        prisma.chapter.updateMany({
          where: withTenant(schoolId, { id }),
          data: { sortOrder: index + 1 },
        }),
      ),
    );
  },
};