'use client';

import { useQuery } from '@tanstack/react-query';
import { BookOpen, CheckCircle2, Clock, GraduationCap, Users, TrendingUp } from 'lucide-react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { ProgressChart } from '@/components/dashboard/progress-chart';
import { api } from '@/services/api-client';
import type { DashboardStats } from '@school-syllabus/types';
import { formatPercent } from '@/lib/utils';

/* ─────────────────────────────────────────────
   Design reference: the school ERP dashboard
   ─ Blue gradient header bars on each section
   ─ Coloured circular icon badges on cards
   ─ Soft tinted card backgrounds (not pure white)
   ─ Green / amber / red semantic accents
   ─ Compact summary rows inside cards
   ───────────────────────────────────────────── */

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  iconBg: string;       // tailwind bg class
  iconColor: string;    // tailwind text class
  cardBg: string;       // tailwind bg class for card
  borderColor: string;  // tailwind border class
  sub?: string;
  trend?: string;
}

function StatCard({
  title, value, icon: Icon, iconBg, iconColor, cardBg, borderColor, sub, trend,
}: StatCardProps) {
  return (
    <div
      className={`
        relative overflow-hidden rounded-2xl border ${borderColor} ${cardBg}
        px-5 py-4 shadow-sm
        transition-all duration-200 hover:shadow-md hover:-translate-y-0.5
      `}
    >
      {/* Subtle decorative circle in top-right */}
      <div className="pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full opacity-10 bg-current" />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">{title}</p>
          <p className="mt-1.5 text-3xl font-bold text-gray-800 leading-none">{value}</p>
          {sub && <p className="mt-1.5 text-xs text-gray-400">{sub}</p>}
          {trend && (
            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-600 border border-green-100">
              <TrendingUp className="h-3 w-3" />
              {trend}
            </span>
          )}
        </div>
        {/* Coloured icon badge — like the ERP dashboard widget icons */}
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${iconBg} shadow-sm`}>
          <Icon className={`h-6 w-6 ${iconColor}`} />
        </div>
      </div>
    </div>
  );
}

/* ── Section wrapper with blue header bar ── */
function Section({ title, icon: Icon, children }: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 shadow-sm">
      {/* Blue gradient header — reference from dashboard section headers */}
      <div className="flex items-center gap-3 bg-gradient-to-r from-[#1a73e8] to-[#1558b0] px-5 py-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20">
          <Icon className="h-4 w-4 text-white" />
        </div>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      <div className="bg-white p-5">{children}</div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => api.get<DashboardStats>('/dashboard/stats'),
  });

  const { data: analytics } = useQuery({
    queryKey: ['dashboard', 'analytics'],
    queryFn: () =>
      api.get<{
        subjectProgress: { name: string; progress: number }[];
        teacherProgress?: { name: string; progress: number }[];
      }>('/dashboard/analytics'),
  });

  if (isLoading) {
    return (
      <DashboardShell title="Dashboard">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-gray-100" />
          ))}
        </div>
      </DashboardShell>
    );
  }

  const overallPct = stats?.overallProgress ?? 0;

  return (
    <DashboardShell title="Dashboard">
      <div className="space-y-6">

        {/* ── Top KPI strip ── */}
        <Section title="Overview" icon={TrendingUp}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Teachers"
              value={stats?.totalTeachers ?? 0}
              icon={Users}
              iconBg="bg-blue-500"
              iconColor="text-white"
              cardBg="bg-blue-50"
              borderColor="border-blue-100"
            />
            <StatCard
              title="Classes"
              value={stats?.totalClasses ?? 0}
              icon={GraduationCap}
              iconBg="bg-teal-500"
              iconColor="text-white"
              cardBg="bg-teal-50"
              borderColor="border-teal-100"
            />
            <StatCard
              title="Chapters"
              value={stats?.totalChapters ?? 0}
              icon={BookOpen}
              iconBg="bg-orange-500"
              iconColor="text-white"
              cardBg="bg-orange-50"
              borderColor="border-orange-100"
            />
            <StatCard
              title="Overall Progress"
              value={formatPercent(overallPct)}
              icon={CheckCircle2}
              iconBg="bg-green-500"
              iconColor="text-white"
              cardBg="bg-green-50"
              borderColor="border-green-100"
              sub={`${stats?.completedChapters ?? 0} chapters completed`}
            />
          </div>
        </Section>

        {/* ── Chapter status cards ── */}
        <Section title="Chapter Status" icon={BookOpen}>
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Completed */}
            <div className="flex items-center gap-4 rounded-xl border border-emerald-100 bg-emerald-50 px-5 py-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-500 shadow-sm">
                <CheckCircle2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">
                  Completed
                </p>
                <p className="mt-0.5 text-3xl font-bold text-emerald-700 leading-none">
                  {stats?.completedChapters ?? 0}
                </p>
                <p className="mt-1 text-xs text-emerald-500">chapters finished</p>
              </div>
              {/* Mini progress bar — like the ERP's colored bars */}
              <div className="ml-auto w-1.5 self-stretch rounded-full bg-emerald-200 overflow-hidden">
                <div
                  className="w-full rounded-full bg-emerald-500 transition-all"
                  style={{
                    height: `${
                      stats?.totalChapters
                        ? Math.round(((stats.completedChapters ?? 0) / stats.totalChapters) * 100)
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            {/* Pending */}
            <div className="flex items-center gap-4 rounded-xl border border-amber-100 bg-amber-50 px-5 py-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-500 shadow-sm">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-amber-600">
                  Pending
                </p>
                <p className="mt-0.5 text-3xl font-bold text-amber-700 leading-none">
                  {stats?.pendingChapters ?? 0}
                </p>
                <p className="mt-1 text-xs text-amber-500">chapters remaining</p>
              </div>
              <div className="ml-auto w-1.5 self-stretch rounded-full bg-amber-200 overflow-hidden">
                <div
                  className="w-full rounded-full bg-amber-500 transition-all"
                  style={{
                    height: `${
                      stats?.totalChapters
                        ? Math.round(((stats.pendingChapters ?? 0) / stats.totalChapters) * 100)
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Overall progress bar — like the ERP's fee collection bars */}
          <div className="mt-5">
            <div className="mb-1.5 flex items-center justify-between text-xs text-gray-500">
              <span className="font-medium text-gray-600">Overall Syllabus Completion</span>
              <span className="font-bold text-[#1a73e8]">{formatPercent(overallPct)}</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#1a73e8] to-[#34a853] transition-all duration-700"
                style={{ width: `${Math.min(overallPct, 100)}%` }}
              />
            </div>
            <div className="mt-1.5 flex justify-between text-[10px] text-gray-400">
              <span>{stats?.completedChapters ?? 0} done</span>
              <span>{stats?.pendingChapters ?? 0} pending</span>
            </div>
          </div>
        </Section>

        {/* ── Analytics charts ── */}
        {analytics?.subjectProgress && analytics.subjectProgress.length > 0 && (
          <Section title="Subject-wise Progress" icon={BookOpen}>
            <ProgressChart title="" data={analytics.subjectProgress} />
          </Section>
        )}

        {analytics?.teacherProgress && analytics.teacherProgress.length > 0 && (
          <Section title="Teacher-wise Progress" icon={Users}>
            <ProgressChart title="" data={analytics.teacherProgress} />
          </Section>
        )}

      </div>
    </DashboardShell>
  );
}