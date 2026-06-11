import express from 'express';
import * as notesController from './notes.controller.js';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';
import { body, param } from 'express-validator';
import { validationErrorHandler } from '../../middlewares/validation.middleware.js';

const router = express.Router();

router.use(authenticate);
router.use(authorize('COACH'));

router.post(
  '/',
  [
    body('student_id').isInt(),
    body('note_date').optional().isISO8601(),
    body('performance_notes').optional().isString(),
    body('behaviour_notes').optional().isString(),
    body('achievements').optional().isString(),
    body('improvement_areas').optional().isString()
  ],
  validationErrorHandler,
  notesController.createNote
);

router.get(
  '/student/:student_id',
  [param('student_id').isInt()],
  validationErrorHandler,
  notesController.getStudentNotes
);

export default router;
