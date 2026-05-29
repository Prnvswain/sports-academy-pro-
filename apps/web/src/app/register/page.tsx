'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Eye, EyeOff, Loader2, GraduationCap } from 'lucide-react';
import { registerSchema, type RegisterFormData } from '@/features/auth/schemas/login.schema';
import { PasswordStrengthMeter } from '@/features/auth/components/password-strength-meter';
import { api, ApiError } from '@/services/api-client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting, isValid },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: 'onChange',
  });

  const password = watch('password', '');

  const onSubmit = async (data: RegisterFormData) => {
    try {
      await api.post('/auth/register', {
        schoolName: data.schoolName,
        adminName: data.adminName,
        email: data.email,
        password: data.password,
        phone: data.phone,
      }, true);
      toast.success('School registered! Please sign in.');
      router.push('/login');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Registration failed');
    }
  };

  return (
    <div className="relative min-h-screen bg-[#f0f4f8]">
      {/* Background blobs */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-[480px] w-[860px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(26,115,232,0.12),transparent_65%)] blur-3xl" />
        <div className="absolute -bottom-40 right-[-20%] h-[440px] w-[700px] rounded-full bg-[radial-gradient(circle_at_center,rgba(52,168,83,0.10),transparent_65%)] blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-lg items-center justify-center px-6 py-10">
        <div className="w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">

          {/* Blue header bar */}
          <div className="bg-gradient-to-r from-[#1a73e8] to-[#1558b0] px-6 py-5 text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-lg font-bold text-white">Register your school</h2>
            <p className="mt-0.5 text-sm text-blue-100">Create an admin account for your institution</p>
          </div>

          <div className="px-6 py-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

              {/* School name */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  School name <span className="text-red-400">*</span>
                </Label>
                <Input
                  {...register('schoolName')}
                  placeholder="e.g. Sunrise International School"
                  className="rounded-lg border-gray-200 focus:border-[#1a73e8] focus:ring-[#1a73e8]/20"
                />
                {errors.schoolName && (
                  <p className="text-xs text-red-500">{errors.schoolName.message}</p>
                )}
              </div>

              {/* Admin name */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Admin name <span className="text-red-400">*</span>
                </Label>
                <Input
                  {...register('adminName')}
                  placeholder="Full name"
                  className="rounded-lg border-gray-200 focus:border-[#1a73e8] focus:ring-[#1a73e8]/20"
                />
                {errors.adminName && (
                  <p className="text-xs text-red-500">{errors.adminName.message}</p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Email <span className="text-red-400">*</span>
                </Label>
                <Input
                  type="email"
                  {...register('email')}
                  placeholder="admin@school.com"
                  className="rounded-lg border-gray-200 focus:border-[#1a73e8] focus:ring-[#1a73e8]/20"
                />
                {errors.email && (
                  <p className="text-xs text-red-500">{errors.email.message}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Password <span className="text-red-400">*</span>
                </Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    {...register('password')}
                    placeholder="••••••••"
                    className="rounded-lg border-gray-200 pr-10 focus:border-[#1a73e8] focus:ring-[#1a73e8]/20"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <PasswordStrengthMeter password={password} />
              </div>

              {/* Confirm password */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Confirm password <span className="text-red-400">*</span>
                </Label>
                <Input
                  type="password"
                  {...register('confirmPassword')}
                  placeholder="••••••••"
                  className="rounded-lg border-gray-200 focus:border-[#1a73e8] focus:ring-[#1a73e8]/20"
                />
                {errors.confirmPassword && (
                  <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>
                )}
              </div>

              {/* Submit — green like dashboard action buttons */}
              <button
                type="submit"
                disabled={isSubmitting || !isValid}
                className="
                  mt-2 w-full rounded-lg bg-[#34a853] py-2.5
                  text-sm font-semibold text-white shadow
                  hover:bg-[#2d9249] disabled:opacity-50 disabled:cursor-not-allowed
                  active:scale-[0.98] transition-all flex items-center justify-center gap-2
                "
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Create account
              </button>
            </form>

            <p className="mt-5 text-center text-sm text-gray-500">
              Already have an account?{' '}
              <Link href="/login" className="font-semibold text-[#1a73e8] hover:text-[#1558b0] hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}