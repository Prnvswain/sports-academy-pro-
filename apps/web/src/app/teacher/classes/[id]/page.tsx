'use client';

import Link from 'next/link';
import { use, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BookOpen, ChevronDown } from 'lucide-react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { api } from '@/services/api-client';
import { formatPercent } from '@/lib/utils';
import { ChapterWorkflowCard } from '@/features/chapters/components/chapter-workflow-card';

interface ChapterItem {
  id: string;
  title: string;
  chapterProgress?: {
    teachingCompleted: boolean;
    qaCompleted: boolean;
    copyChecked: boolean;
    chapterStatus: string;
    completionPercentage: number;
  }[];
}

interface SubjectItem {
  id: string;
  name: string;
  chapters: ChapterItem[];
}

interface ClassDetails {
  id: string;
  name: string;
  grade: string | null;
  section: string | null;
  description: string | null;
  overallProgress: number;
  totalChapters: number;
  completedChapters: number;
  subjects: SubjectItem[];
}

// ✅ params is now a Promise — unwrap with use()
export default function TeacherClassDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params); // ✅ fixed
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['teacher-class', id],
    queryFn: () => api.get<ClassDetails>(`/syllabus/classes/${id}`),
  });

  const toggleSubject = (subjectId: string) => {
    setExpandedSubjects((prev) => ({ ...prev, [subjectId]: !prev[subjectId] }));
  };

  return (
    <DashboardShell title={data?.name ?? 'Class syllabus'}>
      {isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-10 w-56" />
          <div className="grid gap-6 lg:grid-cols-3">
            <Skeleton className="h-40 lg:col-span-1" />
            <Skeleton className="h-40 lg:col-span-2" />
          </div>
        </div>
      ) : !data ? (
        <EmptyState
          icon={ArrowLeft}
          title="Class not found"
          description="The requested class does not exist or you do not have access."
          action={{ label: 'Back to classes', onClick: () => router.push('/teacher/classes') }}
        />
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Assigned class</p>
              <h1 className="text-2xl font-semibold">{data.name}</h1>
              <p className="text-sm text-muted-foreground">
                Grade {data.grade ?? '—'} · Section {data.section ?? '—'}
              </p>
            </div>
            <Button variant="outline" asChild>
              <Link href="/teacher/classes">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to classes
              </Link>
            </Button>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Overall progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Completion</span>
                  <span>{formatPercent(data.overallProgress)}</span>
                </div>
                <Progress value={data.overallProgress} />
                <div className="rounded-lg bg-secondary/50 p-4 text-sm text-muted-foreground">
                  {data.completedChapters} of {data.totalChapters} chapters completed
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Class syllabus</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Review subjects and chapters. Mark teaching, Q&amp;A and copy-check progress below.
                </p>
              </CardContent>
            </Card>
          </div>

          {data.subjects.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No syllabus available"
              description="This class does not have any syllabus structure assigned to you yet."
            />
          ) : (
            <div className="space-y-6">
              {data.subjects.map((subject) => (
                <Card key={subject.id} className="overflow-hidden">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-4 border-b px-4 py-4 text-left"
                    onClick={() => toggleSubject(subject.id)}
                  >
                    <div>
                      <h2 className="text-lg font-semibold">{subject.name}</h2>
                      <p className="text-sm text-muted-foreground">{subject.chapters.length} chapters</p>
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${expandedSubjects[subject.id] ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {expandedSubjects[subject.id] && (
                    <div className="space-y-4 px-4 pb-4 pt-2">
                      {subject.chapters.map((chapter) => (
                        <Card key={chapter.id} className="border">
                          <CardHeader>
                            <CardTitle className="text-base">{chapter.title}</CardTitle>
                          </CardHeader>
                          <CardContent>
                            {/* ✅ Topics section removed — no longer returned by API */}
                            <ChapterWorkflowCard
                              chapterId={chapter.id}
                              title={chapter.title}
                              progress={chapter.chapterProgress?.[0] ?? null}
                              invalidateQueryKeys={[['teacher-class', id], ['teacher-classes']]}
                            />
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </DashboardShell>
  );
}