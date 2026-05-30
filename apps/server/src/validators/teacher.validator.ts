import { z } from 'zod';

const assignmentSchema = z.object({
  classId: z.string().uuid(),
  subjectId: z.string().uuid(),
});

/**
 * Supports:
 * - Legacy: { classIds: string[] }
 * - New:    { assignments: [{ classId, subjectId }] }
 */
export const createTeacherSchema = z
  .object({
    name: z.string().min(2),
    email: z.string().email(),
    phone: z.string().optional(),
    classIds: z.array(z.string().uuid()).optional(),
    assignments: z.array(assignmentSchema).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.assignments && val.assignments.length > 0) {
      const keys = new Set<string>();
      for (const a of val.assignments) {
        const key = `${a.classId}:${a.subjectId}`;
        if (keys.has(key)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Duplicate assignment in payload',
            path: ['assignments'],
          });
          break;
        }
        keys.add(key);
      }
    }
  });

export const teacherIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const assignmentIdParamSchema = z.object({
  id: z.string().uuid(),
  assignmentId: z.string().uuid(),
});

export const createAssignmentSchema = z.object({
  classId: z.string().uuid(),
  subjectId: z.string().uuid(),
});
