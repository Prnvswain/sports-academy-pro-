# Architecture Documentation

## Phase Overview

| Phase | Status | Description |
|-------|--------|-------------|
| 1. Monorepo Setup | ✅ | pnpm workspaces, Turborepo, shared packages |
| 2. Backend Foundation | ✅ | Express MVC, env validation, error handling |
| 3. Prisma Schema | ✅ | Full schema with relations, indexes, soft delete |
| 4. Authentication | ✅ | JWT + refresh tokens, HttpOnly cookies |
| 5. RBAC & Middleware | ✅ | Role-based access for 3 user types |
| 6. Tenant Isolation | ✅ | JWT-derived school_id, tenant guard |
| 7. Frontend Foundation | ✅ | Next.js 15, feature-based architecture |
| 8. UI System | ✅ | shadcn-style components, dark mode |
| 9. Dashboards | ✅ | Admin, Super Admin, Teacher dashboards |
| 10. Teacher Management | ✅ | CRUD with email credentials |
| 11. Syllabus Management | ✅ | Classes, subjects, chapters, topics |
| 12. Chapter Workflow | ✅ | 3-step completion system |
| 13. Analytics | ✅ | Subject-wise progress charts |
| 14. PWA | ✅ | next-pwa, manifest.json |
| 15. Deployment | ✅ | Docker, docker-compose |

## Security Model

```
Request → Helmet → Rate Limit → CORS → Auth Middleware → RBAC → Tenant Guard → Controller
```

- Passwords: bcrypt (12 rounds), strength validation
- Tokens: Short-lived access (15m) + rotating refresh (7d)
- Cookies: HttpOnly, Secure in production, SameSite=Lax

## Data Flow: Chapter Progress

```
Teacher toggles step → PATCH /progress/chapters/:id
  → progressService.updateChapterProgress()
    → computeChapterStatus(flags)
    → Upsert chapter_progress with school_id from JWT
```

## Extending the Platform

1. Add subscription plan CRUD routes for super admin
2. Implement bulk CSV import for syllabus
3. Add WebSocket notifications
4. Add drag-and-drop reorder UI for chapters
5. Add activity timeline on teacher profile page
