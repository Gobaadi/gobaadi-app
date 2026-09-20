# Swagger.md vs NestJS Backend — Full Conflict Analysis

> Generated: 2026-09-17
> Swagger: `/swagger.md` (port 7000, Vercel)
> Backend: `/backend/src/` (port 3000, NestJS)

---

## TL;DR

- **Swagger paths:** 51 unique endpoints
- **Backend routes:** ~230 unique endpoints across 40+ controllers
- **Overlap:** ~23 endpoints (path or functional match)
- **Swagger-only (missing in backend):** ~28 endpoints
- **Backend-only (not in swagger):** ~207 endpoints



**Core conflict:** Swagger describes a separate `Admin` entity (with `designation`, `status`, `super_admin` role) and separate admin auth flow. Backend uses unified `User` entity with `role=ADMIN`.

---

## 1. Entity Model Differences

### 1.1 Admin Entity (swagger) vs User Entity (backend)

| Field | Swagger `Admin` | Backend `User` | Conflict? |
|---|---|---|---|
| `id` | integer | `@PrimaryGeneratedColumn()` number | ✅ Match |
| `name` | string | `name?: string` | ✅ Match |
| `email` | string | `email?: string` | ✅ Match |
| `avatar` | string (nullable) | `avatar?: string` | ✅ Match |
| `role` | `enum: ["admin", "super_admin"]` | `enum: UserRole { USER, DOCTOR, CLINIC, ADMIN }` | 🔴 **MISSING `super_admin`** |
| `designation` | `enum: ["founder", "co-founder", "manager", "developer", "analyst", "support"]` | ❌ Not in entity | 🔴 **MISSING** |
| `status` | `enum: ["active", "deactive"]` | ❌ Not in entity | 🔴 **MISSING** |
| `createdAt` | date-time | `@CreateDateColumn()` | ✅ Match |
| `updatedAt` | date-time | ❌ Not in entity | 🟡 **MISSING** |
| `password` | not shown | `password?: string` (select: false) | ✅ OK (hidden) |
| `phone` | not shown | `phone?: string` | ✅ Extra field OK |
| `verified` | not shown | `verified: boolean` | ✅ Extra field OK |
| `profilePhoto` | not shown | `profilePhoto?: string` | ✅ Extra field OK |
| `dateOfBirth` | not shown | `dateOfBirth?: Date` | ✅ Extra field OK |
| `bloodGroup` | not shown | `bloodGroup?: string` | ✅ Extra field OK |
| `allergies` | not shown | `allergies?: string` | ✅ Extra field OK |
| `emergencyContactName` | not shown | `emergencyContactName?: string` | ✅ Extra field OK |
| `emergencyContactPhone` | not shown | `emergencyContactPhone?: string` | ✅ Extra field OK |
| `language` | not shown | `language: string` (default 'en') | ✅ Extra field OK |
| `isDoctorVerified` | not shown | `isDoctorVerified: boolean` | ✅ Extra field OK |
| `verificationDocuments` | not shown | `verificationDocuments?: string[]` | ✅ Extra field OK |
| `googleId` | not shown | `googleId?: string` | ✅ Extra field OK |
| `facebookId` | not shown | `facebookId?: string` | ✅ Extra field OK |

### 1.2 User Entity (swagger) vs User Entity (backend)

| Field | Swagger `User` | Backend `User` | Conflict? |
|---|---|---|---|
| `id` | integer | number | ✅ |
| `name` | string | `name?: string` | ✅ |
| `email` | string (nullable) | `email?: string` | ✅ |
| `phone` | string (nullable) | `phone?: string` | ✅ |
| `avatar` | string (nullable) | `avatar?: string` | ✅ |
| `role` | `enum: ["user", "doctor", "clinic", "admin"]` | `UserRole { USER, DOCTOR, CLINIC, ADMIN }` | ✅ Match |
| `verified` | boolean | `verified: boolean` | ✅ |
| `createdAt` | date-time | `@CreateDateColumn()` | ✅ |
| `updatedAt` | date-time | ❌ Not in entity | 🟡 **MISSING** |

### 1.3 Notification Entity

| Field | Swagger | Backend | Conflict? |
|---|---|---|---|
| `type` enum | `order, booking, payment, delivery, reminder, ai_ready, prescription_ready, promotion, system, message, referral` | Different enum values in backend | 🟡 **Needs alignment** |
| `read` | boolean | `isRead: boolean` | 🟡 **Field name differs** |
| `referenceType` | string (nullable) | exists | ✅ |
| `referenceId` | string (nullable) | exists | ✅ |

---

## 2. Auth System Differences

### 2.1 Auth Architecture

| Aspect | Swagger | Backend | Conflict? |
|---|---|---|---|
| User auth prefix | `/auth/*` | `/auth/*` | ✅ Match |
| Admin auth prefix | `/admins/*` (separate!) | `/auth/*` (same as user) | 🔴 **MISSING** |
| Admin login | `POST /admins/login` | `POST /auth/login` with `role=ADMIN` | 🔴 **MISSING** |
| Admin register | `POST /admins/` (management, not auth) | `POST /auth/register` with `role=ADMIN` | 🔴 **MISSING** |
| Admin OTP | `POST /admins/send-otp` | `POST /auth/send-otp` | 🔴 **MISSING** |
| Admin verify OTP | `POST /admins/verify-otp` | `POST /auth/verify-otp` | 🔴 **MISSING** |
| Admin forgot password | `POST /admins/forgot-password` | `POST /auth/forgot-password` | 🔴 **MISSING** |
| Admin reset password | `POST /admins/reset-password` | `POST /auth/reset-password` | 🔴 **MISSING** |
| Admin refresh token | `POST /admins/refresh` | `POST /auth/refresh` | 🔴 **MISSING** |
| Admin logout | `POST /admins/logout` | `POST /auth/logout` | 🔴 **MISSING** |
| Admin profile | `GET /admins/profile` | `GET /users/me` | 🔴 **MISSING** |
| Admin update profile | `PATCH /admins/profile` | `PATCH /users/me` | 🔴 **MISSING** |

### 2.2 Auth Request Body Differences

#### Register
| Field | Swagger | Backend | Conflict? |
|---|---|---|---|
| `name` | required | required | ✅ |
| `identifier` | required (email/phone) | `email` or `phone` (separate fields) | 🟡 **Different field name** |
| `password` | required (min 8) | required | ✅ |
| `role` | optional (default: user) | optional (default: user) | ✅ |

#### Login
| Field | Swagger | Backend | Conflict? |
|---|---|---|---|
| `identifier` | required (email/phone) | `email` + `password` | 🟡 **Different field name** |
| `password` | required | required | ✅ |

#### Send OTP
| Field | Swagger | Backend | Conflict? |
|---|---|---|---|
| `phone` | required | required | ✅ |
| `purpose` | optional (login/verify/reset) | `purpose` field exists | ✅ |

#### Verify OTP
| Field | Swagger | Backend | Conflict? |
|---|---|---|---|
| `phone` | required | required | ✅ |
| `code` | required | required | ✅ |
| `purpose` | optional | `purpose` field exists | ✅ |

#### Reset Password
| Field | Swagger | Backend | Conflict? |
|---|---|---|---|
| `resetToken` | required | `token` field | 🟡 **Field name differs** |
| `newPassword` | required (min 8) | `password` field | 🟡 **Field name differs** |

#### Refresh Token
| Field | Swagger | Backend | Conflict? |
|---|---|---|---|
| `refreshToken` | required | `refreshToken` | ✅ |

#### Logout
| Field | Swagger | Backend | Conflict? |
|---|---|---|---|
| `refreshToken` | required | `refreshToken` | ✅ |

---

## 3. Route Path Differences

### 3.1 Paths That Exist But Differ

| Swagger Path | Backend Path | Difference |
|---|---|---|
| `GET /auth/profile` | `GET /users/me` | Different path |
| `GET /users/` | `GET /admin/users` | Different prefix |
| `GET /users/{id}` | `GET /users/me` | Path param vs self |
| `PUT /users/{id}` | `PATCH /users/me` | PUT vs PATCH, different path |
| `DELETE /users/{id}` | ❌ Missing | Not implemented |
| `POST /notifications/read-all` | `POST /notifications/read-all` | ✅ Match |
| `PATCH /notifications/{id}/read` | `PATCH /notifications/:id/read` | ✅ Match |
| `POST /notifications/send` | `POST /admin/notifications/send` | Different prefix |
| `POST /notifications/broadcast` | `POST /admin/notifications/broadcast` | Different prefix |
| `GET /dashboard/*` | `GET /admin/dashboard/*` | Different prefix |

### 3.2 Admin Management Paths

| Swagger Path | Backend Path | Status |
|---|---|---|
| `GET /admins/` | ❌ | 🔴 Missing |
| `POST /admins/` | ❌ | 🔴 Missing |
| `GET /admins/{id}` | ❌ | 🔴 Missing |
| `PUT /admins/{id}` | ❌ | 🔴 Missing |
| `DELETE /admins/{id}` | ❌ | 🔴 Missing |
| `PATCH /admins/{id}/deactivate` | ❌ | 🔴 Missing |

### 3.3 Notification Paths

| Swagger Path | Backend Path | Status |
|---|---|---|
| `GET /notifications/` | `GET /notifications` | ✅ |
| `GET /notifications/{id}` | ❌ | 🔴 Missing |
| `DELETE /notifications/{id}` | `DELETE /notifications/:id` | ✅ |
| `PATCH /notifications/{id}/read` | `PATCH /notifications/:id/read` | ✅ |
| `PATCH /notifications/read-all` | `POST /notifications/read-all` | 🟡 Method differs |
| `POST /notifications/send` | `POST /admin/notifications/send` | 🟡 Path differs |
| `POST /notifications/broadcast` | `POST /admin/notifications/broadcast` | 🟡 Path differs |
| `GET /notifications/user` | ❌ | 🔴 Missing |
| `GET /notifications/unread-count` | ❌ | 🔴 Missing |

---

## 4. Swagger Endpoints Missing in Backend (28 total)

### 4.1 Admin Auth (11 endpoints)

| # | Swagger Path | Method | Description |
|---|---|---|---|
| 1 | `POST /admins/login` | POST | Admin login |
| 2 | `POST /admins/send-otp` | POST | Send admin OTP |
| 3 | `POST /admins/verify-otp` | POST | Verify admin OTP |
| 4 | `POST /admins/forgot-password` | POST | Admin password reset request |
| 5 | `POST /admins/reset-password` | POST | Admin password reset |
| 6 | `POST /admins/refresh` | POST | Admin token refresh |
| 7 | `POST /admins/logout` | POST | Admin logout |
| 8 | `GET /admins/profile` | GET | Get admin profile |
| 9 | `PATCH /admins/profile` | PATCH | Update admin profile |

### 4.2 Admin Management (6 endpoints)

| # | Swagger Path | Method | Description |
|---|---|---|---|
| 10 | `GET /admins/` | GET | List all admins |
| 11 | `POST /admins/` | POST | Create admin |
| 12 | `GET /admins/{id}` | GET | Get admin by ID |
| 13 | `PUT /admins/{id}` | PUT | Update admin |
| 14 | `DELETE /admins/{id}` | DELETE | Delete admin |
| 15 | `PATCH /admins/{id}/deactivate` | PATCH | Deactivate admin |

### 4.3 Users (2 endpoints)

| # | Swagger Path | Method | Description |
|---|---|---|---|
| 16 | `DELETE /users/{id}` | DELETE | Delete user |
| 17 | `PUT /users/{id}` | PUT | Full user update |

### 4.4 Notifications (3 endpoints)

| # | Swagger Path | Method | Description |
|---|---|---|---|
| 18 | `GET /notifications/{id}` | GET | Get notification by ID |
| 19 | `GET /notifications/user` | GET | Get current user notifications |
| 20 | `GET /notifications/unread-count` | GET | Get unread count |

### 4.5 Animals (1 endpoint — context differs)

| # | Swagger Path | Method | Description |
|---|---|---|---|
| 21 | `DELETE /animals/{id}` | DELETE | Admin delete animal (admin context) |

**Note:** Backend has `DELETE /animals/:id` but it's user-scoped (deletes own animal). Swagger expects admin-scoped delete (any animal).

---

## 5. Backend Endpoints Not in Swagger (207 routes, 30+ modules)

### 5.1 Complete Backend Module List

| Module | Routes | Swagger Coverage |
|---|---|---|
| Auth (10) | register, login, forgot-password, reset-password, send-otp, verify-otp, oauth/google, oauth/facebook, refresh, logout | ✅ All covered |
| Users (3) | me (GET), me (PATCH), me/language | ⚠️ Partial (profile only) |
| Animals (5) | list, get, create, update, delete | ⚠️ Partial (list/get only) |
| Addresses (5) | list, get, create, update, delete | ❌ Not covered |
| Doctors (6) | list, me, get, availability, update-availability, block-times | ❌ Not covered |
| Clinics (6) | list, get, create, update, verify, add-doctor, remove-doctor | ❌ Not covered |
| Services (5) | list, get, create, update, delete | ❌ Not covered |
| Appointments (7) | slots, book, bookings/all, reschedule, cancel, complete, join | ❌ Not covered |
| Products (11) | list, get, create, update, delete, categories, brands, search, stock | ❌ Not covered |
| Livestock (10) | list, get, create, update, delete, featured, search, my, verify, feature, reserve, sold | ❌ Not covered |
| Cart (5) | get, add, update-item, delete-item, clear | ❌ Not covered |
| Wishlist (3) | list, add, remove | ❌ Not covered |
| Orders (5) | create, my, admin, get, status-update | ❌ Not covered |
| Payments (4) | intent, verify, simulate-success, simulate-fail | ❌ Not covered |
| Wallet (6) | get, transactions, topup, pay, earn-coins, spend-coins | ❌ Not covered |
| Payment Methods (6) | list, create, update, delete, set-default, verify-otp | ❌ Not covered |
| Discounts (10) | list, get, create, update, delete, doctor-patients, user-available, user-validate, user-apply, user-my | ❌ Not covered |
| Prescriptions (7) | create, get, update, attachment, send, by-appointment, by-animal | ❌ Not covered |
| Calendar (4) | doctor-week, doctor-day, appointments, badges | ❌ Not covered |
| Subscriptions (5) | plans, my, subscribe, cancel, admin-all | ❌ Not covered |
| FAQs (5) | list, get, create, update, delete | ❌ Not covered |
| Support (5) | create, list, get, reply, admin-list, admin-update | ❌ Not covered |
| Fields (4) | list, create, update, delete | ❌ Not covered |
| Market Rates (3) | list, history, admin-create | ❌ Not covered |
| Badges (2) | available, me | ❌ Not covered |
| Time-off (4) | list, create, delete, calculate-fee | ❌ Not covered |
| Delivery (4) | track, get-by-order, create, update | ❌ Not covered |
| Chat (5) | conversations, messages, send, attachment, mark-read | ❌ Not covered |
| Reviews (6) | create, list, helpful, report, moderate, reply | ❌ Not covered |
| Referrals (2) | me, claim | ❌ Not covered |
| AI Diagnosis (4) | upload-image, analyze, history, get | ❌ Not covered |
| Medical Records (3) | upload, list, get | ❌ Not covered |
| Medical Events (16) | events, lab-tests, vaccinations, consultations | ❌ Not covered |
| Alerts (4) | list, action, admin-create, admin-delete | ❌ Not covered |
| Notifications (4 extra) | push-token (POST/DELETE), preferences (GET/PUT) | ❌ Not covered |
| Tasks (4) | list, create, toggle, delete | ❌ Not covered |
| Weather (1) | get | ❌ Not covered |
| Health (1) | get | ✅ Covered |
| Search (1) | global-search | ✅ Covered |
| Video Call (4) | create, join, end, token | ❌ Not covered |
| Admin Users (2) | list, update-role | ⚠️ Partial |
| Admin Notifications (3) | list, send, broadcast | ⚠️ Partial |
| Admin Orders (2) | list, status-update | ❌ Not covered |
| Admin Referrals (2) | pending, approve | ❌ Not covered |
| Admin Alerts (2) | create, delete | ❌ Not covered |
| Admin Subscriptions (1) | list | ❌ Not covered |
| Admin Support (2) | list, update | ❌ Not covered |
| Admin FAQs (3) | create, update, delete | ❌ Not covered |
| Admin Market Rates (1) | create | ❌ Not covered |

---

## 6. Response Wrapper Differences

| Aspect | Swagger | Backend |
|---|---|---|
| Success response | `{success, statusCode, message, data, meta}` | Direct response (no wrapper) |
| Error response | `{success, statusCode, message, errorSources: [{path, message}]}` | NestJS exception format |
| Pagination | `{page, limit, total, totalPage}` (in `meta`) | `PaginatedResult<T>` interface |

**Impact:** If frontend expects `{success, statusCode, message, data}` envelope, backend needs a **global response interceptor**.

---

## 7. Security Scheme Differences

| Aspect | Swagger | Backend |
|---|---|---|
| User auth | `bearerAuth` (header) + `cookieAuth` (cookie) | Bearer token only |
| Admin auth | `adminBearerAuth` (header) + `adminCookieAuth` (cookie) | Same as user |
| Cookie name (user) | `token` | Not implemented |
| Cookie name (admin) | `adminToken` | Not implemented |

**Impact:** Swagger expects cookie-based auth as fallback. Backend only supports Bearer token.

---

## 8. Summary of All Issues

### 🔴 Critical Issues (14)

1. **No `super_admin` role** in backend — swagger defines `role: "admin" | "super_admin"`
2. **No `designation` field** in User entity — swagger has `enum: [founder, co-founder, manager, developer, analyst, support]`
3. **No `status` field** in User entity — swagger has `enum: [active, deactive]`
4. **No `updatedAt`** in User entity — swagger includes it
5. **No separate admin auth** (`/admins/login`, `/admins/register`, etc.)
6. **No admin management CRUD** (`GET/POST/PUT/DELETE /admins/`)
7. **No admin deactivation** (`PATCH /admins/{id}/deactivate`)
8. **No user deletion** (`DELETE /users/{id}`)
9. **No user full update** (`PUT /users/{id}`)
10. **No `GET /notifications/{id}`** — single notification fetch
11. **No `GET /notifications/user`** — user's own notifications
12. **No `GET /notifications/unread-count`** — unread count
13. **No response envelope** — swagger expects `{success, statusCode, message, data}`
14. **No cookie auth** — swagger expects `token`/`adminToken` cookies

### 🟡 Medium Issues (8)

15. **`/auth/profile` vs `/users/me`** — different path for same concept
16. **`/users/` vs `/admin/users`** — different path for user list
17. **`/notifications/send` vs `/admin/notifications/send`** — different prefix
18. **`/notifications/read-all`** — swagger: `PATCH`, backend: `POST`
19. **`/dashboard/*` vs `/admin/dashboard/*`** — different prefix
20. **Register field `identifier`** vs backend `email`/`phone` separate fields
21. **Login field `identifier`** vs backend `email` field
22. **Reset password `resetToken`** vs backend `token` field name

### 🟢 Minor/OK (5)

23. **Notification `read` vs `isRead`** — field name differs
24. **Notification type enum** — may differ between systems
25. **Backend has `updatedAt` missing** — easy to add
26. **Backend User entity has extra fields** — not a conflict (superset)
27. **Backend has 207 extra endpoints** — not a conflict (superset)

---

## 9. Recommended Fix Priority

| Priority | What | Effort |
|---|---|---|
| P0 | Add `designation` + `status` + `super_admin` to User entity | 0.5 day |
| P0 | Add `updatedAt` to User entity | 0.5 day |
| P1 | Create admin auth wrapper endpoints (`/admins/login`, etc.) | 1 day |
| P1 | Create admin management CRUD (`/admins/`, `/admins/{id}`) | 1 day |
| P1 | Add missing notification endpoints (3 routes) | 0.5 day |
| P1 | Add user delete + full update endpoints | 0.5 day |
| P2 | Add global response interceptor for `{success, statusCode, message, data}` | 1 day |
| P2 | Add cookie auth support | 1 day |
| P2 | Align notification read-all method (PATCH vs POST) | 0.5 day |
| P3 | Add route aliases where frontend expects different paths | 1 day |

---

## 10. Files to Modify

| File | Changes |
|---|---|
| `src/users/user.entity.ts` | Add `designation`, `status`, `super_admin` role, `updatedAt` |
| `src/auth/auth.controller.ts` | Add `/admins/*` wrapper endpoints |
| `src/admin/admin-users.controller.ts` | Add GET by ID, DELETE, PUT |
| `src/admin/admin-auth.controller.ts` | **New file** — admin-specific auth |
| `src/notifications/notifications.controller.ts` | Add `/{id}`, `/user`, `/unread-count` |
| `src/users/users.controller.ts` | Add `DELETE /:id`, `PUT /:id` |
| `src/common/` | Add response interceptor for envelope |

---

*End of analysis.*






<!-- keep nest js backend routes here add the missing swagger routes if routes already exist than no need to create ageain. --> 