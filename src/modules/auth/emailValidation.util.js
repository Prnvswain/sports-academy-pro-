import { NOT_DELETED } from '../../utils/softDelete.util.js';

export const validateAcademyAdminEmailUniqueness = async ({ prisma, email }) => {
  const normalizedEmail = (email || '').trim().toLowerCase();

  if (!normalizedEmail) return;

  const existingAdmin = await prisma.user.findFirst({
    where: {
      email: normalizedEmail,
      role: 'ACADEMY_ADMIN',
      ...NOT_DELETED,
    },
  });

  if (existingAdmin) {
    const error = new Error('Email already registered');
    error.statusCode = 409;
    throw error;
  }
};
