import * as auditService from './audit.service.js';
import { successResponse } from '../../utils/response.js';

export const getAuditLogs = async (req, res, next) => {
  try {
    const result = await auditService.getAuditLogs(req.user.academy_id, req.query);
    res.json(successResponse('Audit logs retrieved', result));
  } catch (err) {
    next(err);
  }
};

export const getAuditLogById = async (req, res, next) => {
  try {
    const log = await auditService.getAuditLogById(req.user.academy_id, req.params.id);
    res.json(successResponse('Audit log retrieved', log));
  } catch (err) {
    next(err);
  }
};
