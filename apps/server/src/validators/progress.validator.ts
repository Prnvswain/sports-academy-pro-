import { z } from 'zod';

export const updateChapterProgressSchema = z.object({
  teachingCompleted: z.boolean().optional(),
  qaCompleted: z.boolean().optional(),
  copyChecked: z.boolean().optional(),
});

export const updateTopicProgressSchema = z.object({
  status: z.enum(['PENDING', 'COMPLETED']),
});
