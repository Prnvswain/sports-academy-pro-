'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GraduationCap, Plus, Trash2 } from 'lucide-react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import type { PaginatedResponse } from '@school-syllabus/types';
import { api } from '@/services/api-client';
import { toast } from 'sonner';
import { syllabusKeys } from '@/features/syllabus/query-keys';
import { invalidateSyllabusStructure } from '@/features/syllabus/invalidate-syllabus';
import { useSchoolId } from '@/features/syllabus/hooks/use-school-id';

interface ClassItem {
  id: string;
  name: string;
  grade: string | null;
  section: string | null;
  _count?: { subjects: number };
}

export default function AdminClassesPage() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [section, setSection] = useState('');
  const [description, setDescription] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<ClassItem | null>(null);
  const [deleteConfirmValue, setDeleteConfirmValue] = useState('');

  const qc = useQueryClient();
  const schoolId = useSchoolId();

  const { data, isLoading, isFetching } = useQuery({
    queryKey: syllabusKeys.classes(schoolId),
    queryFn: () => api.getPaginated<ClassItem>('/syllabus/classes', { page: 1, pageSize: 100 }),
    enabled: Boolean(schoolId),
  });

  const createClass = useMutation({
    mutationFn: () =>
      api.post<ClassItem>('/syllabus/classes', {
        name,
        section: section || undefined,
        description: description || undefined,
      }),
    onSuccess: async (created) => {
      qc.setQueryData<PaginatedResponse<ClassItem>>(syllabusKeys.classes(schoolId), (old) => {
        if (!old?.items) return old;
        return { ...old, items: [created, ...old.items], total: old.total + 1 };
      });
      await invalidateSyllabusStructure(qc, schoolId);
      toast.success('Class created');
      setOpen(false);
      setName('');
      setSection('');
      setDescription('');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteClass = useMutation({
    mutationFn: (id: string) => api.delete(`/syllabus/classes/${id}`),
    onSuccess: async (_, deletedId) => {
      qc.setQueryData<PaginatedResponse<ClassItem>>(syllabusKeys.classes(schoolId), (old) => {
        if (!old?.items) return old;
        return {
          ...old,
          items: old.items.filter((c: ClassItem) => c.id !== deletedId),
          total: Math.max(0, old.total - 1),
        };
      });
      await invalidateSyllabusStructure(qc, schoolId);
      toast.success('Class deleted');
      setDeleteTarget(null);
      setDeleteConfirmValue('');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const classes = data?.items ?? [];

  return (
    <DashboardShell title="Classes">
      <div className="space-y-6">
        <div className="flex justify-end">
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add class
          </Button>
        </div>

        {isLoading && !data ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : classes.length === 0 && !isFetching ? (
          <EmptyState
            icon={GraduationCap}
            title="No classes"
            description="Create classes to organize subjects and syllabus."
            action={{ label: 'Add class', onClick: () => setOpen(true) }}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {classes.map((cls) => (
              <div key={cls.id} className="relative group">
                <Link href={`/admin/classes/${cls.id}`}>
                  <Card className="h-full transition-shadow hover:shadow-lg">
                    <CardHeader className="pr-12">
                      <CardTitle className="text-lg">{cls.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                      {cls.section && <p>Section: {cls.section}</p>}
                      <p className="mt-1">{cls._count?.subjects ?? 0} subjects</p>
                    </CardContent>
                  </Card>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={(e) => {
                    e.preventDefault();
                    setDeleteTarget(cls);
                    setDeleteConfirmValue('');
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Create class dialog ── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>New class</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Class 10"
              />
            </div>
            <div className="space-y-2">
              <Label>Section</Label>
              <Input
                value={section}
                onChange={(e) => setSection(e.target.value)}
                placeholder="A"
              />
            </div>
            <div className="space-y-2">
              <Label>Description <span className="text-muted-foreground">(optional)</span></Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
              />
            </div>
            <Button
              className="w-full"
              onClick={() => createClass.mutate()}
              disabled={!name.trim() || createClass.isPending}
            >
              Create
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirmation dialog ── */}
      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setDeleteConfirmValue('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete class</DialogTitle>
            <DialogDescription>
              This will permanently delete <strong>{deleteTarget?.name}</strong> and all its
              subjects, chapters, and progress data. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>
              Type <span className="font-semibold text-foreground">{deleteTarget?.name}</span> to confirm
            </Label>
            <Input
              value={deleteConfirmValue}
              onChange={(e) => setDeleteConfirmValue(e.target.value)}
              placeholder={deleteTarget?.name ?? ''}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteTarget(null);
                setDeleteConfirmValue('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteConfirmValue !== deleteTarget?.name || deleteClass.isPending}
              onClick={() => deleteTarget && deleteClass.mutate(deleteTarget.id)}
            >
              Delete class
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}