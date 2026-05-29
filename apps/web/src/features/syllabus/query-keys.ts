/**
 * Tenant-scoped React Query keys for syllabus structure (classes, subjects, tree).
 * Always include schoolId so caches never bleed across schools.
 */
export const syllabusKeys = {
  all: (schoolId?: string | null) => ['syllabus', schoolId] as const,

  classes: (schoolId?: string | null) => ['classes', schoolId] as const,

  class: (schoolId: string | null | undefined, classId: string) =>
    ['class', schoolId, classId] as const,

  subjects: (schoolId?: string | null) => ['subjects', schoolId] as const,

  subjectsForAssignment: (schoolId?: string | null, classId?: string) =>
    ['subjects-for-assignment', schoolId, classId] as const,

  syllabusTree: (schoolId?: string | null) => ['syllabus-tree', schoolId] as const,

  /** Used by teacher creation dialog */
  classesList: (schoolId?: string | null) => ['classes-list', schoolId] as const,
};
