'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { api } from '@/services/api-client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ChapterWorkflowCardProps {
  chapterId: string;
  title: string;
  progress: {
    teachingCompleted: boolean;
    qaCompleted: boolean;
    copyChecked: boolean;
    chapterStatus: string;
    completionPercentage: number;
  } | null;
  invalidateQueryKeys?: readonly unknown[][];
}

const steps = [
  { key: 'teachingCompleted' as const, label: 'Teaching Done' },
  { key: 'qaCompleted' as const, label: 'Q&A Done' },
  { key: 'copyChecked' as const, label: 'Copy Checked' },
];

export function ChapterWorkflowCard({ chapterId, title, progress, invalidateQueryKeys = [] }: ChapterWorkflowCardProps) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: Record<string, boolean>) => api.patch(`/progress/chapters/${chapterId}`, data),
    onMutate: async (data) => {
      const previous = invalidateQueryKeys.map((key) => ({ key, data: queryClient.getQueryData(key) }));

      invalidateQueryKeys.forEach((key) => {
        queryClient.setQueryData(key, (oldData: any) => {
          if (!oldData) return oldData;

          const updateChapter = (item: any) => {
            if (item?.id === chapterId) {
              return {
                ...item,
                chapterProgress: [
                  {
                    ...(item.chapterProgress?.[0] ?? {}),
                    ...{
                      teachingCompleted: data.teachingCompleted ?? item.chapterProgress?.[0]?.teachingCompleted,
                      qaCompleted: data.qaCompleted ?? item.chapterProgress?.[0]?.qaCompleted,
                      copyChecked: data.copyChecked ?? item.chapterProgress?.[0]?.copyChecked,
                    },
                  },
                ],
              };
            }
            if (Array.isArray(item.subjects)) {
              return {
                ...item,
                subjects: item.subjects.map((subject: any) => ({
                  ...subject,
                  chapters: subject.chapters?.map(updateChapter),
                })),
              };
            }
            return item;
          };

          if (Array.isArray(oldData)) {
            return oldData.map(updateChapter);
          }

          return updateChapter(oldData);
        });
      });

      return { previous };
    },
    onSuccess: () => {
      invalidateQueryKeys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
      queryClient.invalidateQueries({ queryKey: ['teacher-progress'] });
      toast.success('Progress updated');
    },
    onError: (_, __, context) => {
      context?.previous.forEach((item: any) => {
        queryClient.setQueryData(item.key, item.data);
      });
      toast.error('Failed to update progress');
    },
  });

  const flags = {
    teachingCompleted: progress?.teachingCompleted ?? false,
    qaCompleted: progress?.qaCompleted ?? false,
    copyChecked: progress?.copyChecked ?? false,
  };

  const isCompleted = progress?.chapterStatus === 'COMPLETED';

  const toggleStep = (key: keyof typeof flags) => {
    mutation.mutate({ [key]: !flags[key] });
  };

  return (
    <Card className={cn(isCompleted && 'border-emerald-500/30 bg-emerald-500/5')}>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant={isCompleted ? 'success' : progress?.chapterStatus === 'IN_PROGRESS' ? 'warning' : 'destructive'}>
              {isCompleted ? 'Completed' : progress?.chapterStatus ?? 'Pending'}
            </Badge>
          </div>
        </div>
        {isCompleted && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
            <Badge variant="success">✓ Chapter Completed</Badge>
          </motion.div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={progress?.completionPercentage ?? 0} />
        <div className="space-y-2">
          {steps.map((step) => {
            const done = flags[step.key];
            return (
              <Button
                key={step.key}
                variant="outline"
                className={cn(
                  'w-full justify-between',
                  done && 'border-emerald-500/50 bg-emerald-500/10',
                )}
                onClick={() => toggleStep(step.key)}
                disabled={mutation.isPending}
              >
                <span>{step.label}</span>
                {mutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : done ? (
                  <Check className="h-4 w-4 text-emerald-600" />
                ) : (
                  <X className="h-4 w-4 text-red-500" />
                )}
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
