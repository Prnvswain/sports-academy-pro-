'use client';

import { use } from 'react';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { api, ApiError } from '@/services/api-client';
import { formatPercent } from '@/lib/utils';
import { toast } from 'sonner';
import { syllabusKeys } from '@/features/syllabus/query-keys';
import { useSchoolId } from '@/features/syllabus/hooks/use-school-id';

// ✅ Type updated to include server-computed progress fields
interface TeacherProfile {
  id: string;
  user: { name: string; email: string; phone: string | null };
  teacherClasses: {
    id: string;
    class: { id: string; name: string };
    subject: { id: string; name: string } | null;
  }[];
  chapterProgress: { chapterStatus: string; chapter: { title: string } }[];
  // ✅ Server-computed — based on assigned subjects only
  totalChapters: number;
  completedChapters: number;
  progressPercentage: number;
}

export default function TeacherProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();
  const schoolId = useSchoolId();
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');

  const { data: teacher, isLoading } = useQuery({
    queryKey: ['teacher', id],
    queryFn: () => api.get<TeacherProfile>(`/teachers/${id}`),
  });

  // ✅ Use server-computed values — accurate across all assigned subjects
  const completed = teacher?.completedChapters ?? 0;
  const total = teacher?.totalChapters ?? 0;
  const progress = teacher?.progressPercentage ?? 0;

  const {
    data: classesData,
    isLoading: classesLoading,
    isError: classesError,
    error: classesQueryError,
  } = useQuery({
    queryKey: syllabusKeys.classesList(schoolId),
    queryFn: () =>
      api.getPaginated<{ id: string; name: string }>('/syllabus/classes', {
        page: 1,
        pageSize: 100,
      }),
    enabled: assignOpen,
  });

  const classes = classesData?.items ?? [];

  const {
    data: subjects = [],
    isLoading: subjectsLoading,
    isError: subjectsError,
  } = useQuery({
    queryKey: [...syllabusKeys.subjects(schoolId), selectedClassId] as const,
    queryFn: () =>
      api.get<{ id: string; name: string; classId: string | null }[]>(
        '/syllabus/subjects',
        selectedClassId ? { classId: selectedClassId } : undefined,
      ),
    enabled: assignOpen && Boolean(selectedClassId),
  });

  const assignmentCards = useMemo(() => {
    const list = teacher?.teacherClasses ?? [];
    return list
      .filter((a) => a.subject !== null)
      .map((a) => ({
        id: a.id,
        label: `${a.subject!.name} · ${a.class.name}`,
      }));
  }, [teacher]);

  const addAssignment = useMutation({
    mutationFn: () =>
      api.post(`/teachers/${id}/assignments`, {
        classId: selectedClassId,
        subjectId: selectedSubjectId,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher', id] });
      toast.success('Assignment added');
      setSelectedSubjectId('');
      setAssignOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteAssignment = useMutation({
    mutationFn: (assignmentId: string) => api.delete(`/teachers/${id}/assignments/${assignmentId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher', id] });
      toast.success('Assignment removed');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <DashboardShell title="Teacher profile">
        <Skeleton className="h-64 w-full" />
      </DashboardShell>
    );
  }

  if (!teacher) {
    return (
      <DashboardShell title="Teacher profile">
        <p className="text-muted-foreground">Teacher not found.</p>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title={teacher.user.name}>
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>{teacher.user.email}</p>
            {teacher.user.phone && <p>{teacher.user.phone}</p>}
            <p className="text-muted-foreground">Assignments are managed below.</p>
          </CardContent>
        </Card>

        {/* Progress */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="mb-2 flex justify-between text-sm">
                <span>Chapter completion</span>
                <span>{formatPercent(progress)}</span>
              </div>
              <Progress value={progress} />
            </div>
            <p className="text-muted-foreground text-sm">
              {completed} of {total} chapters completed · {total - completed} pending
            </p>

            {/* Only show completed chapters */}
            {teacher.chapterProgress.filter((p) => p.chapterStatus === 'COMPLETED').length > 0 && (
              <ul className="space-y-2">
                {teacher.chapterProgress
                  .filter((p) => p.chapterStatus === 'COMPLETED')
                  .map((p, i) => (
                    <li key={i} className="flex justify-between rounded border p-2 text-sm">
                      <span>{p.chapter.title}</span>
                      <Badge variant="success">COMPLETED</Badge>
                    </li>
                  ))}
              </ul>
            )}

            {teacher.chapterProgress.length === 0 && (
              <p className="text-muted-foreground text-sm">No chapters completed yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Subject assignments */}
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Subject assignments</CardTitle>
            <Button onClick={() => setAssignOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add assignment
            </Button>
          </CardHeader>
          <CardContent>
            {assignmentCards.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No subject assignments yet. Add a class + subject pairing.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {assignmentCards.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <span className="text-sm font-medium">{a.label}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteAssignment.mutate(a.id)}
                      disabled={deleteAssignment.isPending}
                      aria-label="Remove assignment"
                    >
                      <Trash2 className="text-destructive h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add assignment dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add assignment</DialogTitle>
            <DialogDescription>Assign a subject to a class for this teacher.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Class</p>
              {classesLoading && <p className="text-muted-foreground text-sm">Loading classes…</p>}
              {classesError && (
                <p className="text-destructive text-sm">
                  {classesQueryError instanceof ApiError
                    ? classesQueryError.message
                    : 'Failed to load classes'}
                </p>
              )}
              {!classesLoading && !classesError && classes.length === 0 && (
                <p className="text-muted-foreground text-sm">
                  No classes found. Create classes under Admin → Classes first.
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {classes.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setSelectedClassId(c.id);
                      setSelectedSubjectId('');
                    }}
                    className={`rounded-md border px-3 py-1 text-sm transition-colors ${
                      selectedClassId === c.id
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'hover:border-muted-foreground'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Subject</p>
              {subjectsLoading && selectedClassId && (
                <p className="text-muted-foreground text-sm">Loading subjects…</p>
              )}
              {subjectsError && (
                <p className="text-destructive text-sm">Failed to load subjects for this class.</p>
              )}
              <div className="flex flex-wrap gap-2">
                {!subjectsLoading && subjects.length === 0 && (
                  <p className="text-muted-foreground text-sm">
                    {selectedClassId
                      ? 'No subjects linked to this class.'
                      : 'Select a class to see subjects.'}
                  </p>
                )}
                {subjects.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedSubjectId(s.id)}
                    className={`rounded-md border px-3 py-1 text-sm transition-colors ${
                      selectedSubjectId === s.id
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'hover:border-muted-foreground'
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>

            <Button
              className="w-full"
              onClick={() => addAssignment.mutate()}
              disabled={!selectedClassId || !selectedSubjectId || addAssignment.isPending}
            >
              Add assignment
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
