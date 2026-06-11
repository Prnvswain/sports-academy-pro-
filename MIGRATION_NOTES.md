# SAMS SaaS Migration Notes

> Generated during full codebase scan + Phase 1–3 implementation session.
> Target stack: Next.js 15 (App Router) + TypeScript + Prisma + MySQL multi-tenant.

## Codebase Scan Summary (Step 0)

### What already works (preserve)

| Area | Location | Status |
|------|----------|--------|
| Production Prisma schema | `prisma/schema.prisma` | Int PKs, `Coach` model, `DurationPlan`, `Receipt`, enrollments |
| Next.js foundation | `web/` | Auth (login/register), role layouts, landing page, admin dashboard API |
| Subscription limits | `web/src/lib/subscription.ts` | FREE/PRO/PLUS limits, expiry warnings |
| Fee helpers | `web/src/lib/fees.ts` | Enrollment fee + due date |
| Permissions matrix | `web/src/lib/permissions.ts` | Role-based capability checks |
| Mail templates | `web/src/lib/mail.ts` | Welcome + coach credential emails |
| Legacy Express API | `src/modules/` | Reference for business logic (uses obsolete `Payment` model) |
| Legacy Vite UI | `client/` | Reference UX for admin/coach panels |

### What is broken / outdated

| Issue | Detail |
|-------|--------|
| Prisma client path | Express imports `src/generated/prisma` (missing); client generates to `web/src/generated/prisma` only |
| `seed.js` | Wrong import path, legacy enum strings (`ADMIN`, `'active'`, `'Premium'`) |
| Express services | Reference `Payment`, `Batch.coach_id`, `DailyStudentNote` — not in current schema |
| JWT expiry | Hardcoded 24h; spec requires 15m access + 7d refresh rotation |
| No edge middleware | Subscription not enforced on navigation after login |
| Coach nav links | Point to routes that 404 (`/coach/attendance`, etc.) |
| API response shape | Missing `code` field on errors per spec |

### What was missing (implemented this session)

- `MIGRATION_NOTES.md` (this file)
- Edge `web/middleware.ts` — JWT + subscription guard
- Auth refresh/logout routes
- Core tenant-scoped API routes (sports, plans, batches, coaches, students, accounts, attendance, performance, notifications, settings)
- Shared libs: `env`, `geo`, `audit`, `errors`, `fee-calculator`, `due-date`, `require-auth`, `tenant`, `query`
- Updated `permissions.ts` to spec matrix
- Fixed `prisma/seed.js` for current schema
- Schema enum additions: `OVERDUE_FEE`, `ATTRIBUTE_REQUEST`

### Architectural decisions (spec vs implementation)

The master prompt specifies CUID string IDs, unified `User` model (no `Coach` table), separate `AcademySettings`/`Subscription` models. **We keep the existing production schema** because:

1. `web/` auth, dashboard API, and Prisma client already depend on Int IDs + `Coach` model.
2. Conceptual mapping is 1:1 — no business logic loss:

| Spec name | Current schema |
|-----------|----------------|
| `Plan` | `DurationPlan` |
| `PerformanceRecord` | `PerformanceScore` |
| `SubscriptionPlan` | `PlatformPlan` |
| `AcademySettings` | Fields on `Academy` (`registration_fee_default`, `attendance_radius_meters`, etc.) |
| `BatchStudent` | `Student.batch_id` + `StudentEnrollment.batch_id` |
| `User` (COACH role) | `Coach` table with login credentials |

3. Route structure: spec uses `/dashboard/*`; we add `/dashboard/*` route group with redirects from legacy `/admin/*` and `/coach/*` for backward compatibility.

### Tenant isolation (3 layers)

1. **Middleware** — `web/middleware.ts` validates JWT, checks subscription
2. **Service layer** — every API uses `requireAuth()` + `assertAcademyId()` + Prisma `where: { academy_id }`
3. **Mutations** — `assertEntityOwnership()` re-verifies FK belongs to tenant before write

### Phases progress

- [x] Phase 1 — Schema enum updates, seed fix
- [x] Phase 2 — Auth (access 15m, refresh 7d, logout, middleware)
- [x] Phase 3 — Core APIs (sports → settings)
- [ ] Phase 4 — Dashboard UI + charts (recharts)
- [ ] Phase 5 — Accounts PDF, reports export, cron jobs
- [ ] Phase 6 — Landing page full redesign + 3-step registration
- [ ] Phase 7 — Notification center UI, settings forms
- [ ] Phase 8 — Remove legacy `client/` + Express when parity reached

### Obsolete (do not port)

- `src/modules/import/` — bulk CSV upload
- `src/modules/notes/` — replaced by Performance Tracker
- `client/src/pages/CoachPortal.jsx` — superseded by split coach pages
- `Payment` model — replaced by `Receipt`

### Run locally

```bash
cp .env.example .env          # DATABASE_URL, JWT_SECRET, SMTP_*
npm run db:generate
npm run db:push
npm run db:seed

cd web && npm install && npm run dev   # http://localhost:3000
```

### Default credentials (after seed)

| Role | Email | Password |
|------|-------|----------|
| Super Admin | superadmin@sportsacademy.com | 123456 |
| Academy Admin | admin@sportsacademy.com | 123456 |
| Coach | coach1@sportsacademy.com | 123456 |
