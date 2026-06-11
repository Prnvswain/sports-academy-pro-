# SAMS SaaS Migration Plan

## Architecture shift

| Layer | Legacy | Target |
|-------|--------|--------|
| Frontend | Vite + React (`client/`) | Next.js 15 App Router (`web/`) |
| API | Express (`src/modules/`) | Next.js Route Handlers (`web/src/app/api/`) |
| ORM | Prisma 5 → MySQL | Prisma → MySQL (normalized SaaS schema) |
| Auth | JWT in localStorage | HTTP-only cookies + JWT |
| UI | Custom Tailwind | shadcn-style components + Tailwind v4 |

Express + Vite remain during transition. New features ship in `web/` only.

## Phases

### Phase 1 — Foundation (current)
- [x] Production Prisma schema (`prisma/schema.prisma`)
- [x] Next.js 15 app (`web/`)
- [x] Auth (register, login), subscription guards, fee engine libs
- [x] Role layouts + landing + admin dashboard API shell

### Phase 2 — Data migration
1. `npx prisma migrate dev` (or `db push` on staging)
2. Map legacy `payments` → `receipts` (SQL script)
3. Map `users.role` string → `UserRole` enum
4. Seed `platform_plans` (FREE / PRO / PLUS)
5. Backfill `duration_plans` per academy

### Phase 3 — Module APIs (port from Express)
- Sports, Duration Plans, Batches (+ `batch_coaches` M2M)
- Coaches (split name fields, credential email)
- Students + enrollments + fee preview
- Accounts (receipts, dues, PDF)
- Attendance (GPS radius for coach present)
- Performance (replace `daily_student_notes`)
- Reports + exports
- Notifications cron
- Super Admin platform routes

### Phase 4 — UI completion
- All sidebar pages with RHF + Zod
- Charts (recharts) on dashboards
- Settings, receipt PDF, dark mode
- Remove `client/` and Express when parity reached

## Subscription enforcement
- Limits: FREE 3/30, PRO 6/80, PLUS unlimited
- Warnings at 4, 3, 2, 1 days before expiry
- Expired → block all academy routes (`resolveAcademyAccess`)

## Obsolete modules to remove
- `src/modules/import/` (bulk upload — not in scope)
- `src/modules/notes/` → replaced by Performance Tracker
- Parent portal (never existed)

## Run locally

```bash
# From repo root
cp .env.example .env   # configure DATABASE_URL, JWT_SECRET, SMTP_*

npm run db:generate
npm run db:push        # or migrate dev

cd web && cp .env.example .env.local  # symlink DATABASE_URL from root
npm run dev            # http://localhost:3000
```

Legacy API: `npm start` (port 5000) until decommissioned.
