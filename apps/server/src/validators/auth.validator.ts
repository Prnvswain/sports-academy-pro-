import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  schoolName: z.string().min(2, 'School name must be at least 2 characters'),
  adminName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8)
    .regex(/[A-Z]/, 'Must contain uppercase')
    .regex(/[a-z]/, 'Must contain lowercase')
    .regex(/\d/, 'Must contain number')
    .regex(/[@$!%*?&#^()_+\-=[\]{};':"\\|,.<>/]/, 'Must contain special character'),
  phone: z.string().optional(),
});

export const refreshSchema = z.object({
  refreshToken: z.string().optional(),
});

export const updateMeSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  phone: z.string().optional(),
});

export const sendOtpSchema = z.object({
  // no body needed — user is taken from JWT
});

export const verifyOtpSchema = z.object({
  otp: z.string().length(6, 'OTP must be 6 digits'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain uppercase')
    .regex(/[a-z]/, 'Must contain lowercase')
    .regex(/\d/, 'Must contain number')
    .regex(/[@$!%*?&#^()_+\-=[\]{};':"\\|,.<>/]/, 'Must contain special character'),
});
