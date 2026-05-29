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

export default function AdminSubjectsPage() {
  const queryClient = useQueryClient();
  const schoolId = useSchoolId();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');

  const { data, isLoading, isFetching } = useQuery({
    queryKey: syllabusKeys.subjects(schoolId),
    queryFn: () => api.get<Subject[]>('/syllabus/subjects'),
    enabled: Boolean(schoolId),
  });

  const subjects = data ?? [];

  const createMutation = useMutation({
    mutationFn: () =>
      api.post<Subject>('/syllabus/subjects', {
        name: name.trim(),
        code: code.trim() || undefined,
        description: description.trim() || undefined,
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
      <p className="mb-6 max-w-2xl text-sm text-muted-foreground">
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
                    <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add subject</DialogTitle>
            <DialogDescription>
              Provide a name for the new subject.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
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
          </div>

          <DialogFooter className="space-x-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!name.trim()) return toast.error('Name is required');
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