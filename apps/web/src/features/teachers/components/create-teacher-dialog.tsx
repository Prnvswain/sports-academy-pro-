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
  subjectIds: z.array(z.string()).optional().default([]),
  classIds: z.array(z.string()).optional().default([]),
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
    defaultValues: { classIds: [], subjectIds: [] },
  });

  const selectedClassIds = watch('classIds') ?? [];
  const selectedSubjectIds = watch('subjectIds') ?? [];

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

  useEffect(() => {
    if (!selectedSubjectIds?.length) return;
    if (!selectedClassIds?.length) return;
    const validIds = selectedSubjectIds.filter((sid) =>
      subjectsWithClass.some(
        (s) =>
          s.id === sid &&
          (s.class?.id
            ? selectedClassIds.includes(s.class.id)
            : selectedClassIds.includes(s.classId ?? '')),
      ),
    );
    if (validIds.length !== selectedSubjectIds.length) {
      setValue('subjectIds', validIds, { shouldValidate: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClassIds, subjectsWithClass]);

  const toggleClass = (id: string) => {
    const next = selectedClassIds.includes(id)
      ? selectedClassIds.filter((c) => c !== id)
      : [...selectedClassIds, id];
    setValue('classIds', next, { shouldValidate: true });
  };

  const toggleSubject = (id: string) => {
    const next = selectedSubjectIds.includes(id)
      ? selectedSubjectIds.filter((s) => s !== id)
      : [...selectedSubjectIds, id];
    setValue('subjectIds', next, { shouldValidate: true });
  };

  const onSubmit = async (data: FormData) => {
    const assignments: { subjectId: string; classId: string }[] = [];

    for (const subjectId of data.subjectIds ?? []) {
      const subject = subjectsWithClass.find((s) => s.id === subjectId);
      const classId = subject?.class?.id ?? subject?.classId;
      if (!classId) {
        toast.error(
          'Could not determine class for one of the selected subjects. Please re-select.',
        );
        return;
      }
      assignments.push({ subjectId, classId });
    }

    await (createTeacher.mutateAsync as Function)({
      name: data.name,
      email: data.email,
      phone: data.phone,
      classIds: data.classIds ?? [],
      assignments,
    });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[80vh] flex-col gap-0 p-0">
        <DialogHeader className="shrink-0 px-6 pb-4 pt-6">
          <DialogTitle>Add teacher</DialogTitle>
          <DialogDescription>
            Select classes and subjects for this teacher. Credentials will be emailed.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-2">
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
              <Label>
                Classes{' '}
                <span className="text-muted-foreground text-xs font-normal">(optional)</span>
              </Label>
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
            </div>

            <div className="space-y-2">
              <Label>
                Subject{' '}
                <span className="text-muted-foreground text-xs font-normal">(optional)</span>
              </Label>
              <div className="flex flex-wrap gap-2">
                {filteredSubjects.length === 0 && (
                  <p className="text-muted-foreground text-sm">
                    {selectedClassIds.length === 0
                      ? 'Select a class to see subjects.'
                      : 'No subjects available for selected classes.'}
                  </p>
                )}
                {filteredSubjects.map((s) => {
                  const clsName = s.class?.name ?? classes.find((c) => c.id === s.classId)?.name;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleSubject(s.id)}
                      className={`rounded-md border px-3 py-1 text-sm transition-colors ${
                        selectedSubjectIds.includes(s.id)
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'hover:border-muted-foreground'
                      }`}
                    >
                      {s.name}
                      {clsName ? (
                        <span className="ml-2 text-xs opacity-75">· {clsName}</span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="shrink-0 border-t px-6 py-4">
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create teacher
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
