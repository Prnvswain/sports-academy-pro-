'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, CheckCircle2, Clock } from 'lucide-react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { StatCard } from '@/components/dashboard/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { api } from '@/services/api-client';
import { formatPercent } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';

interface AssignedClass {
  id: string;
  name: string;
  grade: string | null;
  section: string | null;
  description: string | null;
  totalChapters: number;
  completedChapters: number;
  progress: number;
  _count: { subjects: number };
}

export default function TeacherDashboardPage() {
  const user = useAuthStore((s) => s.user);

  const { data, isLoading } = useQuery({
    queryKey: ['teacher-classes'],
    queryFn: () => api.getPaginated<AssignedClass>('/syllabus/classes/assigned', { page: 1, pageSize: 100 }),
  });

  const classes = data?.items ?? [];
  const totalClasses = classes.length;
  const totalChapters = classes.reduce((sum, cls) => sum + cls.totalChapters, 0);
  const completedChapters = classes.reduce((sum, cls) => sum + cls.completedChapters, 0);
  const progress = totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0;

  return (
    <DashboardShell title={`Welcome, ${user?.name?.split(' ')[0] ?? 'Teacher'}`}>
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard title="Assigned classes" value={totalClasses} icon={BookOpen} />
          <StatCard title="Chapters assigned" value={totalChapters} icon={CheckCircle2} />
          <StatCard title="Overall progress" value={progress} icon={Clock} description={formatPercent(progress)} />
        </div>

        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Your classes</h2>
              <p className="text-sm text-muted-foreground">Open any class to review the syllabus and update chapter progress.</p>
            </div>
            <Link href="/teacher/classes" className="text-sm font-medium text-primary hover:underline">
              View all classes
            </Link>
          </div>

          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-40 rounded-xl" />
              ))}
            </div>
          ) : classes.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No assigned classes"
              description="You do not have any classes assigned yet. Ask your administrator to assign one so you can start teaching."
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-3">
              {classes.slice(0, 3).map((cls) => (
                <Card key={cls.id} className="group overflow-hidden">
                  <CardHeader>
                    <div className="space-y-2">
                      <CardTitle>{cls.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Grade {cls.grade ?? '—'} · Section {cls.section ?? '—'}
                      </p>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-sm text-muted-foreground">{cls._count.subjects} subjects · {cls.totalChapters} chapters</div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>Completed chapters</span>
                        <span>{cls.completedChapters}</span>
                      </div>
                      <Progress value={cls.progress} />
                    </div>
                    <Link href={`/teacher/classes/${cls.id}`} className="inline-flex text-sm font-medium text-primary hover:underline">
                      Open class details
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
