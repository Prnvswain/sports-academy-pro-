'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookMarked, Trash, Plus } from 'lucide-react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { api } from '@/services/api-client';
import { toast } from 'sonner';
import { syllabusKeys } from '@/features/syllabus/query-keys';
import { invalidateSyllabusStructure } from '@/features/syllabus/invalidate-syllabus';
import { useSchoolId } from '@/features/syllabus/hooks/use-school-id';

interface Subject {
  id: string;
  name: string;
  code?: string | null;
  description?: string | null;
  class?: { id: string; name: string } | null;
}

interface ClassOption {
  id: string;
  name: string;
}

export default function AdminSubjectsPage() {
  const queryClient = useQueryClient();
  const schoolId = useSchoolId();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [classId, setClassId] = useState('');

  const { data, isLoading, isFetching } = useQuery({
    queryKey: syllabusKeys.subjects(schoolId),
    queryFn: () => api.get<Subject[]>('/syllabus/subjects'),
    enabled: Boolean(schoolId),
  });

  const { data: classesData } = useQuery({
    queryKey: syllabusKeys.classesList(schoolId),
    queryFn: () => api.getPaginated<ClassOption>('/syllabus/classes', { page: 1, pageSize: 100 }),
    enabled: open && Boolean(schoolId),
  });

  const classes = classesData?.items ?? [];
  const subjects = data ?? [];

  const createMutation = useMutation({
    mutationFn: () =>
      api.post<Subject>('/syllabus/subjects', {
        name: name.trim(),
        code: code.trim() || undefined,
        description: description.trim() || undefined,
        classId: classId || undefined,
      }),
    onSuccess: async (created) => {
      queryClient.setQueryData<Subject[]>(syllabusKeys.subjects(schoolId), (old) =>
        old ? [...old, created] : [created],
      );
      await invalidateSyllabusStructure(queryClient, schoolId);
      toast.success('Subject created');
      setOpen(false);
      setName('');
      setCode('');
      setDescription('');
      setClassId('');
    },
    onError: () => toast.error('Failed to create subject'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/syllabus/subjects/${id}`),
    onSuccess: async (_, deletedId) => {
      queryClient.setQueryData<Subject[]>(syllabusKeys.subjects(schoolId), (old) =>
        old ? old.filter((s) => s.id !== deletedId) : old,
      );
      await invalidateSyllabusStructure(queryClient, schoolId);
      toast.success('Subject deleted');
    },
    onError: () => toast.error('Failed to delete subject'),
  });

  return (
    <DashboardShell title="Subjects">
      <p className="text-muted-foreground mb-6 max-w-2xl text-sm">
        Create and manage subjects used in the syllabus and teacher assignments.
      </p>

      <div className="mb-4 flex items-center gap-2">
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add subject
        </Button>
      </div>

      {isLoading && !data ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : subjects.length === 0 && !isFetching ? (
        <EmptyState
          icon={BookMarked}
          title="No subjects"
          description="Add subjects to get started with syllabus and teacher assignments."
          action={{ label: 'Add subject', onClick: () => setOpen(true) }}
        />
      ) : (
        <div className="space-y-3">
          {subjects.map((s) => (
            <Card key={s.id}>
              <CardContent className="flex items-center justify-between gap-4 py-4">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{s.name}</span>
                    {s.code && <Badge variant="secondary">{s.code}</Badge>}
                    {s.class && <Badge>{s.class.name}</Badge>}
                  </div>
                  {s.description && (
                    <p className="text-muted-foreground mt-1 text-sm">{s.description}</p>
                  )}
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={deleteMutation.isPending}
                  onClick={() => {
                    if (confirm('Delete this subject? This cannot be undone.')) {
                      deleteMutation.mutate(s.id);
                    }
                  }}
                >
                  <Trash className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[80vh] flex-col gap-0 p-0">
          <DialogHeader className="shrink-0 px-6 pb-4 pt-6">
            <DialogTitle>Add subject</DialogTitle>
            <DialogDescription>
              Provide a name and optionally assign this subject to a class.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Mathematics"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Code <span className="text-muted-foreground">(optional)</span>
              </label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. MATH-10"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Description <span className="text-muted-foreground">(optional)</span>
              </label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Class</label>
              {classes.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No classes found. Create classes first.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {classes.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setClassId(classId === c.id ? '' : c.id)}
                      className={`rounded-md border px-3 py-1 text-sm transition-colors ${
                        classId === c.id
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'hover:border-muted-foreground'
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="shrink-0 border-t px-6 py-4">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!name.trim()) return toast.error('Name is required');
                if (!classId) return toast.error('Please select a class');
                createMutation.mutate();
              }}
              disabled={createMutation.isPending}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
