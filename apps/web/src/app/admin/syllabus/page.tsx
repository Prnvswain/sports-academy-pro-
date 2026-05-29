'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpen, ChevronDown, ChevronRight, Pencil } from 'lucide-react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { api } from '@/services/api-client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { syllabusKeys } from '@/features/syllabus/query-keys';
import { invalidateSyllabusStructure } from '@/features/syllabus/invalidate-syllabus';
import { useSchoolId } from '@/features/syllabus/hooks/use-school-id';

interface Chapter {
  id: string;
  title: string;
}

interface Subject {
  id: string;
  name: string;
  chapters: Chapter[];
}

interface ClassNode {
  id: string;
  name: string;
  subjects: Subject[];
}

type EditingItem =
  | { type: 'subject'; id: string; name: string }
  | { type: 'chapter'; id: string; title: string }
;

export default function AdminSyllabusPage() {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<EditingItem | null>(null);
  const [value, setValue] = useState('');
  const [creatingChapterFor, setCreatingChapterFor] = useState<{ classId: string; subjectId: string } | null>(null);
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const queryClient = useQueryClient();
  const schoolId = useSchoolId();

  const { data: tree = [], isLoading } = useQuery({
    queryKey: syllabusKeys.syllabusTree(schoolId),
    queryFn: () => api.get<ClassNode[]>('/syllabus/tree'),
    enabled: Boolean(schoolId),
  });

  const mutation = useMutation({
    mutationFn: async ({ id, type, name }: { id: string; type: EditingItem['type']; name: string }) => {
      if (type === 'subject') {
        return api.patch(`/syllabus/subjects/${id}`, { name });
      }
      if (type === 'chapter') {
        return api.patch(`/syllabus/chapters/${id}`, { title: name });
      }
      return Promise.reject(new Error('Invalid edit type'));
    },
    onSuccess: async () => {
      await invalidateSyllabusStructure(queryClient, schoolId);
      toast.success('Syllabus updated');
      setEditing(null);
    },
    onError: () => {
      toast.error('Failed to save changes');
    },
  });

  const createChapterMutation = useMutation({
    mutationFn: (payload: { classId: string; subjectId: string; title: string }) =>
      api.post('/syllabus/chapters', payload),
    onSuccess: async (_, vars) => {
      await invalidateSyllabusStructure(queryClient, schoolId);
      queryClient.invalidateQueries({
        queryKey: syllabusKeys.class(schoolId, vars.classId),
      });
      queryClient.invalidateQueries({ queryKey: ['teacher-class', vars.classId] });
      toast.success('Chapter created');
      setCreatingChapterFor(null);
      setNewChapterTitle('');
    },
    onError: () => toast.error('Failed to create chapter'),
  });

  const deleteChapterMutation = useMutation({
    mutationFn: ({ chapterId }: { chapterId: string }) => api.delete(`/syllabus/chapters/${chapterId}`),
    onSuccess: async () => {
      await invalidateSyllabusStructure(queryClient, schoolId);
      queryClient.invalidateQueries({ queryKey: ['teacher-classes'] });
      toast.success('Chapter deleted');
    },
    onError: () => toast.error('Failed to delete chapter'),
  });

  const toggle = (key: string) => setExpanded((p) => ({ ...p, [key]: !p[key] }));

  const subtitle = useMemo(() => 'Update subject and chapter names directly in the syllabus tree. Changes appear instantly for teachers and admins.', []);

  const openEdit = (item: EditingItem) => {
    setEditing(item);
    setValue(item.type === 'subject' ? item.name : item.title);
  };

  return (
    <DashboardShell title="Syllabus">
      <p className="mb-6 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : tree.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No syllabus structure"
          description="Create classes and subjects first, then add chapters to build your syllabus."
        />
      ) : (
        <div className="space-y-4">
          {tree.map((cls) => (
            <Card key={cls.id} className="overflow-hidden">
              <button
                type="button"
                className="flex w-full items-center gap-2 p-4 text-left font-semibold hover:bg-muted/50"
                onClick={() => toggle(`class-${cls.id}`)}
              >
                {expanded[`class-${cls.id}`] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                {cls.name}
                <Badge variant="secondary" className="ml-auto">
                  {cls.subjects.length} subjects
                </Badge>
              </button>
              {expanded[`class-${cls.id}`] && (
                <div className="border-t px-4 pb-4">
                  {cls.subjects.map((subject) => (
                    <div key={subject.id} className="mt-3 rounded-lg border p-3">
                      <div className="flex items-center justify-between gap-4">
                        <button
                          type="button"
                          className="flex items-center gap-2 text-sm font-medium"
                          onClick={() => toggle(`subject-${subject.id}`)}
                        >
                          {expanded[`subject-${subject.id}`] ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                          {subject.name}
                        </button>
                        <Button variant="outline" size="sm" onClick={() => openEdit({ type: 'subject', id: subject.id, name: subject.name })}>
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </Button>
                      </div>
                      {expanded[`subject-${subject.id}`] && (
                        <div className="mt-2 space-y-2 pl-2">
                          <div className="flex flex-col gap-2">
                            {subject.chapters.map((chapter) => (
                              <div key={chapter.id} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
                                <div className="flex items-center gap-3">
                                  <button type="button" className="text-sm font-medium text-left" onClick={() => toggle(`chapter-${chapter.id}`)}>
                                    {chapter.title}
                                  </button>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button variant="ghost" size="sm" onClick={() => openEdit({ type: 'chapter', id: chapter.id, title: chapter.title })}>
                                    Edit
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => {
                                      if (confirm('Delete chapter — are you sure? This will remove the chapter from the syllabus.')) {
                                        deleteChapterMutation.mutate({ chapterId: chapter.id, classId: cls.id } as any);
                                      }
                                    }}
                                  >
                                    Delete
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="mt-2 flex items-center gap-2">
                            <Button size="sm" onClick={() => setCreatingChapterFor({ classId: cls.id, subjectId: subject.id })}>
                              + Add chapter
                            </Button>
                            {creatingChapterFor?.subjectId === subject.id && (
                              <div className="flex items-center gap-2">
                                <Input value={newChapterTitle} onChange={(e) => setNewChapterTitle(e.target.value)} placeholder="Chapter title" />
                                <Button
                                  onClick={() => {
                                    if (!newChapterTitle.trim()) return toast.error('Title is required');
                                    createChapterMutation.mutate({ classId: creatingChapterFor.classId, subjectId: creatingChapterFor.subjectId, title: newChapterTitle.trim() });
                                  }}
                                >
                                  Create
                                </Button>
                                <Button variant="ghost" onClick={() => setCreatingChapterFor(null)}>Cancel</Button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {editing?.type}</DialogTitle>
            <DialogDescription>Update the {editing?.type} name to keep the syllabus current.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder={`Enter ${editing?.type} name`}
            />
          </div>
          <DialogFooter className="space-x-2">
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                  editing && mutation.mutate({ id: editing.id, type: editing.type, name: value.trim() })
                }
                disabled={!value.trim() || mutation.isPending}
            >
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
