'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, ChevronRight, GraduationCap } from 'lucide-react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { api } from '@/services/api-client';

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

export default function TeacherClassesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['teacher-classes'],
    queryFn: () => api.getPaginated<AssignedClass>('/syllabus/classes/assigned', { page: 1, pageSize: 100 }),
  });

  const classes = data?.items ?? [];

  return (
    <DashboardShell title="My classes">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {isLoading
            ? Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-44 rounded-3xl" />
              ))
            : classes.map((cls) => (
                <Card key={cls.id} className="group overflow-hidden transition-shadow hover:shadow-lg">
                  <CardHeader>
                    <div className="space-y-1">
                      <CardTitle>{cls.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Grade {cls.grade ?? '—'} · Section {cls.section ?? '—'}
                      </p>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-sm text-muted-foreground">{cls._count.subjects} subjects · {cls.totalChapters} chapters</div>
                    <Progress value={cls.progress} />
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{cls.completedChapters} completed</span>
                      <Link href={`/teacher/classes/${cls.id}`} className="inline-flex items-center gap-1 text-primary">
                        View syllabus <ChevronRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
        </div>

        {!isLoading && classes.length === 0 && (
          <EmptyState
            icon={GraduationCap}
            title="No assigned classes"
            description="Your administrator can assign you classes so you can manage progress from here."
          />
        )}
      </div>
    </DashboardShell>
  );
}
