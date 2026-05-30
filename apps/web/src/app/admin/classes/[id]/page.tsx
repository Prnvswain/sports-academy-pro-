'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { use, useEffect } from 'react';
import { ArrowLeft, GraduationCap, Plus } from 'lucide-react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { api, ApiError } from '@/services/api-client';
import { formatPercent } from '@/lib/utils';
import { toast } from 'sonner';
import { syllabusKeys } from '@/features/syllabus/query-keys';
import { invalidateSyllabusStructure } from '@/features/syllabus/invalidate-syllabus';
import { useSchoolId } from '@/features/syllabus/hooks/use-school-id';

interface ClassSubject {
  id: string;
  name: string;
  code?: string | null;
  description?: string | null;
  totalChapters: number;
  completedChapters: number;
  progressPercentage: number;
  _count: { chapters: number };
  teachers: { id: string; user: { name: string } }[];
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
  subjects: ClassSubject[];
  assignedTeachers: { id: string; name: string; email: string; subject: string | null }[];
}

interface SubjectForAssignment {
  id: string;
  name: string;
  code?: string | null;
  classId?: string | null;
}

export default function AdminClassDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const queryClient = useQueryClient();
  const schoolId = useSchoolId();
  const [addSubjectDialogOpen, setAddSubjectDialogOpen] = useState(false);
  const [selectedSubjectIdForAssign, setSelectedSubjectIdForAssign] = useState<string | null>(null);

  const classQueryKey = syllabusKeys.class(schoolId, id);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: classQueryKey,
    queryFn: () => api.get<ClassDetails>(`/syllabus/classes/${id}`),
    enabled: Boolean(schoolId && id),
  });

  const { data: allSubjects = [] } = useQuery({
    queryKey: syllabusKeys.subjectsForAssignment(schoolId, id),
    queryFn: () => api.get<SubjectForAssignment[]>('/syllabus/subjects', { classId: id }),
    enabled: Boolean(schoolId && addSubjectDialogOpen),
  });

  const assignSubjectMutation = useMutation({
    mutationFn: (subjectId: string) =>
      api.patch(`/syllabus/subjects/${subjectId}`, { classId: id }),
    onSuccess: async () => {
      await invalidateSyllabusStructure(queryClient, schoolId);
      await queryClient.refetchQueries({ queryKey: classQueryKey });
      toast.success('Subject assigned to class');
      setAddSubjectDialogOpen(false);
      setSelectedSubjectIdForAssign(null);
    },
    onError: () => toast.error('Failed to assign subject'),
  });

  useEffect(() => {
    if (!id) {
      router.push('/admin/classes');
    }
  }, [id, router]);

  if (isLoading) {
    return (
      <DashboardShell title="Class details">
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid gap-6 lg:grid-cols-3">
            <Skeleton className="h-40 lg:col-span-1" />
            <Skeleton className="h-40 lg:col-span-2" />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-32" />
            ))}
          </div>
        </div>
      </DashboardShell>
    );
  }

  if (isError) {
    const message = error instanceof ApiError ? error.message : 'Failed to load class';
    return (
      <DashboardShell title="Class details">
        <EmptyState
          icon={ArrowLeft}
          title="Could not load class"
          description={message}
          action={{
            label: 'Retry',
            onClick: () => refetch(),
          }}
        />
      </DashboardShell>
    );
  }

  if (!data) {
    return (
      <DashboardShell title="Class details">
        <EmptyState
          icon={ArrowLeft}
          title="Class not found"
          description="The selected class could not be found or may have been deleted."
          action={{
            label: 'Back to classes',
            onClick: () => router.push('/admin/classes'),
          }}
        />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title={data.name}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-muted-foreground text-sm">Class overview</p>
            <h2 className="text-2xl font-semibold">{data.name}</h2>
            <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
              Grade {data.grade ?? '—'} · Section {data.section ?? '—'}
            </p>
          </div>
          <Button variant="outline" onClick={() => router.push('/admin/classes')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to classes
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Overall progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-muted-foreground flex items-center justify-between text-sm">
                <span>Completion</span>
                <span>{formatPercent(data.overallProgress)}</span>
              </div>
              <Progress value={data.overallProgress} />
              <div className="bg-secondary/50 text-muted-foreground rounded-lg p-4 text-sm">
                <p>
                  {data.completedChapters} of {data.totalChapters} chapters completed
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Assigned teachers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.assignedTeachers.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {data.assignedTeachers.map((teacher) => (
                    <div key={teacher.id} className="rounded-lg border p-4">
                      <p className="font-semibold">{teacher.name}</p>
                      <p className="text-muted-foreground text-sm">{teacher.email}</p>
                      {teacher.subject && <Badge>{teacher.subject}</Badge>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No teachers have been assigned to this class yet.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold">Subjects</h3>
              <p className="text-muted-foreground text-sm">
                Review progress, chapter counts and assigned subject teachers.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge>{data.subjects.length} subjects</Badge>
              <Button size="sm" onClick={() => setAddSubjectDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Add subject
              </Button>
            </div>
          </div>

          {data.subjects.length === 0 ? (
            <EmptyState
              icon={GraduationCap}
              title="No subjects yet"
              description="Add subjects to this class to start tracking progress."
              action={{
                label: 'Back to classes',
                onClick: () => router.push('/admin/classes'),
              }}
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {data.subjects.map((subject) => (
                <Card key={subject.id} className="overflow-hidden">
                  <CardHeader>
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <CardTitle className="text-base">{subject.name}</CardTitle>
                        <p className="text-muted-foreground text-sm">
                          {subject._count.chapters} chapters · {subject.teachers.length} teachers
                          assigned
                        </p>
                      </div>
                      {subject.teachers.length > 0 && (
                        <Badge variant="secondary">{subject.teachers[0]?.user.name ?? '—'}</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-muted-foreground flex items-center justify-between text-sm">
                      <span>Subject completion</span>
                      <span>{formatPercent(subject.progressPercentage)}</span>
                    </div>
                    <Progress value={subject.progressPercentage} />
                    <p className="text-muted-foreground text-sm">
                      {subject.completedChapters} of {subject.totalChapters} chapters completed
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <Dialog open={addSubjectDialogOpen} onOpenChange={setAddSubjectDialogOpen}>
          <DialogContent className="flex max-h-[80vh] flex-col gap-0 p-0">
            <DialogHeader className="shrink-0 px-6 pb-4 pt-6">
              <DialogTitle>Add subject to {data.name}</DialogTitle>
              <DialogDescription>Select a subject to assign it to this class.</DialogDescription>
            </DialogHeader>

            <div className="min-h-0 flex-1 overflow-y-auto px-6">
              <div className="flex flex-wrap gap-2">
                {allSubjects.length === 0 && (
                  <p className="text-muted-foreground text-sm">No subjects available</p>
                )}
                {allSubjects.map((subject) => (
                  <button
                    key={subject.id}
                    type="button"
                    onClick={() => setSelectedSubjectIdForAssign(subject.id)}
                    className={`rounded-md border px-3 py-2 text-sm transition-colors ${
                      selectedSubjectIdForAssign === subject.id
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'hover:border-muted-foreground'
                    }`}
                  >
                    {subject.name}
                    {subject.code && (
                      <span className="ml-2 text-xs opacity-75">({subject.code})</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <DialogFooter className="shrink-0 border-t px-6 py-4">
              <Button variant="secondary" onClick={() => setAddSubjectDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (!selectedSubjectIdForAssign) {
                    toast.error('Please select a subject');
                    return;
                  }
                  assignSubjectMutation.mutate(selectedSubjectIdForAssign);
                }}
                disabled={assignSubjectMutation.isPending}
              >
                Assign subject
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardShell>
  );
}
