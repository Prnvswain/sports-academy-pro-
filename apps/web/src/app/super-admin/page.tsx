'use client';

import { useQuery } from '@tanstack/react-query';
import { Building2, DollarSign, School, Users, TrendingUp } from 'lucide-react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { api } from '@/services/api-client';
import type { SuperAdminDashboardStats } from '@school-syllabus/types';

interface PlatformStatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  iconBg: string;
  cardBg: string;
  borderColor: string;
  iconColor?: string;
  sub?: string;
  colSpan?: string;
}

function PlatformStatCard({
  title, value, icon: Icon,
  iconBg, cardBg, borderColor,
  iconColor = 'text-white',
  sub, colSpan = '',
}: PlatformStatCardProps) {
  return (
    <div
      className={`
        relative overflow-hidden rounded-2xl border ${borderColor} ${cardBg} ${colSpan}
        px-5 py-4 shadow-sm
        transition-all duration-200 hover:shadow-md hover:-translate-y-0.5
      `}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">{title}</p>
          <p className="mt-1.5 text-3xl font-bold text-gray-800 leading-none">{value}</p>
          {sub && <p className="mt-1.5 text-xs text-gray-400">{sub}</p>}
        </div>
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${iconBg} shadow-sm`}>
          <Icon className={`h-6 w-6 ${iconColor}`} />
        </div>
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, children }: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 shadow-sm">
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

export default function SuperAdminDashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['super-admin', 'stats'],
    queryFn: () => api.get<SuperAdminDashboardStats>('/dashboard/stats'),
  });

  return (
    <DashboardShell title="Platform Overview">
      <div className="space-y-6">
        <Section title="Platform Overview" icon={TrendingUp}>
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-32 animate-pulse rounded-2xl bg-gray-100" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <PlatformStatCard
                title="Total Schools"
                value={stats?.totalSchools ?? 0}
                icon={School}
                iconBg="bg-blue-500"
                cardBg="bg-blue-50"
                borderColor="border-blue-100"
              />
              <PlatformStatCard
                title="Active Schools"
                value={stats?.activeSchools ?? 0}
                icon={Building2}
                iconBg="bg-green-500"
                cardBg="bg-green-50"
                borderColor="border-green-100"
              />
              <PlatformStatCard
                title="Expired"
                value={stats?.expiredSchools ?? 0}
                icon={School}
                iconBg="bg-red-400"
                cardBg="bg-red-50"
                borderColor="border-red-100"
              />
              <PlatformStatCard
                title="Monthly Revenue"
                value={`$${(stats?.monthlyRevenue ?? 0).toLocaleString()}`}
                icon={DollarSign}
                iconBg="bg-amber-500"
                cardBg="bg-amber-50"
                borderColor="border-amber-100"
              />
              <PlatformStatCard
                title="Total Teachers"
                value={stats?.totalTeachers ?? 0}
                icon={Users}
                iconBg="bg-teal-500"
                cardBg="bg-teal-50"
                borderColor="border-teal-100"
                colSpan="md:col-span-2 lg:col-span-1"
              />
            </div>
          )}
        </Section>

        {/* Active vs Expired visual summary bar */}
        {!isLoading && (stats?.totalSchools ?? 0) > 0 && (
          <Section title="School Status Breakdown" icon={Building2}>
            <div className="space-y-3">
              <div>
                <div className="mb-1 flex justify-between text-xs text-gray-500">
                  <span className="font-medium text-gray-600">Active</span>
                  <span className="font-bold text-green-600">
                    {Math.round(((stats?.activeSchools ?? 0) / (stats?.totalSchools ?? 1)) * 100)}%
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-green-500 transition-all duration-700"
                    style={{
                      width: `${Math.round(((stats?.activeSchools ?? 0) / (stats?.totalSchools ?? 1)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="mb-1 flex justify-between text-xs text-gray-500">
                  <span className="font-medium text-gray-600">Expired</span>
                  <span className="font-bold text-red-500">
                    {Math.round(((stats?.expiredSchools ?? 0) / (stats?.totalSchools ?? 1)) * 100)}%
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-red-400 transition-all duration-700"
                    style={{
                      width: `${Math.round(((stats?.expiredSchools ?? 0) / (stats?.totalSchools ?? 1)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </Section>
        )}
      </div>
    </DashboardShell>
  );
}