'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api } from '@/services/api-client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Topic {
  id: string;
  title: string;
  topicProgress?: { status: string }[];
}

export function TopicList({ topics, readOnly = false }: { topics: Topic[]; readOnly?: boolean }) {
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ topicId, status }: { topicId: string; status: 'PENDING' | 'COMPLETED' }) =>
      api.patch(`/progress/topics/${topicId}`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chapters'] });
      qc.invalidateQueries({ queryKey: ['teacher-progress'] });
      toast.success('Topic updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <ul className="space-y-2">
      {topics.map((topic) => {
        const done = topic.topicProgress?.[0]?.status === 'COMPLETED';
        return (
          <li
            key={topic.id}
            className={cn(
              'flex items-center justify-between rounded-lg border p-3',
              done && 'border-emerald-500/30 bg-emerald-500/5',
            )}
          >
            <span className="text-sm font-medium">{topic.title}</span>
            <div className="flex items-center gap-2">
              <Badge variant={done ? 'success' : 'destructive'}>
                {done ? (
                  <><Check className="mr-1 h-3 w-3" /> Done</>
                ) : (
                  <><X className="mr-1 h-3 w-3" /> Pending</>
                )}
              </Badge>
              {!readOnly && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    mutation.mutate({ topicId: topic.id, status: done ? 'PENDING' : 'COMPLETED' })
                  }
                >
                  {done ? 'Undo' : 'Complete'}
                </Button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
