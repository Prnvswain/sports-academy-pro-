'use client';

import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/services/api-client';
import { useCreateTeacher } from '../hooks/use-teachers';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { syllabusKeys } from '@/features/syllabus/query-keys';
import { useSchoolId } from '@/features/syllabus/hooks/use-school-id';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  subjectId: z.string().uuid('Subject is required'),
  classIds: z.array(z.string()).min(1, 'Select at least one class'),
});

type FormData = z.infer<typeof schema>;

interface SubjectOption {
  id: string;
  name: string;
  classId?: string | null;
  class?: { id: string; name: string } | null;
}

interface ClassOption {
  id: string;
  name: string;
}

export function CreateTeacherDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createTeacher = useCreateTeacher();
  const schoolId = useSchoolId();

  const { data: subjects = [] } = useQuery({
    queryKey: syllabusKeys.subjects(schoolId),
    queryFn: () => api.get<SubjectOption[]>('/syllabus/subjects'),
    enabled: open && Boolean(schoolId),
  });

  const { data: classesData } = useQuery({
    queryKey: syllabusKeys.classesList(schoolId),
    queryFn: () => api.getPaginated<ClassOption>('/syllabus/classes', { page: 1, pageSize: 100 }),
    enabled: open && Boolean(schoolId),
  });

  const classes = classesData?.items ?? [];

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { classIds: [], subjectId: '' },
  });

  const selectedClassIds = watch('classIds');
  const selectedSubjectId = watch('subjectId');

  // Combine subjects with class info if missing by looking up classes
  const subjectsWithClass = useMemo(() => {
    return subjects.map((s) => {
      if (s.class) return s;
      const cls = classes.find((c) => c.id === s.classId);
      return { ...s, class: cls ? { id: cls.id, name: cls.name } : null };
    });
  }, [subjects, classes]);

  const filteredSubjects = useMemo(() => {
    if (!selectedClassIds || selectedClassIds.length === 0) return subjectsWithClass;
    return subjectsWithClass.filter((s) => {
      const cid = s.class?.id ?? s.classId;
      return cid ? selectedClassIds.includes(cid) : false;
    });
  }, [subjectsWithClass, selectedClassIds]);

  // Clear selected subject if it no longer belongs to selected classes
  useEffect(() => {
    if (!selectedSubjectId) return;
    if (!selectedClassIds || selectedClassIds.length === 0) return; // when no classes selected, keep subject
    const selectedStillValid = subjectsWithClass.some(
      (s) =>
        s.id === selectedSubjectId &&
        (s.class?.id
          ? selectedClassIds.includes(s.class.id)
          : selectedClassIds.includes(s.classId ?? '')),
    );
    if (!selectedStillValid) {
      setValue('subjectId', '' as any, { shouldValidate: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClassIds, subjectsWithClass, selectedSubjectId]);

  const toggleClass = (id: string) => {
    const next = selectedClassIds.includes(id)
      ? selectedClassIds.filter((c) => c !== id)
      : [...selectedClassIds, id];
    setValue('classIds', next, { shouldValidate: true });
  };

  const onSubmit = async (data: FormData) => {
    if (!data.subjectId || !data.subjectId.trim()) {
      toast.error('Please select a subject');
      return;
    }
    await createTeacher.mutateAsync(data);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add teacher</DialogTitle>
          <DialogDescription>
            One subject per teacher. Credentials will be emailed.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input {...register('name')} />
            {errors.name && <p className="text-destructive text-sm">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" {...register('email')} />
            {errors.email && <p className="text-destructive text-sm">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input {...register('phone')} />
          </div>
          <div className="space-y-2">
            <Label>Classes</Label>

            <div className="flex flex-wrap gap-2">
              {classes.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleClass(c.id)}
                  className={`rounded-md border px-3 py-1 text-sm transition-colors ${
                    selectedClassIds.includes(c.id)
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'hover:border-muted-foreground'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>

            {errors.classIds && (
              <p className="text-destructive text-sm">{errors.classIds.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Subject</Label>
            <div className="flex flex-wrap gap-2">
              {filteredSubjects.length === 0 && (
                <p className="text-muted-foreground text-sm">No subjects available</p>
              )}
              {filteredSubjects.map((s) => {
                const clsName = s.class?.name ?? classes.find((c) => c.id === s.classId)?.name;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setValue('subjectId', s.id, { shouldValidate: true });
                    }}
                    className={`rounded-md border px-3 py-1 text-sm transition-colors ${
                      selectedSubjectId === s.id
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'hover:border-muted-foreground'
                    }`}
                  >
                    {s.name}{' '}
                    {clsName ? (
                      <span className="text-muted-foreground ml-2 text-xs">· {clsName}</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
            {errors.subjectId && (
              <p className="text-destructive text-sm">{errors.subjectId.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create teacher
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
