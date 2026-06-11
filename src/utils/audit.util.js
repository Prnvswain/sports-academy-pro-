import prisma from '../config/prisma.js';
import logger from './logger.js';

export const logAudit = async ({
  academy_id = null,
  actor_type,
  actor_id = null,
  action,
  entity_type = null,
  entity_id = null,
  metadata = null,
  ip_address = null
}) => {
  try {
    await prisma.auditLog.create({
      data: {
        academy_id: academy_id ? parseInt(academy_id, 10) : null,
        actor_type,
        actor_id: actor_id ? parseInt(actor_id, 10) : null,
        action,
        entity_type,
        entity_id: entity_id ? parseInt(entity_id, 10) : null,
        metadata: metadata ? JSON.stringify(metadata) : null,
        ip_address
      }
    });
  } catch (error) {
    logger.error('Audit log write failed', { action, message: error.message });
  }
};
