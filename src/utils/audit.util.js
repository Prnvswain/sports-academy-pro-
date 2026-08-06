import prisma from '../config/prisma.js';
import logger from './logger.js';
import { authLocalStorage } from './context.util.js';

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
  console.log('[logAudit] Creating audit log for action:', action);
  try {
    const store = authLocalStorage ? authLocalStorage.getStore() : null;
    
    let finalActorType = actor_type;
    let finalActorId = actor_id;
    let parsedMetadata = {};
    
    if (metadata) {
      try {
        parsedMetadata = typeof metadata === 'string' ? JSON.parse(metadata) : { ...metadata };
      } catch (e) {
        parsedMetadata = { raw_metadata: metadata };
      }
    }

    if (store && store.impersonating) {
      finalActorType = 'Performed by Admin (Impersonating Coach)';
      finalActorId = store.original_admin_id; // Store Admin ID as actor_id
      parsedMetadata.impersonation = {
        impersonating: true,
        admin_id: store.original_admin_id,
        coach_id: store.coach_id
      };
    }

    const auditData = {
      academy_id: academy_id ? parseInt(academy_id, 10) : (store ? parseInt(store.academy_id, 10) : null),
      actor_type: finalActorType,
      actor_id: finalActorId ? parseInt(finalActorId, 10) : null,
      action,
      entity_type,
      entity_id: entity_id ? parseInt(entity_id, 10) : null,
      metadata: Object.keys(parsedMetadata).length > 0 ? JSON.stringify(parsedMetadata) : null,
      ip_address
    };
    console.log('[logAudit] Audit data:', auditData);
    
    await prisma.auditLog.create({
      data: auditData
    });
    console.log('[logAudit] Audit log created successfully');
  } catch (error) {
    console.error('[logAudit] Error:', error);
    console.error('[logAudit] Error stack:', error.stack);
    logger.error('Audit log write failed', { action, message: error.message });
  }
};
