'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Trash2, Upload, Users } from 'lucide-react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { CreateTeacherDialog } from '@/features/teachers/components/create-teacher-dialog';
import { BulkImportTeachersDialog } from '@/features/teachers/components/bulk-import-dialog';
import { useTeachers, useDeleteTeacher } from '@/features/teachers/hooks/use-teachers';

export default function AdminTeachersPage() {
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const { data, isLoading } = useTeachers({ search: search || undefined });
  const deleteTeacher = useDeleteTeacher();

  const teachers = data?.items ?? [];

  return (
    <DashboardShell title="Teachers">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-sm flex-1">
            <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder="Search teachers..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setBulkOpen(true)}>
              <Upload className="mr-2 h-4 w-4" /> Bulk import
            </Button>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add teacher
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : teachers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No teachers yet"
            description="Add your first teacher to start tracking syllabus progress."
            action={{ label: 'Add teacher', onClick: () => setDialogOpen(true) }}
          />
        ) : (
          <Card>
            <div className="divide-y">
              {teachers.map((teacher) => (
                <div
                  key={teacher.id}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <Link
                      href={`/admin/teachers/${teacher.id}`}
                      className="font-semibold hover:underline"
                    >
                      {teacher.user.name}
                    </Link>
                    <p className="text-muted-foreground text-sm">{teacher.user.email}</p>
                    {teacher.user.phone && (
                      <p className="text-muted-foreground text-sm">{teacher.user.phone}</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {teacher.teacherClasses.length === 0 && (
                        <Badge variant="secondary">No subject</Badge>
                      )}
                      {teacher.teacherClasses.map((tc) => (
                        <Badge key={`${tc.classId}-${tc.subjectId || 'all'}`} variant="outline">
                          {tc.class.name}
                          {tc.subject?.name ? ` (${tc.subject.name})` : ''}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (confirm('Delete this teacher?')) deleteTeacher.mutate(teacher.id);
                    }}
                  >
                    <Trash2 className="text-destructive h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      <CreateTeacherDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      <BulkImportTeachersDialog open={bulkOpen} onOpenChange={setBulkOpen} />
    </DashboardShell>
  );
}
