import prisma from '../../config/prisma.js';

export const getAuditLogs = async (academy_id, query = {}) => {
  const { actor_type, action, entity_type, limit = 50, offset = 0 } = query;

  const where = {
    academy_id: academy_id ? parseInt(academy_id, 10) : null
  };

  if (actor_type) {
    where.actor_type = actor_type;
  }

  if (action) {
    where.action = action;
  }

  if (entity_type) {
    where.entity_type = entity_type;
  }

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { created_at: 'desc' },
    take: parseInt(limit, 10),
    skip: parseInt(offset, 10)
  });

  const total = await prisma.auditLog.count({ where });

  return {
    logs: logs.map(log => ({
      ...log,
      metadata: log.metadata ? JSON.parse(log.metadata) : null
    })),
    total,
    limit: parseInt(limit, 10),
    offset: parseInt(offset, 10)
  };
};

export const getAuditLogById = async (academy_id, audit_id) => {
  const log = await prisma.auditLog.findFirst({
    where: {
      audit_id: parseInt(audit_id, 10),
      academy_id: academy_id ? parseInt(academy_id, 10) : null
    }
  });

  if (!log) {
    const error = new Error('Audit log not found');
    error.statusCode = 404;
    throw error;
  }

  return {
    ...log,
    metadata: log.metadata ? JSON.parse(log.metadata) : null
  };
};
