- [x] Investigate root cause: class/subject create vs list vs details mismatch (tenantId/schoolId, filters, soft delete).
- [ ] Verify Prisma queries used by /syllabus/classes (list) and /syllabus/classes/:id (detail) and ensure they include expected records.
- [ ] Fix any broken Prisma filters (e.g., softDeleteFilter mismatch, subject where clause).
- [ ] Fix frontend data fetching/cache invalidation for newly created classes/subjects.
- [ ] Add targeted API + frontend logs to confirm tenant context, ids, and returned counts.
- [ ] Ensure detail-page queries use latest IDs and refresh on navigation/mutations.
- [ ] Validate route params parsing (Next.js params promise + id string).
- [ ] Add React Query cache configuration/invalidations for all relevant query keys.
- [ ] Run tests/build (or start dev server) and confirm after Prisma reset/migrations.


