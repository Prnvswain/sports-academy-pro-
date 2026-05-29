import Link from 'next/link';
import { GraduationCap } from 'lucide-react';
import { Suspense } from 'react';
import { LoginForm } from '@/features/auth/components/login-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage() {
  return (
    <div suppressHydrationWarning className="relative min-h-screen bg-[#f0f4f8] text-foreground">
      {/* Subtle background blobs referencing the dashboard's blue/teal palette */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-[480px] w-[860px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(26,115,232,0.12),transparent_65%)] blur-3xl" />
        <div className="absolute -bottom-40 left-[-20%] h-[440px] w-[700px] rounded-full bg-[radial-gradient(circle_at_center,rgba(52,168,83,0.10),transparent_65%)] blur-3xl" />
        <div className="absolute -bottom-32 right-[-20%] h-[440px] w-[700px] rounded-full bg-[radial-gradient(circle_at_center,rgba(21,88,176,0.09),transparent_65%)] blur-3xl" />
      </div>

      <div className="relative mx-auto grid min-h-screen w-full max-w-6xl grid-cols-1 items-center gap-10 px-6 py-10 lg:grid-cols-2">

        {/* ── Left: branding panel ── */}
        <div className="hidden lg:block">
          <Link href="/" className="inline-flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1a73e8] to-[#1558b0] shadow-md">
              <GraduationCap className="h-5 w-5 text-white" />
            </span>
            <span className="text-lg font-bold tracking-tight text-[#1a73e8]">
              Syllabus<span className="text-gray-400 font-normal">Tracker</span>
            </span>
          </Link>

          <h1 className="mt-10 text-4xl font-bold leading-tight tracking-tight text-gray-800">
            Operational clarity for syllabus delivery — across every class, subject, and teacher.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-gray-500">
            Real-time progress, structured workflows, and analytics that help admins unblock delivery before it becomes a problem.
          </p>

          {/* Feature pills — like the dashboard summary cards */}
          <div className="mt-10 grid max-w-xl grid-cols-3 gap-3">
            {[
              { k: 'Multi-tenant', v: 'School isolation', color: 'border-blue-200 bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
              { k: 'RBAC', v: 'Admin / Teacher', color: 'border-teal-200 bg-teal-50', text: 'text-teal-700', dot: 'bg-teal-500' },
              { k: 'Audit-ready', v: 'Traceable actions', color: 'border-green-200 bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
            ].map((x) => (
              <div key={x.k} className={`rounded-2xl border ${x.color} p-4`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={`h-1.5 w-1.5 rounded-full ${x.dot}`} />
                  <p className={`text-xs font-semibold ${x.text}`}>{x.k}</p>
                </div>
                <p className="text-sm font-bold text-gray-700">{x.v}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right: login card ── */}
        <div className="flex items-center justify-center">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
            {/* Blue header bar — matching dashboard section headers */}
            <div className="bg-gradient-to-r from-[#1a73e8] to-[#1558b0] px-6 py-5 text-center">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-lg font-bold text-white">Welcome back</h2>
              <p className="mt-0.5 text-sm text-blue-100">Sign in to your account to continue</p>
            </div>

            <div className="px-6 py-6">
              <Suspense
                fallback={<div className="h-40 animate-pulse rounded-xl bg-gray-100" />}
              >
                <LoginForm />
              </Suspense>
              <p className="mt-5 text-center text-sm text-gray-500">
                New school?{' '}
                <Link href="/register" className="font-semibold text-[#1a73e8] hover:text-[#1558b0] hover:underline">
                  Register your institution
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}