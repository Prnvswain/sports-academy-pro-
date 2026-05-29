import { prisma } from '@school-syllabus/database';
import { softDeleteFilter } from './base.repository.js';

export const userRepository = {
  findByEmail(email: string) {
    return prisma.user.findFirst({
      where: { email, ...softDeleteFilter() },
      include: { school: true, teacher: true },
    });
  },

  findById(id: string) {
    return prisma.user.findFirst({
      where: { id, ...softDeleteFilter() },
      include: { school: true, teacher: { include: { subject: true, teacherClasses: { include: { class: true } } } } },
    });
  },

  updateLastLogin(id: string) {
    return prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  },
};
