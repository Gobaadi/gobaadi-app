# Backend Merge — Quick Reference

> Full details: `md/MERGE_PLAN.md`
> Comparison: `md/SWAGGER_VS_BACKEND_COMPARISON.md`

---

## What We're Doing

Merge the **Prisma dashboard backend** (port 7000, swagger.md) into the **NestJS backend** (port 3000). Both frontends (Expo mobile + Next.js admin dashboard) will hit one NestJS backend after merge.

## Decisions Made

| Decision | Choice |
|---|---|
| Admin entity | **Separate `admins` table** (Option A) |
| Frontend targets | Both Expo + Next.js → NestJS |
| Response format | `{ success, statusCode, message, data, meta }` |
| Auth method | Bearer token + cookie fallback (`token` / `adminToken`) |
| Database | **Fresh start** — drop all, migrate, seed |
| Admin designation spelling | `co_founder` (underscore) |

---

## 8 Phases

### Phase 1 — Entities (30 min)
- `Admin` entity → `admins` table (id, name, email, password, role, designation, avatar, phone, status, verified, createdAt, updatedAt)
- `AdminRefreshToken` entity → `admin_refresh_tokens` table
- Add `@UpdateDateColumn() updatedAt` to existing `User` entity
- New enums: `AdminRole`, `AdminDesignation`, `AdminStatus`

### Phase 2 — Admin Auth (3-4 hrs) ⬅️ BIGGEST
- Separate JWT strategy for admins (payload: `{ sub, role, type: 'admin' }`)
- Admin JWT guard + roles guard + decorators
- `AdminAuthService` — login, register, send-otp, verify-otp, forgot-password, reset-password, refresh, logout, getProfile, updateProfile
- `AdminAuthController` — 10 routes under `/admins/*`
- 8 DTO files

### Phase 3 — Admin CRUD (1-2 hrs)
- `AdminService` — findAll, findById, create, update, delete, deactivate
- `AdminController` — 6 routes under `/admins/`, `/admins/:id`
- All behind `AdminJwtAuthGuard` + `@AdminRoles(AdminRole.SUPER_ADMIN)`

### Phase 4 — Response Envelope (1-2 hrs)
- Global interceptor wraps ALL responses
- Exception filter for error format
- `PaginatedResult<T>` maps to `{ data, meta: { page, limit, total, totalPage } }`

### Phase 5 — Cookie Auth (30 min)
- User JWT guard: extract from `Authorization: Bearer` OR `token` cookie
- Admin JWT guard: extract from `Authorization: Bearer` OR `adminToken` cookie
- Install `cookie-parser` + `@types/cookie-parser`

### Phase 6 — Missing Endpoints (1 hr)
- `GET /notifications/:id` — single notification fetch
- `GET /notifications/user` — user's own notifications (alias)
- `GET /notifications/unread-count` — unread count
- `DELETE /users/:id` — admin delete user
- `PUT /users/:id` — admin full update user

### Phase 7 — Route Aliases (1 hr)
- `GET /auth/profile` → `GET /users/me`
- `GET /users/` → `GET /admin/users`
- `POST /notifications/read-all` → method change to `PATCH`
- Notification send/broadcast path aliases

### Phase 8 — Fresh DB Migration (30 min)
- Drop all tables
- Generate TypeORM migration
- Run migration
- Seed first super_admin (`admin@gobadi.com`)

---

## File Inventory

### New Files (15)

| File | Purpose |
|---|---|
| `src/admin/entities/admin.entity.ts` | Admin entity |
| `src/admin/entities/admin-refresh-token.entity.ts` | Admin refresh token entity |
| `src/admin/admin-auth.service.ts` | Admin auth business logic |
| `src/admin/admin-auth.controller.ts` | Admin auth routes (`/admins/*`) |
| `src/admin/admin.service.ts` | Admin CRUD logic |
| `src/admin/admin.controller.ts` | Admin CRUD routes |
| `src/admin/strategies/admin-jwt.strategy.ts` | Admin JWT strategy |
| `src/admin/guards/admin-jwt-auth.guard.ts` | Admin JWT guard |
| `src/admin/guards/admin-roles.guard.ts` | Admin roles guard |
| `src/admin/decorators/admin-roles.decorator.ts` | `@AdminRoles()` decorator |
| `src/admin/decorators/current-admin.decorator.ts` | `@CurrentAdmin()` decorator |
| `src/admin/dto/admin-login.dto.ts` | Login DTO |
| `src/admin/dto/admin-register.dto.ts` | Register DTO |
| `src/admin/dto/admin-otp.dto.ts` | Send/Verify OTP DTOs |
| `src/admin/dto/admin-password.dto.ts` | Forgot/Reset password DTOs |
| `src/admin/dto/admin-update-profile.dto.ts` | Update profile DTO |
| `src/admin/dto/admin-refresh-token.dto.ts` | Refresh token DTO |
| `src/common/interceptors/response.interceptor.ts` | Response envelope interceptor |
| `src/common/filters/http-exception.filter.ts` | Error response filter |
| `src/common/response.interface.ts` | `ApiResponse<T>` type |

### Modified Files (10)

| File | Changes |
|---|---|
| `src/admin/admin.module.ts` | Register entities, services, controllers, imports |
| `src/auth/guards/jwt-auth.guard.ts` | Add cookie extraction (`token`) |
| `src/notifications/notifications.controller.ts` | Add 3 endpoints, change `read-all` to PATCH |
| `src/notifications/notifications.service.ts` | Add `findById`, `getUnreadCount` |
| `src/users/users.controller.ts` | Add `DELETE /:id`, `PUT /:id` |
| `src/users/users.service.ts` | Add `deleteUser`, `updateUser` |
| `src/users/user.entity.ts` | Add `@UpdateDateColumn() updatedAt` |
| `src/main.ts` | Add cookie parser, response interceptor, exception filter |
| `src/auth/auth.controller.ts` | Add `GET /auth/profile` alias |
| `package.json` | Install `cookie-parser`, `@types/cookie-parser` |

---

## Admin Entity Schema

```
admins
├── id              Int       PK, autoincrement
├── name            String?   
├── email           String    unique
├── password        String    
├── role            AdminRole default: admin
├── designation     AdminDesignation
├── avatar          String?   
├── phone           String?   
├── status          AdminStatus default: active
├── verified        Boolean   default: false
├── createdAt       DateTime  default: now()
└── updatedAt       DateTime  @updatedAt
```

### Enums

```
AdminRole:        admin, super_admin
AdminDesignation: founder, co_founder, manager, developer, analyst, support
AdminStatus:      active, deactive
```

---

## Admin Auth Routes

```
POST   /admins/login            → email + password → { admin, accessToken, refreshToken }
POST   /admins/register         → create admin (super_admin only)
POST   /admins/send-otp         → email → OTP sent
POST   /admins/verify-otp       → email + code → { verified, tokens }
POST   /admins/forgot-password  → email → reset code sent
POST   /admins/reset-password   → resetToken + newPassword → success
POST   /admins/refresh          → refreshToken → new token pair
POST   /admins/logout           → revoke refresh token
GET    /admins/profile          → get authenticated admin
PATCH  /admins/profile          → update name/designation/password
```

## Admin Management Routes

```
GET    /admins/                 → list all admins (paginated)
POST   /admins/                 → create admin
GET    /admins/:id              → get admin by ID
PUT    /admins/:id              → update admin
DELETE /admins/:id              → delete admin
PATCH  /admins/:id/deactivate   → deactivate admin
```

All management routes require `super_admin` role.

---

## Implementation Order

```
Step 1 → Phase 1: Entities          (30 min)
Step 2 → Phase 2: Admin Auth        (3-4 hrs)
Step 3 → Phase 3: Admin CRUD        (1-2 hrs)
Step 4 → Phase 4: Response Envelope (1-2 hrs)
Step 5 → Phase 5: Cookie Auth       (30 min)
Step 6 → Phase 6: Missing Endpoints (1 hr)
Step 7 → Phase 7: Route Aliases     (1 hr)
Step 8 → Phase 8: Fresh Migration   (30 min)
────────────────────────────────────────────────
Total                                ~8-10 hours
```

---

## Risk Areas

| Risk | Impact | Mitigation |
|---|---|---|
| Response envelope breaks frontend | HIGH | Test all Expo screens after Phase 4 |
| Admin JWT conflicts with user JWT | HIGH | `type: 'admin'` in payload prevents misuse |
| Cookie parser conflicts | MEDIUM | Cookie is fallback — Bearer still primary |
| `synchronize: true` in prod | HIGH | Set `false` before deploy |
| Migration drops data | HIGH | Backup before Phase 8 |

---

## Testing Checklist

- [ ] Phase 1: Migration runs, tables created
- [ ] Phase 2: `POST /admins/login` returns admin + tokens
- [ ] Phase 3: `GET /admins/` returns paginated list
- [ ] Phase 4: All endpoints return `{ success, statusCode, message, data }`
- [ ] Phase 5: Cookie auth works alongside Bearer
- [ ] Phase 6: `GET /notifications/unread-count` returns count
- [ ] Phase 7: Expo app + Next.js dashboard both work
- [ ] Phase 8: Fresh DB has all tables, seed admin exists
