import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../../config/prisma.js';
import { JWT_SECRET, JWT_EXPIRE, BCRYPT_SALT_ROUNDS } from '../../config/app.config.js';
import { logAudit } from '../../utils/audit.util.js';
import logger from '../../utils/logger.js';

export const loginSuperAdmin = async ({ email, password, ip }) => {
  const admin = await prisma.superAdmin.findFirst({
    where: { email: email.trim().toLowerCase(), is_active: true }
  });

  if (!admin) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  const valid = await bcrypt.compare(password, admin.password_hash);
  if (!valid) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  const token = jwt.sign(
    {
      super_admin_id: admin.super_admin_id,
      email: admin.email,
      role: 'SUPER_ADMIN',
      name: admin.name
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRE }
  );

  await logAudit({
    actor_type: 'SUPER_ADMIN',
    actor_id: admin.super_admin_id,
    action: 'SUPER_ADMIN_LOGIN',
    ip_address: ip
  });

  logger.info('Super admin login', { super_admin_id: admin.super_admin_id, ip });

  return {
    token,
    user: {
      super_admin_id: admin.super_admin_id,
      name: admin.name,
      email: admin.email,
      role: 'SUPER_ADMIN'
    }
  };
};

export const listAcademies = async () => {
  try {
    const academies = await prisma.academy.findMany({
      orderBy: { created_at: 'desc' },
      include: {
        _count: {
          select: {
            students: true,
            coaches: true,
            batches: true
          }
        }
      }
    });
    
    // Ensure each academy has _count with default values
    return academies.map(a => ({
      ...a,
      _count: {
        students: a._count?.students ?? 0,
        coaches: a._count?.coaches ?? 0,
        batches: a._count?.batches ?? 0
      }
    }));
  } catch (error) {
    // Return empty array on error
    return [];
  }
};

export const updateAcademyStatus = async (academy_id, status, actor_id, ip) => {
  const academy = await prisma.academy.update({
    where: { academy_id: parseInt(academy_id, 10) },
    data: { status }
  });

  await logAudit({
    actor_type: 'SUPER_ADMIN',
    actor_id,
    action: 'ACADEMY_STATUS_UPDATED',
    entity_type: 'Academy',
    entity_id: academy.academy_id,
    metadata: { status },
    ip_address: ip
  });

  return academy;
};

// ─── FIXED METRICS QUERY MODULE ──────────────────────────────────────────────
export const getPlatformStats = async () => {
  const [academyCount, activeAcademies, studentCount, coachCount, revenue] = await Promise.all([
    prisma.academy.count(),
    // FIX 1: Swapped 'active' to capitalized 'ACTIVE' to match AcademyStatus enum
    prisma.academy.count({ where: { status: 'ACTIVE' } }),
    prisma.student.count({ where: { is_deleted: false, status: 'ACTIVE' } }),
    // FIX 2: Added status filter to coaches so dashboard returns live staff pairs accurately
    prisma.coach.count({ where: { is_deleted: false, status: 'ACTIVE' } }),
    prisma.receipt.aggregate({
      where: { status: 'COMPLETED' }, 
      _sum: { amount: true }
    })
  ]);

  return {
    total_academies: academyCount,
    active_academies: activeAcademies,
    total_students: studentCount,
    total_coaches: coachCount,
    platform_revenue: revenue._sum.amount || 0
  };
};

export const upsertGlobalSetting = async (setting_key, setting_value, actor_id, ip) => {
  const setting = await prisma.globalSetting.upsert({
    where: { setting_key },
    create: { setting_key, setting_value },
    update: { setting_value }
  });

  await logAudit({
    actor_type: 'SUPER_ADMIN',
    actor_id,
    action: 'GLOBAL_SETTING_UPDATED',
    entity_type: 'GlobalSetting',
    metadata: { setting_key },
    ip_address: ip
  });

  return setting;
};

export const getGlobalSettings = async () => prisma.globalSetting.findMany();

export const ensureSuperAdminFromEnv = async () => {
  const email = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SUPER_ADMIN_PASSWORD;

  if (!email || !password) {
    return null;
  }

  const existing = await prisma.superAdmin.findUnique({ where: { email } });
  if (existing) {
    return existing;
  }

  const password_hash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
  return prisma.superAdmin.create({
    data: {
      name: 'Platform Super Admin',
      email,
      password_hash
    }
  });
};