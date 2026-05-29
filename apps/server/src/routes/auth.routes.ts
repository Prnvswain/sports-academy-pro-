import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import {
  loginSchema,
  refreshSchema,
  registerSchema,
  updateMeSchema,
  verifyOtpSchema,
} from '../validators/auth.validator.js';

export const authRoutes = Router();

authRoutes.post('/login', validateBody(loginSchema), authController.login);
authRoutes.post('/register', validateBody(registerSchema), authController.register);
authRoutes.post('/refresh', validateBody(refreshSchema), authController.refresh);
authRoutes.post('/logout', authController.logout);
authRoutes.get('/me', authenticate, authController.me);
authRoutes.patch('/me', authenticate, validateBody(updateMeSchema), authController.updateMe);
authRoutes.post('/me/send-otp', authenticate, authController.sendPasswordOtp);
authRoutes.post(
  '/me/verify-otp',
  authenticate,
  validateBody(verifyOtpSchema),
  authController.verifyOtpAndChangePassword,
);
