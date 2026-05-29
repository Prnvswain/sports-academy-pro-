import { Router } from 'express';
import { UserRole } from '@school-syllabus/types';
import { syllabusController } from '../controllers/syllabus.controller.js';
import { authenticate, authorize, requireSchoolTenant } from '../middleware/auth.js';
import { tenantGuard } from '../middleware/tenant.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.js';
import { paginationSchema, idParamSchema } from '../validators/common.validator.js';
import {
  createClassSchema,
  updateClassSchema,
  createSubjectSchema,
  updateSubjectSchema,
  createChapterSchema,
  updateChapterSchema,
  createTopicSchema,
  updateTopicSchema,
} from '../validators/syllabus.validator.js';

export const syllabusRoutes = Router();

const schoolAdmin = [
  authenticate,
  authorize(UserRole.SCHOOL_ADMIN, UserRole.TEACHER),
  requireSchoolTenant,
  tenantGuard(),
] as const;

const schoolAdminOnly = [
  authenticate,
  authorize(UserRole.SCHOOL_ADMIN),
  requireSchoolTenant,
  tenantGuard(),
] as const;

const teacherOnly = [
  authenticate,
  authorize(UserRole.TEACHER),
  requireSchoolTenant,
  tenantGuard(),
] as const;

// Tree
syllabusRoutes.get('/tree', ...schoolAdmin, syllabusController.getTree);

// Classes
syllabusRoutes.get('/classes', ...schoolAdmin, validateQuery(paginationSchema), syllabusController.listClasses);
syllabusRoutes.get('/classes/assigned', ...teacherOnly, validateQuery(paginationSchema), syllabusController.listAssignedClasses);
syllabusRoutes.get('/classes/:id', ...schoolAdmin, validateParams(idParamSchema), syllabusController.getClassDetails);
syllabusRoutes.post('/classes', ...schoolAdminOnly, validateBody(createClassSchema), syllabusController.createClass);
syllabusRoutes.patch('/classes/:id', ...schoolAdminOnly, validateParams(idParamSchema), validateBody(updateClassSchema), syllabusController.updateClass);
syllabusRoutes.delete('/classes/:id', ...schoolAdminOnly, validateParams(idParamSchema), syllabusController.deleteClass);

// Subjects
syllabusRoutes.get('/subjects', ...schoolAdmin, syllabusController.listSubjects);
syllabusRoutes.post('/subjects', ...schoolAdminOnly, validateBody(createSubjectSchema), syllabusController.createSubject);
syllabusRoutes.patch('/subjects/:id', ...schoolAdminOnly, validateParams(idParamSchema), validateBody(updateSubjectSchema), syllabusController.updateSubject);
syllabusRoutes.delete('/subjects/:id', ...schoolAdminOnly, validateParams(idParamSchema), syllabusController.deleteSubject); // ✅ ADDED

// Chapters
syllabusRoutes.get('/chapters', ...schoolAdmin, syllabusController.listChapters);
syllabusRoutes.post('/chapters', ...schoolAdminOnly, validateBody(createChapterSchema), syllabusController.createChapter);
syllabusRoutes.patch('/chapters/:id', ...schoolAdminOnly, validateParams(idParamSchema), validateBody(updateChapterSchema), syllabusController.updateChapter);
syllabusRoutes.delete('/chapters/:id', ...schoolAdminOnly, validateParams(idParamSchema), syllabusController.deleteChapter);
syllabusRoutes.patch('/chapters/reorder', ...schoolAdminOnly, syllabusController.reorderChapters);

// Topics
syllabusRoutes.get('/topics', ...schoolAdmin, syllabusController.listTopics);
syllabusRoutes.post('/topics', ...schoolAdminOnly, validateBody(createTopicSchema), syllabusController.createTopic);
syllabusRoutes.patch('/topics/:id', ...schoolAdminOnly, validateParams(idParamSchema), validateBody(updateTopicSchema), syllabusController.updateTopic);
syllabusRoutes.delete('/topics/:id', ...schoolAdminOnly, validateParams(idParamSchema), syllabusController.deleteTopic); // ✅ ADDED