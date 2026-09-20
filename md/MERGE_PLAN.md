# Backend Merge Plan: Prisma → NestJS

> **Goal:** Merge swagger backend (Prisma, port 7000) into NestJS backend (TypeORM, port 3000).
> **Decisions made:** Separate `admins` table, both frontends hit NestJS, `{success, statusCode, message, data, meta}` envelope, cookie auth, fresh DB, `co_founder` underscore.

---

## Architecture Overview

### What exists now (NestJS)
- Unified `User` entity — no admin-specific fields
- `UserRole`: user, doctor, clinic, admin
- Auth: `/auth/*` — single auth system
- Admin module: controllers that manage OTHER entities (users, orders, notifications, etc.)
- NO separate admin auth, NO admin CRUD, NO admin entity
- NO response envelope, NO cookie auth

### What we're adding (from Prisma)
- `Admin` entity — separate table with `designation`, `status`, `super_admin`
- `AdminRefreshToken` entity — separate token table
- Admin auth: `/admins/login`, `/admins/send-otp`, etc.
- Admin management: `GET/POST/PUT/DELETE /admins/`, `/admins/:id`, deactivate
- Response envelope interceptor
- Cookie-based auth fallback

---

## Phase 1: Database Entities (Foundation)

**Why first:** Everything depends on these entities existing.

### 1.1 Create `Admin` entity
**File:** `backend/src/admin/entities/admin.entity.ts`

```typescript
// TypeORM entity mapping to `admins` table
// Fields from Prisma schema:
//   id, name, email, password, role(AdminRole), designation(AdminDesignation),
//   avatar, phone, status(AdminStatus), verified, createdAt, updatedAt
```

Enums to add:
- `AdminRole`: `admin`, `super_admin`
- `AdminDesignation`: `founder`, `co_founder`, `manager`, `developer`, `analyst`, `support`
- `AdminStatus`: `active`, `deactive`

### 1.2 Create `AdminRefreshToken` entity
**File:** `backend/src/admin/entities/admin-refresh-token.entity.ts`

```typescript
// Maps to `admin_refresh_tokens` table
// Fields: id, adminId, tokenHash, expiresAt, revokedAt, createdAt
// Same pattern as existing RefreshToken entity
```

### 1.3 Register entities in `AdminModule`
**File:** `backend/src/admin/admin.module.ts`

Add `TypeOrmModule.forFeature([Admin, AdminRefreshToken])` to imports.

---

## Phase 2: Admin Auth Module

**Why second:** Admin auth is the most critical missing piece.

### 2.1 Admin JWT Strategy
**File:** `backend/src/auth/strategies/admin-jwt.strategy.ts`

- Separate JWT strategy for admins
- Extracts token from: `Authorization: Bearer` header OR `adminToken` cookie
- Payload: `{ sub: adminId, role: AdminRole }`
- Uses same JWT secret but different token type (or separate secret — decide)

**Decision needed:** Same JWT secret or different? Same = simpler, different = better isolation.
**Recommendation:** Same secret, add `type: 'admin'` to payload to differentiate.

### 2.2 Admin JWT Guard
**File:** `backend/src/admin/guards/admin-jwt-auth.guard.ts`

- Validates admin JWT tokens
- Checks `type === 'admin'` in payload
- Attaches `request.admin` (not `request.user`)

### 2.3 Admin Roles Guard
**File:** `backend/src/admin/guards/admin-roles.guard.ts`

- Checks `AdminRole` from `@AdminRoles()` decorator
- Supports `super_admin` checks

### 2.4 Admin Roles Decorator
**File:** `backend/src/admin/decorators/admin-roles.decorator.ts`

- `@AdminRoles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)`

### 2.5 Current Admin Decorator
**File:** `backend/src/admin/decorators/current-admin.decorator.ts`

- Extracts `request.admin` — similar pattern to existing `CurrentUser`

### 2.6 Admin Auth Service
**File:** `backend/src/admin/admin-auth.service.ts`

Methods (mirroring Prisma backend's admin auth):
- `login(email, password)` → `{ admin, accessToken, refreshToken }`
- `register(dto)` → `{ success, message }` (super_admin only)
- `sendOtp(email, purpose)` → `{ success, message }`
- `verifyOtp(email, code, purpose)` → `{ verified, accessToken?, refreshToken?, resetToken?, admin? }`
- `forgotPassword(email)` → `{ success, message }`
- `resetPassword(resetToken, newPassword)` → `{ success, message }`
- `refreshTokens(refreshToken)` → `{ accessToken, refreshToken }`
- `logout(refreshToken)` → `{ success }`
- `getProfile(adminId)` → `Admin`
- `updateProfile(adminId, dto)` → `Admin`

**Key differences from user auth:**
- Uses `email` (not `identifier`) — admins always have email
- OTP goes to email (not phone)
- Separate `admin_refresh_tokens` table
- JWT payload includes `type: 'admin'`

### 2.7 Admin Auth Controller
**File:** `backend/src/admin/admin-auth.controller.ts`

Routes:
```
POST   /admins/login           → login
POST   /admins/register        → register (super_admin)
POST   /admins/send-otp        → sendOtp
POST   /admins/verify-otp      → verifyOtp
POST   /admins/forgot-password → forgotPassword
POST   /admins/reset-password  → resetPassword
POST   /admins/refresh         → refreshTokens
POST   /admins/logout          → logout
GET    /admins/profile         → getProfile
PATCH  /admins/profile         → updateProfile
```

### 2.8 Admin Auth DTOs
**Files:** `backend/src/admin/dto/`

- `admin-login.dto.ts` — `{ email, password }`
- `admin-register.dto.ts` — `{ name, email, password, role, designation, avatar, status }`
- `admin-send-otp.dto.ts` — `{ email, purpose }`
- `admin-verify-otp.dto.ts` — `{ email, code, purpose }`
- `admin-forgot-password.dto.ts` — `{ email }`
- `admin-reset-password.dto.ts` — `{ resetToken, newPassword }`
- `admin-refresh-token.dto.ts` — `{ refreshToken }`
- `admin-update-profile.dto.ts` — `{ name?, designation?, password? }`

---

## Phase 3: Admin Management CRUD

**Why third:** Depends on admin auth being in place.

### 3.1 Admin Service
**File:** `backend/src/admin/admin.service.ts`

Methods:
- `findAll(page, limit, search)` → `PaginatedResult<Admin>`
- `findById(id)` → `Admin`
- `create(dto)` → `Admin`
- `update(id, dto)` → `Admin`
- `delete(id)` → `{ success }`
- `deactivate(id)` → `Admin`

### 3.2 Admin Controller
**File:** `backend/src/admin/admin.controller.ts`

Routes:
```
GET    /admins/           → findAll (super_admin)
POST   /admins/           → create (super_admin)
GET    /admins/:id        → findById (super_admin)
PUT    /admins/:id        → update (super_admin)
DELETE /admins/:id        → delete (super_admin)
PATCH  /admins/:id/deactivate → deactivate (super_admin)
```

All routes behind `AdminJwtAuthGuard` + `@AdminRoles(AdminRole.SUPER_ADMIN)`.

---

## Phase 4: Response Envelope Interceptor

**Why fourth:** Affects ALL responses — both existing and new.

### 4.1 Response Interface
**File:** `backend/src/common/response.interface.ts`

```typescript
export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data?: T;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPage: number;
  };
}
```

### 4.2 Response Interceptor
**File:** `backend/src/common/interceptors/response.interceptor.ts`

- Intercepts ALL responses
- Wraps in `{ success: true, statusCode: 200, message: 'Success', data: <response> }`
- For `PaginatedResult<T>`, extracts `meta` and maps `totalPage` from `total/limit`
- Skips wrapping for streams, file downloads, etc.

### 4.3 Register Interceptor
**File:** `backend/src/main.ts`

```typescript
app.useGlobalInterceptors(new ResponseInterceptor());
```

### 4.4 Error Response Format
**File:** `backend/src/common/filters/http-exception.filter.ts`

- Catches all exceptions
- Returns `{ success: false, statusCode, message, errorSources? }`
- Maps class-validator errors to `errorSources` format

---

## Phase 5: Cookie Auth Support

**Why fifth:** Intercepts token extraction — needs to be in place before route alignment.

### 5.1 Update User JWT Guard
**File:** `backend/src/auth/guards/jwt-auth.guard.ts`

- Extract token from: `Authorization: Bearer` header OR `token` cookie
- Existing code only checks header — add cookie fallback

```typescript
private extractToken(request: any): string | undefined {
  // 1. Check Authorization header
  const authHeader = request.headers?.authorization;
  if (authHeader) {
    const [type, token] = authHeader.split(' ');
    if (type === 'Bearer') return token;
  }
  // 2. Check cookie
  return request.cookies?.token;
}
```

### 5.2 Update Admin JWT Guard
**File:** `backend/src/admin/guards/admin-jwt-auth.guard.ts`

- Extract from: `Authorization: Bearer` OR `adminToken` cookie

### 5.3 Add Cookie Parser Middleware
**File:** `backend/src/main.ts`

```typescript
import * as cookieParser from 'cookie-parser';
app.use(cookieParser());
```

**Package:** `npm install cookie-parser @types/cookie-parser`

---

## Phase 6: Missing Endpoints

### 6.1 Notifications — 3 missing endpoints
**File:** `backend/src/notifications/notifications.controller.ts`

| Route | Method | Service method needed |
|---|---|---|
| `GET /notifications/:id` | GET | `findById(id, userId)` — new |
| `GET /notifications/user` | GET | `getUserNotifications(userId)` — already exists |
| `GET /notifications/unread-count` | GET | `getUnreadCount(userId)` — new |

**Also add to `notifications.service.ts`:**
- `findById(id, userId)` — fetch single notification, verify ownership
- `getUnreadCount(userId)` — `COUNT(*) WHERE userId = :userId AND isRead = false`

### 6.2 Users — 2 missing endpoints
**File:** `backend/src/users/users.controller.ts`

| Route | Method | Service method needed |
|---|---|---|
| `DELETE /users/:id` | DELETE | `deleteUser(id)` — new, admin only |
| `PUT /users/:id` | PUT | `updateUser(id, dto)` — new, admin only |

**Also add to `users.service.ts`:**
- `deleteUser(id)` — hard delete or soft delete
- `updateUser(id, dto)` — admin-level update (role, name, email, phone, avatar, verified)

---

## Phase 7: Route Alignment & Aliases

### 7.1 Routes that need path aliases (frontend expects different path)

| What frontend calls | What backend has | Solution |
|---|---|---|
| `GET /auth/profile` | `GET /users/me` | Add alias in auth controller |
| `GET /users/` | `GET /admin/users` | Add alias in admin controller |
| `GET /users/:id` | — | Add in admin controller (Phase 6) |
| `POST /notifications/read-all` | Same | Change `@Post` → `@Patch` |
| `POST /notifications/send` | `POST /admin/notifications/send` | Add alias in notifications controller |
| `POST /notifications/broadcast` | `POST /admin/notifications/broadcast` | Add alias |
| `GET /dashboard/*` | `GET /admin/dashboard/*` | Add aliases or move |

### 7.2 Method alignment
- `POST /notifications/read-all` → change to `@Patch('read-all')` in controller
- Keep `POST` as fallback for backward compat (add both methods temporarily)

---

## Phase 8: Migration & Fresh Start

### 8.1 Drop all existing tables
```sql
-- In PostgreSQL
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
```

### 8.2 Generate TypeORM migration
```bash
npx typeorm migration:generate -d src/data-source.ts src/migrations/InitialSchema
```

### 8.3 Seed default admin
```typescript
// Seed script: create first super_admin
{
  name: 'Super Admin',
  email: 'admin@gobadi.com',
  password: <hashed>,
  role: 'super_admin',
  designation: 'founder',
  status: 'active',
  verified: true
}
```

---

## File Inventory

### New files to create (15)
| File | Purpose |
|---|---|
| `src/admin/entities/admin.entity.ts` | Admin entity |
| `src/admin/entities/admin-refresh-token.entity.ts` | Admin refresh token |
| `src/admin/admin-auth.service.ts` | Admin auth logic |
| `src/admin/admin-auth.controller.ts` | Admin auth routes |
| `src/admin/admin.service.ts` | Admin CRUD logic |
| `src/admin/admin.controller.ts` | Admin CRUD routes |
| `src/admin/strategies/admin-jwt.strategy.ts` | Admin JWT strategy |
| `src/admin/guards/admin-jwt-auth.guard.ts` | Admin JWT guard |
| `src/admin/guards/admin-roles.guard.ts` | Admin roles guard |
| `src/admin/decorators/admin-roles.decorator.ts` | `@AdminRoles()` |
| `src/admin/decorators/current-admin.decorator.ts` | `@CurrentAdmin()` |
| `src/admin/dto/admin-*.dto.ts` | 8 DTO files |
| `src/common/interceptors/response.interceptor.ts` | Response envelope |
| `src/common/filters/http-exception.filter.ts` | Error response format |
| `src/common/response.interface.ts` | `ApiResponse<T>` type |

### Existing files to modify (10)
| File | Changes |
|---|---|
| `src/admin/admin.module.ts` | Register entities, services, controllers, imports |
| `src/auth/guards/jwt-auth.guard.ts` | Add cookie extraction |
| `src/notifications/notifications.controller.ts` | Add 3 endpoints, fix method |
| `src/notifications/notifications.service.ts` | Add `findById`, `getUnreadCount` |
| `src/users/users.controller.ts` | Add `DELETE /:id`, `PUT /:id` |
| `src/users/users.service.ts` | Add `deleteUser`, `updateUser` |
| `src/users/user.entity.ts` | Add `@UpdateDateColumn() updatedAt` |
| `src/main.ts` | Add cookie parser, response interceptor, exception filter |
| `src/app.module.ts` | Register global interceptor/filter if needed |
| `src/auth/auth.controller.ts` | Add `GET /auth/profile` alias |

---

## Implementation Order

| Step | Phase | Files | Est. Time |
|---|---|---|---|
| 1 | Phase 1: Entities | 2 new files | 30 min |
| 2 | Phase 2: Admin Auth | 8 new files | 3-4 hours |
| 3 | Phase 3: Admin CRUD | 2 new files | 1-2 hours |
| 4 | Phase 4: Response Envelope | 3 new files, 2 modified | 1-2 hours |
| 5 | Phase 5: Cookie Auth | 2 modified files + npm install | 30 min |
| 6 | Phase 6: Missing Endpoints | 2 modified files | 1 hour |
| 7 | Phase 7: Route Aliases | 3 modified files | 1 hour |
| 8 | Phase 8: Migration | SQL + seed script | 30 min |
| **Total** | | **15 new, 10 modified** | **~8-10 hours** |

---

## Testing Checklist

After each phase, verify:

- [ ] **Phase 1:** `npx typeorm migration:run` succeeds, tables created
- [ ] **Phase 2:** `POST /admins/login` returns admin + tokens
- [ ] **Phase 3:** `GET /admins/` returns paginated list
- [ ] **Phase 4:** ALL existing endpoints return `{ success, statusCode, message, data }`
- [ ] **Phase 5:** Cookie-based auth works alongside Bearer token
- [ ] **Phase 6:** `GET /notifications/unread-count` returns count
- [ ] **Phase 7:** Expo app and Next.js dashboard both work
- [ ] **Phase 8:** Fresh DB has all tables, seed admin exists

---

## Risk Areas

| Risk | Impact | Mitigation |
|---|---|---|
| Response envelope breaks existing frontend | HIGH | Test all Expo screens after Phase 4 |
| Admin JWT conflicts with user JWT | HIGH | Use `type` field in payload to differentiate |
| Cookie parser conflicts with existing auth | MEDIUM | Cookie is fallback only — Bearer still primary |
| `synchronize: true` in production | HIGH | Change to `false` before deploy, use migrations |
| Migration drops data | HIGH | Backup before Phase 8, test on dev first |

---

*Document version: 1.0 — Ready for implementation.*
