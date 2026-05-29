import { ChapterWorkflowStatus } from '@school-syllabus/database';

export interface ChapterProgressFlags {
  teachingCompleted: boolean;
  qaCompleted: boolean;
  copyChecked: boolean;
}

export function computeChapterStatus(flags: ChapterProgressFlags): ChapterWorkflowStatus {
  const { teachingCompleted, qaCompleted, copyChecked } = flags;
  const completedCount = [teachingCompleted, qaCompleted, copyChecked].filter(Boolean).length;

  if (completedCount === 3) return ChapterWorkflowStatus.COMPLETED;
  if (completedCount === 0) return ChapterWorkflowStatus.PENDING;
  return ChapterWorkflowStatus.IN_PROGRESS;
}

export function computeCompletionPercentage(flags: ChapterProgressFlags): number {
  const status = computeChapterStatus(flags);
  if (status === ChapterWorkflowStatus.COMPLETED) return 100;
  const completedCount = [
    flags.teachingCompleted,
    flags.qaCompleted,
    flags.copyChecked,
  ].filter(Boolean).length;
  return Math.round((completedCount / 3) * 100);
}

export function computeOverallProgress(completed: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}
