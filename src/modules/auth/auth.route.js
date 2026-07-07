import express from 'express';
import * as authController from './auth.controller.js';
import { validate } from './auth.validator.js';
import { validationErrorHandler } from '../../middlewares/validation.middleware.js';
import { upload } from '../../config/multer.config.js';

const router = express.Router();

router.post('/signup', upload.single('logo'), validate('signup'), validationErrorHandler, authController.signup);
router.post('/login', validate('login'), validationErrorHandler, authController.login);
router.post('/coach/login', validate('login'), validationErrorHandler, authController.coachLogin);
router.post(
  '/forgot-password',
  validate('forgotPassword'),
  validationErrorHandler,
  authController.forgotPassword
);
router.post(
  '/reset-password',
  validate('resetPassword'),
  validationErrorHandler,
  authController.resetPassword
);

export default router;
