import { prisma } from '@school-syllabus/database';
import { AppError } from '../middleware/error-handler.js';
import { getPagination, softDeleteFilter, withTenant } from '../repositories/base.repository.js';
import { hashPassword } from '../utils/password.js';
import { authService } from './auth.service.js';
import { sendTeacherCredentialsEmail } from '../emails/teacher-credentials.js';

export const teacherService = {
  async list(
    schoolId: string,
    params: {
      page: number;
      pageSize: number;
      search?: string;
      classId?: string;
      subjectId?: string;
    },
  ) {
    const { skip, page, pageSize } = getPagination(params.page, params.pageSize);

    const where = withTenant(schoolId, {
      ...softDeleteFilter(),
      ...(params.classId && { teacherClasses: { some: { classId: params.classId } } }),
      ...(params.subjectId && { teacherClasses: { some: { subjectId: params.subjectId } } }),
      ...(params.search && {
        user: {
          OR: [{ name: { contains: params.search } }, { email: { contains: params.search } }],
        },
      }),
    });

    const [items, total] = await Promise.all([
      prisma.teacher.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          user: {
            select: { id: true, name: true, email: true, phone: true, avatar: true, status: true },
          },
          teacherClasses: {
            include: {
              class: { select: { id: true, name: true, grade: true, section: true } },
              subject: { select: { id: true, name: true, classId: true } },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.teacher.count({ where }),
    ]);

    return { items, total, page, pageSize };
  },

  async create(
    schoolId: string,
    data: {
      name: string;
      email: string;
      phone?: string;
      classIds?: string[];
      assignments?: { classId: string; subjectId: string }[];
    },
  ) {
    const email = data.email.toLowerCase();

    const existingUser = await prisma.user.findFirst({
      where: { email, schoolId, deletedAt: null },
      include: { teacher: true },
    });

    if (existingUser?.teacher && existingUser.teacher.deletedAt === null) {
      throw new AppError('Teacher already exists', 409);
    }
    if (existingUser && !existingUser.teacher) {
      throw new AppError('Email already in use', 409);
    }

    const hasMatrix = Array.isArray(data.assignments) && data.assignments.length > 0;
    const hasLegacy = Array.isArray(data.classIds) && data.classIds.length > 0;

    const assignments = hasMatrix
      ? data.assignments!
      : (data.classIds ?? []).map((classId) => ({ classId, subjectId: '' }));

    const classIds = Array.from(new Set(assignments.map((a) => a.classId)));

    const classes = await prisma.class.findMany({
      where: withTenant(schoolId, { id: { in: classIds }, ...softDeleteFilter() }),
      select: { id: true },
    });
    if (classes.length !== classIds.length) throw new AppError('One or more classes not found', 404);

    let fallbackSubjectId: string | null = null;

    if (hasMatrix) {
      const subjectIds = Array.from(new Set(assignments.map((a) => a.subjectId)));
      const subjects = await prisma.subject.findMany({
        where: withTenant(schoolId, { id: { in: subjectIds }, ...softDeleteFilter() }),
        select: { id: true, classId: true },
      });
      if (subjects.length !== subjectIds.length) throw new AppError('One or more subjects not found', 404);

      const subjectById = new Map(subjects.map((s) => [s.id, s]));
      for (const a of assignments) {
        const s = subjectById.get(a.subjectId);
        if (!s) throw new AppError('One or more subjects not found', 404);
        if (s.classId && s.classId !== a.classId) {
          throw new AppError('Subject does not belong to selected class', 422);
        }
      }

      fallbackSubjectId = assignments[0]!.subjectId;
    } else if (hasLegacy) {
      const fallbackSubject = await prisma.subject.findFirst({
        where: withTenant(schoolId, { classId: { in: classIds }, ...softDeleteFilter() }),
        select: { id: true },
      });
      if (!fallbackSubject) {
        throw new AppError(
          'No subjects are configured for the selected classes. Configure a subject first.',
          422,
        );
      }
      fallbackSubjectId = fallbackSubject.id;
    } else {
      throw new AppError('Invalid teacher payload', 422);
    }

    const tempPassword = authService.generateSecurePassword();
    const passwordHash = await hashPassword(tempPassword);
    const school = await prisma.school.findUnique({ where: { id: schoolId } });

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          name: data.name,
          role: 'TEACHER',
          schoolId,
          phone: data.phone,
        },
      });

      const teacher = await tx.teacher.create({
        data: {
          schoolId,
          userId: user.id,
          subjectId: fallbackSubjectId,
        },
      });

      if (hasMatrix) {
        await tx.teacherClass.createMany({
          data: assignments.map((a) => ({
            schoolId,
            teacherId: teacher.id,
            classId: a.classId,
            subjectId: a.subjectId,
          })),
          skipDuplicates: true,
        });
      } else if (hasLegacy) {
        await tx.teacherClass.createMany({
          data: classIds.map((classId) => ({
            schoolId,
            teacherId: teacher.id,
            classId,
            subjectId: fallbackSubjectId,
          })),
          skipDuplicates: true,
        });
      }

      return { teacher, tempPassword, user };
    });

    if (school) {
      await sendTeacherCredentialsEmail({
        to: email,
        teacherName: data.name,
        schoolName: school.name,
        email,
        tempPassword: result.tempPassword,
      });
    }

    return result.teacher;
  },

  async createAssignment(
    schoolId: string,
    teacherId: string,
    data: { classId: string; subjectId: string },
  ) {
    const teacher = await prisma.teacher.findFirst({
      where: withTenant(schoolId, { id: teacherId, ...softDeleteFilter() }),
    });
    if (!teacher) throw new AppError('Teacher not found', 404);

    const cls = await prisma.class.findFirst({
      where: withTenant(schoolId, { id: data.classId, ...softDeleteFilter() }),
      select: { id: true },
    });
    if (!cls) throw new AppError('Class not found', 404);

    const subject = await prisma.subject.findFirst({
      where: withTenant(schoolId, { id: data.subjectId, ...softDeleteFilter() }),
      select: { id: true, classId: true },
    });
    if (!subject) throw new AppError('Subject not found', 404);
    if (subject.classId && subject.classId !== data.classId) {
      throw new AppError('Subject does not belong to selected class', 422);
    }

    try {
      return await prisma.teacherClass.create({
        data: {
          schoolId,
          teacherId,
          classId: data.classId,
          subjectId: data.subjectId,
        },
        include: {
          class: { select: { id: true, name: true } },
          subject: { select: { id: true, name: true } },
        },
      });
    } catch (e: any) {
      if (e?.code === 'P2002') throw new AppError('Assignment already exists', 409);
      throw e;
    }
  },

  async deleteAssignment(schoolId: string, teacherId: string, assignmentId: string) {
    // 1. Find the assignment and get subjectId + classId for cascade cleanup
    const assignment = await prisma.teacherClass.findFirst({
      where: withTenant(schoolId, { id: assignmentId, teacherId }),
      select: { id: true, subjectId: true, classId: true },
    });
    if (!assignment) throw new AppError('Assignment not found', 404);

    await prisma.$transaction(async (tx) => {
      // 2. Find all chapters in this subject that belong to this teacher
      const chapters = await tx.chapter.findMany({
        where: {
          schoolId,
          subjectId: assignment.subjectId ?? undefined,
          classId: assignment.classId,
        },
        select: { id: true },
      });
      const chapterIds = chapters.map((c) => c.id);

      if (chapterIds.length > 0) {
        // 3. Find all topics in those chapters
        const topics = await tx.topic.findMany({
          where: { schoolId, chapterId: { in: chapterIds } },
          select: { id: true },
        });
        const topicIds = topics.map((t) => t.id);

        // 4. Delete topicProgress for this teacher in those topics
        if (topicIds.length > 0) {
          await tx.topicProgress.deleteMany({
            where: { teacherId, topicId: { in: topicIds } },
          });
        }

        // 5. Delete chapterProgress for this teacher in those chapters
        await tx.chapterProgress.deleteMany({
          where: { teacherId, chapterId: { in: chapterIds } },
        });
      }

      // 6. Finally delete the assignment itself
      await tx.teacherClass.delete({ where: { id: assignmentId } });
    });
  },

  async getById(schoolId: string, id: string) {
    const teacher = await prisma.teacher.findFirst({
      where: withTenant(schoolId, { id, ...softDeleteFilter() }),
      include: {
        user: true,
        teacherClasses: {
          include: {
            class: { select: { id: true, name: true, grade: true, section: true } },
            subject: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        chapterProgress: { include: { chapter: { select: { id: true, title: true } } } },
      },
    });
    if (!teacher) throw new AppError('Teacher not found', 404);
    return teacher;
  },

  async update(
    schoolId: string,
    id: string,
    data: { name?: string; phone?: string; status?: string },
  ) {
    const teacher = await this.getById(schoolId, id);

    return prisma.$transaction(async (tx) => {
      if (data.name || data.phone || data.status) {
        await tx.user.update({
          where: { id: teacher.userId },
          data: {
            ...(data.name && { name: data.name }),
            ...(data.phone && { phone: data.phone }),
            ...(data.status && { status: data.status as 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' }),
          },
        });
      }

      return tx.teacher.findUnique({
        where: { id: teacher.id },
        include: {
          user: true,
          teacherClasses: {
            include: { class: true, subject: true },
            orderBy: { createdAt: 'desc' },
          },
        },
      });
    });
  },

  async softDelete(schoolId: string, id: string) {
    const teacher = await this.getById(schoolId, id);
    return prisma.$transaction([
      prisma.teacher.update({ where: { id }, data: { deletedAt: new Date() } }),
      prisma.user.update({
        where: { id: teacher.userId },
        data: { deletedAt: new Date(), status: 'INACTIVE' },
      }),
    ]);
  },
};