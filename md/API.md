# Gobadi Backend — API Reference

Complete REST API reference for the NestJS backend (`backend/`), generated directly from the
source code. **324 REST endpoints** across 55+ controllers, plus the Socket.IO chat/video events.

- **Base URL:** `http://localhost:3000` (override with the `PORT` env var)
- **Interactive docs (Swagger):** `http://localhost:3000/api/docs`
- **Run it:** `docker compose up -d postgres redis meilisearch` → `cd backend && npm install && npm run start:dev`

---

## Contents

| # | Section | Endpoints |
|---|---------|-----------|
| 1 | [Core & Health](#1-core--health) | 2 |
| 2 | [Authentication (mobile app)](#2-authentication-mobile-app) | 10 |
| 3 | [Admin authentication](#3-admin-authentication) | 10 |
| 4 | [Admin accounts (CRUD)](#4-admin-accounts-crud) | 6 |
| 5 | [Users](#5-users) | 3 |
| 6 | [Addresses](#6-addresses) | 5 |
| 7 | [Admin backoffice](#7-admin-backoffice) | 23 |
| 8 | [Dashboard (admin panel)](#8-dashboard-admin-panel) | 57 |
| 9 | [Doctors, scheduling & clinic services](#9-doctors-scheduling--clinic-services) | 74 |
| 10 | [Animals, livestock & medical records](#10-animals-livestock--medical-records) | 71 |
| 11 | [Commerce, payments & wallet](#11-commerce-payments--wallet) | 63 |
| — | [WebSocket events (Socket.IO)](#websocket-events-socketio) | 7 in / 7 out |

---

## Conventions

### Success responses

Controllers return their payloads **raw** — the `ResponseInterceptor` exists in
`backend/src/common/interceptors/response.interceptor.ts` but is **not registered**, so there is
no global envelope on success. Whatever the controller/service returns is the JSON body.

Endpoints that paginate (e.g. `GET /products`, `GET /doctors`, `GET /orders/admin`) return:

```json
{
  "data": [ { "...": "..." } ],
  "page": 1,
  "limit": 20,
  "total": 143
}
```

Query params are conventionally `page` and `limit` (plus module-specific filters such as
`categoryId`, `specialty`, `q`).

### Error responses

All errors go through the global `HttpExceptionFilter` (`backend/src/common/filters/http-exception.filter.ts`):

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation failed",
  "errorSources": [ { "path": "body", "message": "password must be longer than or equal to 8 characters" } ]
}
```

| Status | Meaning |
|--------|---------|
| `400` | Validation failed / bad input (`errorSources` lists the failing fields) |
| `401` | Missing, invalid or expired token |
| `403` | Authenticated but not allowed (wrong role, unverified account) |
| `404` | Resource not found |
| `409` | Conflict (duplicate account, already-booked slot, …) |
| `429` | Rate limited |
| `500` | Unhandled server error |
| `503` | Dependency down (e.g. `GET /health` when the database is unreachable) |

### Rate limiting

Global throttler: **100 requests / minute / IP** (`ThrottlerModule` in `app.module.ts`).
The `/auth` controller is stricter: **10 requests / minute** (`@Throttle` on `AuthController`).
Set `SKIP_THROTTLE=true` to disable (the Docker Compose file does this for local dev).

### Transport & security

- `helmet` headers, CORS enabled for all origins, `cookie-parser` enabled.
- Send the access token as `Authorization: Bearer <accessToken>` **or** as the `token` cookie.

---

## Authentication & access labels

Every endpoint below is labelled with one of these **Auth** values:

| Label | Guard | How to authenticate |
|-------|-------|---------------------|
| `Public` | none | No token required |
| `JWT` | `JwtAuthGuard` | `Authorization: Bearer <accessToken>` (mobile/user token) |
| `JWT + Role(X)` | `JwtAuthGuard` + `RolesGuard` | As above, and the token's `role` must be `X` (e.g. `DOCTOR`, `ADMIN`) |
| `Admin JWT` | `AdminJwtAuthGuard` | Token issued by `/admins/login` (separate admin auth module) |
| `Admin JWT + Role(X)` | `AdminJwtAuthGuard` + `AdminRolesGuard` | Admin token with role `X` |
| `Dashboard JWT` | `DashboardAuthGuard` | Token issued by `/dashboard/auth/*` or `/dashboard/admins/*` |
| `Dashboard Admin` | `DashboardAdminGuard` | Dashboard token of an admin (non-super) |
| `Dashboard Super Admin` | `DashboardSuperAdminGuard` | Dashboard token of a super admin |

Guards are applied either to the whole controller (`@UseGuards(...)` above the class) or to
individual methods; the label shown for each endpoint reflects the code.

---

## Module map

| Area | Controller base path(s) | Module folder |
|------|-------------------------|---------------|
| Core / health | `/`, `/health` | `src/app.controller.ts`, `src/health` |
| Mobile auth | `/auth` | `src/auth` |
| Admin auth & admins | `/admins` | `src/admin` |
| Users / addresses | `/users`, `/addresses` | `src/users`, `src/addresses` |
| Admin backoffice | `/admin/*` | `src/admin`, `src/discounts`, `src/faqs`, `src/market-rates`, `src/subscriptions`, `src/support` |
| Dashboard | `/dashboard/*` | `src/dashboard` |
| Doctors | `/doctors` | `src/doctors` |
| Appointments | `/doctors/*` (bookings, slots) | `src/appointments` |
| Time off | `/doctors/:id/block-times` | `src/time-off` |
| Calendar | `/calendar` | `src/calendar` |
| Clinics / services | `/clinics`, `/services` | `src/clinics`, `src/services` |
| Animals / livestock / fields | `/animals`, `/livestock`, `/fields` | `src/animals`, `src/livestock`, `src/fields` |
| Medical | `/medical-records`, `/medical-events`, `/lab-tests`, `/vaccinations`, `/consultations`, `/prescriptions` | `src/medical-records`, `src/medical-events`, `src/prescriptions` |
| AI diagnosis | `/ai-diagnosis` | `src/ai-diagnosis` |
| Chat / video | `/chat`, `/video-call` | `src/chat`, `src/video-call` |
| Commerce | `/products`, `/cart`, `/wishlist`, `/orders`, `/delivery` | `src/products`, `src/cart`, `src/wishlist`, `src/orders`, `src/delivery` |
| Money | `/payments`, `/payment-methods`, `/wallet`, `/discounts`, `/subscriptions` | `src/payments`, `src/payment-methods`, `src/wallet`, `src/discounts`, `src/subscriptions` |
| Misc | `/notifications`, `/alerts`, `/tasks`, `/badges`, `/referrals`, `/support`, `/faqs`, `/reviews`, `/patients`, `/search`, `/market-rates`, `/weather` | matching `src/*` folders |

---


## 1. Core & Health

Basic service endpoints: a greeting root route and a liveness/readiness check that verifies database connectivity.

### `GET /`
- **Purpose:** Root health/greeting endpoint.
- **Auth:** Public
- **Response `200`:**
```json
"Hello World!"
```

### `GET /health`
- **Purpose:** Check database connectivity and report system health.
- **Auth:** Public
- **Response `200`:**
```json
{
  "status": "healthy",
  "timestamp": "2026-09-27T10:15:30.000Z",
  "details": { "database": { "status": "UP" } }
}
```

## 2. Authentication (mobile app)

End-to-end account lifecycle for mobile clients: registration, password and OTP login, OAuth social sign-in, token rotation and password reset. Routes are rate-limited (10 requests/minute for the whole controller).

### `POST /auth/register`
- **Purpose:** Register a new account with a password and send a verification OTP.
- **Auth:** Public
- **Request:** `name (string)`, `identifier (string)` — phone or email, `password (string, min 8)`, `role (enum: user|doctor|clinic|admin)`
- **Response `201`:**
```json
{
  "success": true,
  "message": "Registered successfully. Please verify your account with the code sent to you."
}
```

### `POST /auth/login`
- **Purpose:** Log in with phone/email + password and receive a token pair.
- **Auth:** Public
- **Request:** `identifier (string)`, `password (string)`
- **Response `201`:**
```json
{
  "accessToken": "eyJhbGciOi...",
  "refreshToken": "a1b2c3...",
  "user": {
    "id": 12,
    "phone": "+8801712345678",
    "email": null,
    "role": "user",
    "name": "Abdul Kader",
    "verified": true
  }
}
```

### `POST /auth/forgot-password`
- **Purpose:** Request a password reset OTP for an identifier without revealing whether the account exists.
- **Auth:** Public
- **Request:** `identifier (string)`
- **Response `201`:**
```json
{
  "success": true,
  "message": "If an account exists for this identifier, a reset code has been sent."
}
```

### `POST /auth/reset-password`
- **Purpose:** Reset password using a verified reset token returned by `verify-otp` with `purpose: "reset"`.
- **Auth:** Public
- **Request:** `resetToken (string)`, `newPassword (string, min 8)`
- **Response `201`:**
```json
{ "success": true, "message": "Password reset successfully." }
```

### `POST /auth/send-otp`
- **Purpose:** Send an OTP code to a phone number or email (delivered by SMS/Redis storage and by email when the target is an address).
- **Auth:** Public
- **Request:** `phone (string)`, `purpose (enum: login|verify|reset, optional)`
- **Response `201`:**
```json
{ "success": true, "message": "OTP sent successfully to +8801712345678", "otp": "4821" }
```

### `POST /auth/verify-otp`
- **Purpose:** Verify an OTP code and receive a session token pair (or a reset token when `purpose` is `reset`).
- **Auth:** Public
- **Request:** `phone (string)`, `code (string)`, `purpose (enum: login|verify|reset, optional)`
- **Response `201`:**
```json
{
  "verified": true,
  "accessToken": "eyJhbGciOi...",
  "refreshToken": "d4e5f6...",
  "user": { "id": 12, "phone": "+8801712345678", "role": "user", "verified": true },
  "message": "OTP verified successfully."
}
```

### `POST /auth/oauth/google`
- **Purpose:** Log in or register via a Google ID token.
- **Auth:** Public
- **Request:** `idToken (string)`
- **Response `201`:**
```json
{
  "accessToken": "eyJhbGciOi...",
  "refreshToken": "a1b2c3...",
  "user": { "id": 15, "email": "user@gmail.com", "name": "Rahim Uddin", "role": "user", "verified": false }
}
```

### `POST /auth/oauth/facebook`
- **Purpose:** Log in or register via a Facebook access token.
- **Auth:** Public
- **Request:** `accessToken (string)`
- **Response `201`:**
```json
{
  "accessToken": "eyJhbGciOi...",
  "refreshToken": "a1b2c3...",
  "user": { "id": 15, "email": "user@gmail.com", "name": "Rahim Uddin", "role": "user", "verified": false }
}
```

### `POST /auth/refresh`
- **Purpose:** Exchange a refresh token for a new token pair (the used refresh token is revoked first).
- **Auth:** Public
- **Request:** `refreshToken (string)`
- **Response `201`:**
```json
{ "accessToken": "eyJhbGciOi...", "refreshToken": "9f8e7d..." }
```

### `POST /auth/logout`
- **Purpose:** Revoke a refresh token so it can no longer be exchanged.
- **Auth:** Public
- **Request:** `refreshToken (string)`
- **Response `201`:**
```json
{ "success": true }
```

## 3. Admin authentication

Credential and OTP flows for backoffice staff accounts, all keyed by email. OTP routes are rate-limited (5–10 requests/minute); profile routes require an admin access token.

### `POST /admins/login`
- **Purpose:** Admin login with email and password.
- **Auth:** Public
- **Request:** `email (string)`, `password (string)`
- **Response `201`:**
```json
{
  "accessToken": "eyJhbGciOi...",
  "refreshToken": "a1b2c3...",
  "admin": {
    "id": 1,
    "name": "Super Admin",
    "email": "admin@gobadi.com",
    "role": "super_admin",
    "designation": "founder",
    "status": "active",
    "verified": true
  }
}
```

### `POST /admins/register`
- **Purpose:** Create a new admin account (only a `super_admin` caller may create admins; a bare call with no authenticated creator also succeeds).
- **Auth:** Public
- **Request:** `email (string)`, `password (string, min 8)`, `designation (enum)`, `name?`, `role?`, `avatar?`, `status?`
- **Response `201`:**
```json
{ "success": true, "message": "Admin created successfully." }
```

### `POST /admins/send-otp`
- **Purpose:** Send a verification or reset OTP to an admin email.
- **Auth:** Public
- **Request:** `email (string)`, `purpose (enum: verify|reset, optional)`
- **Response `201`:**
```json
{ "success": true, "message": "If an account exists for this email, an OTP has been sent.", "otp": "3057" }
```

### `POST /admins/verify-otp`
- **Purpose:** Verify an admin OTP; returns a token pair for `verify` or a reset token for `reset`.
- **Auth:** Public
- **Request:** `email (string)`, `code (string)`, `purpose (enum: verify|reset, optional)`
- **Response `201`:**
```json
{
  "verified": true,
  "accessToken": "eyJhbGciOi...",
  "refreshToken": "b2c3d4...",
  "admin": { "id": 1, "email": "admin@gobadi.com", "role": "admin", "designation": "manager", "verified": true },
  "message": "OTP verified successfully."
}
```

### `POST /admins/forgot-password`
- **Purpose:** Request an admin password reset OTP without revealing whether the email exists.
- **Auth:** Public
- **Request:** `email (string)`
- **Response `201`:**
```json
{ "success": true, "message": "If an account exists for this email, a reset code has been sent." }
```

### `POST /admins/reset-password`
- **Purpose:** Reset an admin password using the reset token issued by `verify-otp`.
- **Auth:** Public
- **Request:** `resetToken (string)`, `newPassword (string, min 8)`
- **Response `201`:**
```json
{ "success": true, "message": "Password reset successfully." }
```

### `POST /admins/refresh`
- **Purpose:** Refresh the admin access token by rotating the refresh token.
- **Auth:** Public
- **Request:** `refreshToken (string)`
- **Response `201`:**
```json
{ "accessToken": "eyJhbGciOi...", "refreshToken": "e5f6a7..." }
```

### `POST /admins/logout`
- **Purpose:** Logout an admin by revoking its refresh token.
- **Auth:** Public
- **Request:** `refreshToken (string)`
- **Response `201`:**
```json
{ "success": true }
```

### `GET /admins/profile`
- **Purpose:** Get the profile of the currently authenticated admin.
- **Auth:** Admin JWT
- **Response `200`:**
```json
{
  "id": 1,
  "name": "Super Admin",
  "email": "admin@gobadi.com",
  "phone": "+8801700000001",
  "avatar": "https://cdn.example.com/a.png",
  "role": "super_admin",
  "designation": "founder",
  "status": "active",
  "verified": true,
  "createdAt": "2026-01-05T09:00:00.000Z"
}
```

### `PATCH /admins/profile`
- **Purpose:** Update the current admin's own profile (name, designation, phone, password).
- **Auth:** Admin JWT
- **Request:** `name?`, `designation? (enum)`, `password? (string, min 6)`, `phone?`
- **Response `200`:**
```json
{
  "id": 1,
  "name": "Super Admin",
  "email": "admin@gobadi.com",
  "phone": "+8801700000001",
  "role": "super_admin",
  "designation": "founder",
  "status": "active",
  "verified": true
}
```

## 4. Admin accounts (CRUD)

Management of admin accounts themselves; restricted to `super_admin` token holders.

### `GET /admins`
- **Purpose:** List all admins with pagination and optional name/email search.
- **Auth:** Admin JWT + Role(SUPER_ADMIN)
- **Request:** `page (number, optional)`, `limit (number, optional)`, `search (string, optional)`
- **Response `200`:**
```json
{
  "data": [
    {
      "id": 1,
      "name": "Super Admin",
      "email": "admin@gobadi.com",
      "role": "super_admin",
      "designation": "founder",
      "status": "active",
      "verified": true
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 1
}
```

### `POST /admins`
- **Purpose:** Create a new admin account.
- **Auth:** Admin JWT + Role(SUPER_ADMIN)
- **Request:** `email (string)`, `password (string, min 8)`, `designation (enum)`, `name?`, `role? (enum: admin|super_admin)`, `avatar?`, `status?`
- **Response `201`:**
```json
{
  "id": 4,
  "name": "Support Agent",
  "email": "support@gobadi.com",
  "role": "admin",
  "designation": "support",
  "avatar": null,
  "status": "active",
  "verified": true,
  "createdAt": "2026-09-27T10:00:00.000Z"
}
```

### `GET /admins/:id`
- **Purpose:** Get an admin by ID.
- **Auth:** Admin JWT + Role(SUPER_ADMIN)
- **Request:** `id (path param, number)`
- **Response `200`:**
```json
{
  "id": 4,
  "name": "Support Agent",
  "email": "support@gobadi.com",
  "role": "admin",
  "designation": "support",
  "status": "active",
  "verified": true
}
```

### `PUT /admins/:id`
- **Purpose:** Update an admin's profile fields.
- **Auth:** Admin JWT + Role(SUPER_ADMIN)
- **Request:** `id (path param)`, `name?`, `email?`, `role? (enum)`, `designation? (enum)`, `avatar?`, `status? (enum: active|deactive)`
- **Response `200`:**
```json
{
  "id": 4,
  "name": "Support Agent II",
  "email": "support@gobadi.com",
  "role": "admin",
  "designation": "support",
  "status": "active",
  "verified": true
}
```

### `DELETE /admins/:id`
- **Purpose:** Delete an admin account.
- **Auth:** Admin JWT + Role(SUPER_ADMIN)
- **Request:** `id (path param, number)`
- **Response `200`:**
```json
{ "success": true }
```

### `PATCH /admins/:id/deactivate`
- **Purpose:** Toggle the admin's active/deactive status.
- **Auth:** Admin JWT + Role(SUPER_ADMIN)
- **Request:** `id (path param, number)`
- **Response `200`:**
```json
{
  "id": 4,
  "name": "Support Agent",
  "email": "support@gobadi.com",
  "role": "admin",
  "designation": "support",
  "status": "deactive",
  "verified": true
}
```

## 5. Users

The signed-in user's own profile resource (`/users/me`); the password column is never selected.

### `GET /users/me`
- **Purpose:** Get the current user's own profile.
- **Auth:** JWT
- **Response `200`:**
```json
{
  "id": 12,
  "phone": "+8801712345678",
  "role": "user",
  "name": "Abdul Kader",
  "email": "abdul@example.com",
  "avatar": null,
  "verified": true,
  "profilePhoto": "https://cdn.example.com/me.jpg",
  "language": "en",
  "createdAt": "2026-03-11T08:30:00.000Z"
}
```

### `PATCH /users/me`
- **Purpose:** Update the current user's own profile.
- **Auth:** JWT
- **Request:** `name?`, `phone?`, `email?`, `profilePhoto?`, `dateOfBirth?`, `bloodGroup?`, `allergies?`, `emergencyContactName?`, `emergencyContactPhone?`
- **Response `200`:**
```json
{
  "id": 12,
  "phone": "+8801712345678",
  "role": "user",
  "name": "Abdul Kader",
  "email": "abdul@example.com",
  "verified": true,
  "profilePhoto": "https://cdn.example.com/me.jpg",
  "language": "en",
  "bloodGroup": "O+",
  "updatedAt": "2026-09-27T10:05:00.000Z"
}
```

### `PATCH /users/me/language`
- **Purpose:** Update the preferred UI language of the current user.
- **Auth:** JWT
- **Request:** `language (enum: en|bn)`
- **Response `200`:**
```json
{ "success": true, "language": "bn" }
```

## 6. Addresses

CRUD over the current user's saved delivery addresses; every query is scoped to the authenticated user ID.

### `GET /addresses`
- **Purpose:** Get list of current user's addresses.
- **Auth:** JWT
- **Response `200`:**
```json
[
  {
    "id": 3,
    "userId": 12,
    "label": "Farm",
    "contactName": "Abdur Rahman",
    "phone": "+8801700000003",
    "division": "Dhaka",
    "district": "Dhaka",
    "upazila": "Savar",
    "postalCode": "1340",
    "isDefault": true
  }
]
```

### `GET /addresses/:id`
- **Purpose:** Get details of an address by ID.
- **Auth:** JWT
- **Request:** `id (path param, number)`
- **Response `200`:**
```json
{
  "id": 3,
  "userId": 12,
  "label": "Farm",
  "contactName": "Abdur Rahman",
  "phone": "+8801700000003",
  "division": "Dhaka",
  "district": "Dhaka",
  "upazila": "Savar",
  "postalCode": "1340",
  "isDefault": true
}
```

### `POST /addresses`
- **Purpose:** Create a new address for the current user.
- **Auth:** JWT
- **Request:** `label (string)`, `contactName (string)`, `phone (string)`, `division (string)`, `district (string)`, `upazila (string)`, `postalCode (string)`, `latitude? (number)`, `longitude? (number)`, `isDefault? (boolean)`
- **Response `201`:**
```json
{
  "id": 4,
  "userId": 12,
  "label": "Office",
  "contactName": "Abdul Kader",
  "phone": "+8801712345678",
  "division": "Chattogram",
  "district": "Chattogram",
  "upazila": "Pahartali",
  "postalCode": "4000",
  "isDefault": false
}
```

### `PUT /addresses/:id`
- **Purpose:** Update an existing address by ID.
- **Auth:** JWT
- **Request:** `id (path param)`, plus any `CreateAddressDto` field (all optional)
- **Response `200`:**
```json
{
  "id": 3,
  "userId": 12,
  "label": "Farm - North",
  "contactName": "Abdur Rahman",
  "phone": "+8801700000003",
  "division": "Dhaka",
  "district": "Dhaka",
  "upazila": "Savar",
  "postalCode": "1340",
  "isDefault": true
}
```

### `DELETE /addresses/:id`
- **Purpose:** Delete an address by ID (no response body is returned).
- **Auth:** JWT
- **Request:** `id (path param, number)`
- **Response `200`:**
```json
{}
```

## 7. Admin backoffice

Administrative operations over users, orders, notifications, alerts, promo codes, FAQs, referrals, market rates, subscriptions and support tickets. Every route in this section requires an app user JWT carrying the `admin` role.

### `GET /admin/users`
- **Purpose:** List users with pagination and optional search on name, phone or email.
- **Auth:** JWT + Role(ADMIN)
- **Request:** `page (number, optional)`, `limit (number, optional)`, `search (string, optional)`
- **Response `200`:**
```json
{
  "data": [
    {
      "id": 12,
      "phone": "+8801712345678",
      "email": "abdul@example.com",
      "role": "user",
      "name": "Abdul Kader",
      "verified": true
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 1
}
```

### `PATCH /admin/users/:id/role`
- **Purpose:** Update a user's role (admin only).
- **Auth:** JWT + Role(ADMIN)
- **Request:** `id (path param)`, `role (enum: user|doctor|clinic|admin)`
- **Response `200`:**
```json
{
  "id": 12,
  "phone": "+8801712345678",
  "email": "abdul@example.com",
  "role": "doctor",
  "name": "Abdul Kader",
  "verified": true
}
```

### `PUT /admin/users/:id`
- **Purpose:** Full update of a user record (admin only), including email/phone uniqueness checks and optional password rehash.
- **Auth:** JWT + Role(ADMIN)
- **Request:** `id (path param)`, `name?`, `email?`, `phone?`, `role? (enum)`, `profilePhoto?`, `verified? (boolean)`
- **Response `200`:**
```json
{
  "id": 12,
  "phone": "+8801712345678",
  "email": "abdul@example.com",
  "role": "user",
  "name": "Abdul Kader",
  "profilePhoto": "https://cdn.example.com/me.jpg",
  "verified": true,
  "language": "en",
  "updatedAt": "2026-09-27T10:12:00.000Z"
}
```

### `DELETE /admin/users/:id`
- **Purpose:** Delete a user (admin only).
- **Auth:** JWT + Role(ADMIN)
- **Request:** `id (path param, number)`
- **Response `200`:**
```json
{ "success": true }
```

### `GET /admin/orders`
- **Purpose:** List orders, paginated when `page`/`limit` are supplied and filterable by status.
- **Auth:** JWT + Role(ADMIN)
- **Request:** `page (number, optional)`, `limit (number, optional)`, `status (string, optional)`
- **Response `200`:**
```json
[
  {
    "id": "GBD-123456",
    "userId": 12,
    "totalPrice": 2500,
    "tax": 125,
    "shippingFee": 80,
    "discountAmount": 250,
    "netAmount": 2455,
    "deliveryMethod": "standard",
    "status": "pending",
    "paymentStatus": "pending"
  }
]
```

### `PATCH /admin/orders/:id/status`
- **Purpose:** Update an order status (admin only), committing or releasing stock on completion transitions.
- **Auth:** JWT + Role(ADMIN)
- **Request:** `id (path param, e.g. GBD-123456)`, `status (enum: PENDING|SHIPPED|DELIVERED|CANCELLED)`
- **Response `200`:**
```json
{
  "id": "GBD-123456",
  "userId": 12,
  "totalPrice": 2500,
  "netAmount": 2455,
  "deliveryMethod": "standard",
  "status": "shipped",
  "paymentStatus": "pending",
  "trackingNumber": "TRK9981",
  "updatedAt": "2026-09-27T10:20:00.000Z"
}
```

### `GET /admin/notifications`
- **Purpose:** List sent notifications with pagination, filterable by type and user.
- **Auth:** JWT + Role(ADMIN)
- **Request:** `page (number, optional)`, `limit (number, optional)`, `type (enum, optional)`, `userId (number, optional)`
- **Response `200`:**
```json
{
  "data": [
    {
      "id": 41,
      "userId": 12,
      "title": "Your order has shipped",
      "body": "Order GBD-123456 is on its way.",
      "type": "order",
      "isRead": false,
      "createdAt": "2026-09-27T09:00:00.000Z"
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 1
}
```

### `POST /admin/notifications/send`
- **Purpose:** Send a notification to specific users, persisting one row per recipient and queueing push delivery.
- **Auth:** JWT + Role(ADMIN)
- **Request:** `userIds (number[])`, `title (string)`, `body (string)`, `type? (enum)`, `referenceType? (string)`, `referenceId? (string)`
- **Response `201`:**
```json
{ "count": 3 }
```

### `POST /admin/notifications/broadcast`
- **Purpose:** Broadcast a notification to all users, or all users of a single role, as a background job.
- **Auth:** JWT + Role(ADMIN)
- **Request:** `title (string)`, `body (string)`, `type? (enum)`, `role? (enum: user|doctor|clinic|admin)`
- **Response `201`:**
```json
{ "queued": true }
```

### `POST /admin/alerts`
- **Purpose:** Create and broadcast an alert (admin only).
- **Auth:** JWT + Role(ADMIN)
- **Request:** `title (string)`, `location (string)`, `crop (string)`, `severity (enum: LOW|MEDIUM|HIGH|CRITICAL)`, `actionType (enum: MANAGE|SCHEDULE)`
- **Response `201`:**
```json
{
  "id": 7,
  "title": "High Risk of Leaf Miner",
  "location": "North Fields",
  "crop": "Wheat",
  "severity": "HIGH",
  "actionType": "MANAGE",
  "isActive": true,
  "createdAt": "2026-09-27T10:00:00.000Z"
}
```

### `DELETE /admin/alerts/:id`
- **Purpose:** Deactivate an alert (admin only).
- **Auth:** JWT + Role(ADMIN)
- **Request:** `id (path param, number)`
- **Response `200`:**
```json
{ "success": true }
```

### `POST /admin/discounts`
- **Purpose:** Create a discount promo code.
- **Auth:** JWT + Role(ADMIN)
- **Request:** `code (string, alnum max 10)`, `percent (number, 1-100)`, `validFrom? (date)`, `validTo? (date)`, `usageLimit? (number)`, `isActive? (boolean)`
- **Response `201`:**
```json
{
  "id": 5,
  "code": "SAVE20",
  "percent": 20,
  "validFrom": "2026-10-01",
  "validTo": "2026-12-31",
  "usageLimit": 100,
  "usageCount": 0,
  "isActive": true,
  "createdAt": "2026-09-27T10:00:00.000Z"
}
```

### `PATCH /admin/discounts/:id`
- **Purpose:** Update a discount promo code (partial update).
- **Auth:** JWT + Role(ADMIN)
- **Request:** `id (path param)`, plus any subset of `code`, `percent`, `validFrom`, `validTo`, `usageLimit`, `isActive`
- **Response `200`:**
```json
{
  "id": 5,
  "code": "SAVE20",
  "percent": 25,
  "validFrom": "2026-10-01",
  "validTo": "2026-12-31",
  "usageLimit": 100,
  "usageCount": 0,
  "isActive": true
}
```

### `DELETE /admin/discounts/:id`
- **Purpose:** Delete a discount promo code.
- **Auth:** JWT + Role(ADMIN)
- **Request:** `id (path param, number)`
- **Response `200`:**
```json
{ "success": true }
```

### `POST /admin/faqs`
- **Purpose:** Create an FAQ entry.
- **Auth:** JWT + Role(ADMIN)
- **Request:** `question (string)`, `answer (string)`, `category? (string, max 100)`, `sortOrder? (number)`
- **Response `201`:**
```json
{
  "id": 9,
  "question": "How do I book an appointment?",
  "answer": "You can book via the app by selecting a doctor and time slot.",
  "category": "booking",
  "sortOrder": 1,
  "createdAt": "2026-09-27T10:00:00.000Z"
}
```

### `PUT /admin/faqs/:id`
- **Purpose:** Update an FAQ entry.
- **Auth:** JWT + Role(ADMIN)
- **Request:** `id (path param)`, `question?`, `answer?`, `category?`, `sortOrder?`
- **Response `200`:**
```json
{
  "id": 9,
  "question": "How do I book an appointment?",
  "answer": "Select a doctor, choose a slot and confirm.",
  "category": "booking",
  "sortOrder": 1
}
```

### `DELETE /admin/faqs/:id`
- **Purpose:** Delete an FAQ entry.
- **Auth:** JWT + Role(ADMIN)
- **Request:** `id (path param, number)`
- **Response `200`:**
```json
{ "success": true }
```

### `GET /admin/referrals/pending`
- **Purpose:** List referrals with a payout pending approval.
- **Auth:** JWT + Role(ADMIN)
- **Response `200`:**
```json
[
  {
    "id": 14,
    "userId": 12,
    "referralCode": "ABDUL14",
    "totalEarned": 300,
    "pendingAmount": 150,
    "payoutStatus": "PENDING",
    "referralCount": 3,
    "createdAt": "2026-08-02T11:00:00.000Z"
  }
]
```

### `POST /admin/referrals/:id/approve`
- **Purpose:** Approve a referral payout for the given amount.
- **Auth:** JWT + Role(ADMIN)
- **Request:** `id (path param)`, `amount (number, min 0.01)`
- **Response `201`:**
```json
{
  "id": 14,
  "userId": 12,
  "referralCode": "ABDUL14",
  "totalEarned": 300,
  "pendingAmount": 0,
  "payoutStatus": "PAID",
  "referralCount": 3
}
```

### `POST /admin/market-rates`
- **Purpose:** Add or update a market rate for a commodity/date (upsert).
- **Auth:** JWT + Role(ADMIN)
- **Request:** `commodity (string, max 100)`, `price (decimal)`, `unit (string)`, `date (date string)`, `region? (string)`
- **Response `201`:**
```json
{
  "id": 22,
  "commodity": "Rice",
  "price": 45.5,
  "unit": "kg",
  "date": "2026-09-27",
  "region": "Dhaka",
  "createdAt": "2026-09-27T10:00:00.000Z"
}
```

### `GET /admin/subscriptions`
- **Purpose:** List all user subscriptions (admin).
- **Auth:** JWT + Role(ADMIN)
- **Response `200`:**
```json
[
  {
    "id": 6,
    "userId": 12,
    "planId": 2,
    "startDate": "2026-09-01T00:00:00.000Z",
    "endDate": "2026-10-01T00:00:00.000Z",
    "status": "active",
    "createdAt": "2026-09-01T05:20:00.000Z"
  }
]
```

### `GET /admin/support/tickets`
- **Purpose:** List all support tickets.
- **Auth:** JWT + Role(ADMIN)
- **Response `200`:**
```json
[
  {
    "id": 11,
    "userId": 12,
    "subject": "Cannot access my account",
    "message": "I am unable to login since yesterday.",
    "status": "open",
    "createdAt": "2026-09-26T14:40:00.000Z"
  }
]
```

### `PATCH /admin/support/tickets/:id`
- **Purpose:** Update a support ticket's status.
- **Auth:** JWT + Role(ADMIN)
- **Request:** `id (path param)`, `status (enum: open|in-progress|closed)`
- **Response `200`:**
```json
{
  "id": 11,
  "userId": 12,
  "subject": "Cannot access my account",
  "message": "I am unable to login since yesterday.",
  "status": "in-progress",
  "updatedAt": "2026-09-27T10:30:00.000Z"
}
```

## 8. Dashboard (admin panel)

REST API backing the admin panel: authentication for dashboard users and admins, CRUD for admins/users/animals, notification management, and analytics endpoints. Successful responses are returned raw (no envelope); errors look like `{"success": false, "statusCode": N, "message": "...", "errorSources": [...]}`.

### `POST /dashboard/auth/register`
- **Purpose:** Register a new account with a password.
- **Auth:** Public
- **Request:** `name (string)`, `identifier (string)` (phone or email), `password (string, min 8)`, `role (enum: user|doctor|clinic|admin)`
- **Response `201`:**
```json
{"success": true, "message": "Registered successfully. Please verify your account with the code sent to you."}
```

### `POST /dashboard/auth/login`
- **Purpose:** Log in with phone/email + password.
- **Auth:** Public
- **Request:** `identifier (string)`, `password (string)`
- **Response `201`:**
```json
{
  "accessToken": "eyJhbGciOi...",
  "refreshToken": "9f3c...",
  "user": {"id": 1, "phone": "+8801XXXXXXXXX", "email": null, "role": "user", "name": "Abdul Kader", "verified": true}
}
```

### `POST /dashboard/auth/logout`
- **Purpose:** Revoke a refresh token.
- **Auth:** Public
- **Request:** `refreshToken (string)`
- **Response `201`:**
```json
{"success": true}
```

### `POST /dashboard/auth/forgot-password`
- **Purpose:** Request a password reset OTP.
- **Auth:** Public
- **Request:** `identifier (string)`
- **Response `201`:**
```json
{"success": true, "message": "If an account exists for this identifier, a reset code has been sent."}
```

### `POST /dashboard/auth/reset-password`
- **Purpose:** Reset password using a verified reset token.
- **Auth:** Public
- **Request:** `resetToken (string)`, `newPassword (string, min 8)`
- **Response `201`:**
```json
{"success": true, "message": "Password reset successfully."}
```

### `POST /dashboard/auth/refresh`
- **Purpose:** Exchange a refresh token for a new token pair.
- **Auth:** Public
- **Request:** `refreshToken (string)`
- **Response `201`:**
```json
{"accessToken": "eyJhbGciOi...", "refreshToken": "1a2b..."}
```

### `GET /dashboard/auth/profile`
- **Purpose:** Get the authenticated user profile.
- **Auth:** Dashboard JWT
- **Response `200`:**
```json
{
  "id": 1, "phone": "+8801XXXXXXXXX", "role": "user", "name": "Abdul Kader",
  "email": "user@example.com", "avatar": null, "verified": true, "language": "en",
  "isDoctorVerified": false, "createdAt": "2026-01-15T09:30:00.000Z"
}
```

#### Dashboard admin auth

### `POST /dashboard/admins/login`
- **Purpose:** Admin login with email and password.
- **Auth:** Public
- **Request:** `email (string)`, `password (string)`
- **Response `201`:**
```json
{
  "accessToken": "eyJhbGciOi...",
  "refreshToken": "7b8c...",
  "admin": {"id": 1, "name": "Admin User", "email": "admin@gobadi.com", "role": "admin", "designation": "founder", "status": "active", "verified": true, "createdAt": "2026-01-10T08:00:00.000Z"}
}
```

### `POST /dashboard/admins/send-otp`
- **Purpose:** Send OTP to admin email.
- **Auth:** Public
- **Request:** `email (string)`, `purpose (enum: verify|reset, default verify)`
- **Response `201`:**
```json
{"success": true, "message": "If an account exists for this email, an OTP has been sent."}
```

### `POST /dashboard/admins/verify-otp`
- **Purpose:** Verify admin OTP (issues token pair for `verify`, a reset token for `reset`).
- **Auth:** Public
- **Request:** `email (string)`, `code (string)`, `purpose (enum: verify|reset, default verify)`
- **Response `201`:**
```json
{
  "verified": true,
  "accessToken": "eyJhbGciOi...",
  "refreshToken": "3d4e...",
  "admin": {"id": 1, "name": "Admin User", "email": "admin@gobadi.com", "role": "admin", "designation": "founder", "status": "active", "verified": true},
  "message": "OTP verified successfully."
}
```

### `POST /dashboard/admins/forgot-password`
- **Purpose:** Request admin password reset.
- **Auth:** Public
- **Request:** `email (string)`
- **Response `201`:**
```json
{"success": true, "message": "If an account exists for this email, a reset code has been sent."}
```

### `POST /dashboard/admins/reset-password`
- **Purpose:** Reset admin password.
- **Auth:** Public
- **Request:** `resetToken (string)`, `newPassword (string, min 8)`
- **Response `201`:**
```json
{"success": true, "message": "Password reset successfully."}
```

### `POST /dashboard/admins/refresh`
- **Purpose:** Refresh admin access token.
- **Auth:** Public
- **Request:** `refreshToken (string)`
- **Response `201`:**
```json
{"accessToken": "eyJhbGciOi...", "refreshToken": "5f6g..."}
```

### `POST /dashboard/admins/logout`
- **Purpose:** Logout admin (revokes the refresh token).
- **Auth:** Dashboard JWT
- **Request:** `refreshToken (string)`
- **Response `201`:**
```json
{"success": true}
```

### `GET /dashboard/admins/profile`
- **Purpose:** Get admin profile.
- **Auth:** Dashboard JWT
- **Response `200`:**
```json
{
  "id": 1, "name": "Admin User", "email": "admin@gobadi.com", "phone": null,
  "avatar": null, "role": "admin", "designation": "founder", "status": "active",
  "verified": true, "createdAt": "2026-01-10T08:00:00.000Z"
}
```

### `PATCH /dashboard/admins/profile`
- **Purpose:** Update admin profile (multipart avatar supported).
- **Auth:** Dashboard JWT
- **Request:** `name? (string)`, `designation? (enum: founder|co_founder|manager|developer|analyst|support)`, `password? (string)`, `phone? (string)`, `avatar? (file)`
- **Response `200`:**
```json
{"id": 1, "name": "Admin User", "email": "admin@gobadi.com", "phone": "+8801XXXXXXXXX", "avatar": "https://...", "role": "admin", "designation": "manager", "status": "active", "verified": true, "updatedAt": "2026-09-20T10:00:00.000Z"}
```

#### Admins CRUD

### `GET /dashboard/admins`
- **Purpose:** List admins (paginated).
- **Auth:** Dashboard Super Admin
- **Request:** `page? (number)`, `limit? (number)`, `search? (string)`
- **Response `200`:**
```json
{
  "data": [{"id": 1, "name": "Admin User", "email": "admin@gobadi.com", "role": "admin", "designation": "founder", "avatar": null, "status": "active", "verified": true, "createdAt": "2026-01-10T08:00:00.000Z"}],
  "page": 1, "limit": 10, "total": 3
}
```

### `GET /dashboard/admins/:id`
- **Purpose:** Get an admin by id.
- **Auth:** Dashboard Super Admin
- **Response `200`:**
```json
{"id": 1, "name": "Admin User", "email": "admin@gobadi.com", "role": "admin", "designation": "founder", "avatar": null, "phone": null, "status": "active", "verified": true, "createdAt": "2026-01-10T08:00:00.000Z"}
```

### `POST /dashboard/admins`
- **Purpose:** Create an admin.
- **Auth:** Dashboard Super Admin
- **Request:** `name (string)`, `email (string)`, `password (string, min 6)`, `designation (enum: founder|co_founder|manager|developer|analyst|support)`, `role? (enum: admin|super_admin)`, `status? (enum: active|deactive)`
- **Response `201`:**
```json
{"id": 4, "name": "New Admin", "email": "new@gobadi.com", "role": "admin", "designation": "support", "avatar": null, "status": "active", "verified": true, "createdAt": "2026-09-27T08:00:00.000Z", "updatedAt": "2026-09-27T08:00:00.000Z"}
```

### `PUT /dashboard/admins/:id`
- **Purpose:** Update an admin.
- **Auth:** Dashboard Super Admin
- **Request:** `name? (string)`, `email? (string)`, `password? (string)`, `role? (enum)`, `designation? (enum)`, `status? (enum)`
- **Response `200`:**
```json
{"id": 4, "name": "Updated Admin", "email": "new@gobadi.com", "role": "admin", "designation": "manager", "avatar": null, "status": "active", "verified": true, "updatedAt": "2026-09-27T09:00:00.000Z"}
```

### `DELETE /dashboard/admins/:id`
- **Purpose:** Delete an admin.
- **Auth:** Dashboard Super Admin
- **Response `200`:**
```json
{"success": true, "message": "Admin deleted successfully"}
```

### `PATCH /dashboard/admins/:id/deactivate`
- **Purpose:** Toggle admin active/deactive status.
- **Auth:** Dashboard Super Admin
- **Response `200`:**
```json
{"id": 4, "name": "Updated Admin", "email": "new@gobadi.com", "role": "admin", "designation": "manager", "avatar": null, "status": "deactive", "verified": true, "updatedAt": "2026-09-27T09:05:00.000Z"}
```

#### Users

### `GET /dashboard/users`
- **Purpose:** List users (paginated, searchable).
- **Auth:** Dashboard Admin
- **Request:** `page? (number)`, `limit? (number)`, `search? (string)`
- **Response `200`:**
```json
{
  "users": [{"id": 1, "name": "Abdul Kader", "email": "user@example.com", "phone": "+8801XXXXXXXXX", "avatar": null, "role": "user", "verified": true, "createdAt": "2026-01-15T09:30:00.000Z", "updatedAt": "2026-02-01T12:00:00.000Z"}],
  "pagination": {"page": 1, "limit": 10, "total": 120, "pages": 12}
}
```

### `GET /dashboard/users/:id`
- **Purpose:** Get a user by id.
- **Auth:** Dashboard Admin
- **Response `200`:**
```json
{"id": 1, "name": "Abdul Kader", "email": "user@example.com", "phone": "+8801XXXXXXXXX", "avatar": null, "role": "user", "verified": true, "createdAt": "2026-01-15T09:30:00.000Z", "updatedAt": "2026-02-01T12:00:00.000Z"}
```

### `PUT /dashboard/users/:id`
- **Purpose:** Update a user (multipart avatar supported).
- **Auth:** Dashboard Admin
- **Request:** `name? (string)`, `email? (string)`, `phone? (string)`, `password? (string)`, `role? (enum)`, `verified? (boolean)` — plus optional `avatar` file
- **Response `200`:**
```json
{"id": 1, "name": "Abdul Kader", "email": "user@example.com", "phone": "+8801XXXXXXXXX", "avatar": "https://...", "role": "user", "verified": true, "createdAt": "2026-01-15T09:30:00.000Z", "updatedAt": "2026-09-27T10:00:00.000Z"}
```

### `DELETE /dashboard/users/:id`
- **Purpose:** Delete a user.
- **Auth:** Dashboard Admin
- **Response `200`:**
```json
{"success": true, "message": "User deleted successfully"}
```

#### Animals

### `GET /dashboard/animals`
- **Purpose:** List animals (paginated, searchable, breed filter).
- **Auth:** Dashboard Admin
- **Request:** `page? (number)`, `limit? (number)`, `search? (string)`, `filter? (string)` (breed, `all` = no filter)
- **Response `200`:**
```json
{
  "data": [{"id": 1, "animalTag": "#1", "animalName": "Bablu", "category": "N/A", "avatar": "https://...", "age": "2 years", "breed": "Sahiwal", "gender": "N/A", "liveWeight": "250", "owner": {"name": "Rahim", "tag": "#1", "avatar": null}}],
  "meta": {"page": 1, "limit": 10, "total": 42, "totalPage": 5}
}
```

### `GET /dashboard/animals/:id`
- **Purpose:** Get animal by id.
- **Auth:** Dashboard Admin
- **Response `200`:**
```json
{"id": 1, "animalTag": "#1", "animalName": "Bablu", "category": "N/A", "avatar": null, "age": "2 years", "breed": "Sahiwal", "gender": "N/A", "liveWeight": "N/A", "owner": {"name": "Rahim", "tag": "#1", "avatar": null}}
```

### `DELETE /dashboard/animals/:id`
- **Purpose:** Delete animal.
- **Auth:** Dashboard Admin
- **Response `200`:**
```json
{"success": true, "message": "Animal deleted successfully"}
```

#### Notifications

### `GET /dashboard/notifications`
- **Purpose:** List all notifications (admin, searchable).
- **Auth:** Dashboard Admin
- **Request:** `page? (number)`, `limit? (number, default 20)`, `search? (string)`, `type? (NotificationType enum)`
- **Response `200`:**
```json
{
  "data": [{"id": 10, "userId": 3, "title": "New prescription ready", "body": "Your prescription is ready to download", "type": "prescription_ready", "referenceType": "Order", "referenceId": "101", "isRead": false, "occurrence": "Morning", "time": "08:00", "createdAt": "2026-09-26T07:00:00.000Z", "user": {"id": 3, "name": "Karim", "email": "k@example.com", "phone": "+8801XXXXXXXXX"}}],
  "meta": {"page": 1, "limit": 20, "total": 55, "totalPage": 3}
}
```

### `GET /dashboard/notifications/user`
- **Purpose:** List current user notifications.
- **Auth:** Dashboard JWT
- **Request:** `page? (number)`, `limit? (number, default 20)`
- **Response `200`:**
```json
{
  "data": [{"id": 10, "userId": 3, "title": "Appointment reminder", "body": "Your visit is at 10:00", "type": "reminder", "isRead": false, "occurrence": null, "time": "10:00", "createdAt": "2026-09-26T07:00:00.000Z"}],
  "meta": {"page": 1, "limit": 20, "total": 8, "totalPage": 1}
}
```

### `GET /dashboard/notifications/unread-count`
- **Purpose:** Unread notification count for current user.
- **Auth:** Dashboard JWT
- **Response `200`:**
```json
{"count": 3}
```

### `GET /dashboard/notifications/:id`
- **Purpose:** Get notification by id (with user).
- **Auth:** Dashboard Admin
- **Response `200`:**
```json
{"id": 10, "userId": 3, "title": "New prescription ready", "body": "Your prescription is ready to download", "type": "prescription_ready", "referenceType": null, "referenceId": null, "isRead": false, "occurrence": null, "time": null, "createdAt": "2026-09-26T07:00:00.000Z", "user": {"id": 3, "name": "Karim", "email": "k@example.com", "phone": "+8801XXXXXXXXX"}}
```

### `POST /dashboard/notifications`
- **Purpose:** Create notification for a user.
- **Auth:** Dashboard Admin
- **Request:** `title (string)`, `body (string)`, `userId (number)`, `type? (NotificationType, default system)`, `referenceType? (string)`, `referenceId? (string)`
- **Response `201`:**
```json
{"id": 11, "userId": 3, "title": "New prescription ready", "body": "Your prescription is ready to download", "type": "system", "referenceType": null, "referenceId": null, "isRead": false, "occurrence": null, "time": null, "createdAt": "2026-09-27T08:00:00.000Z"}
```

### `POST /dashboard/notifications/send`
- **Purpose:** Send notification to specific users (persists rows and enqueues push delivery).
- **Auth:** Dashboard Admin
- **Request:** `title (string)`, `body (string)`, `userIds (number[])`, `type? (NotificationType)`, `referenceType? (string)`, `referenceId? (string)`
- **Response `201`:**
```json
{"count": 3}
```

### `POST /dashboard/notifications/broadcast`
- **Purpose:** Broadcast notification to all users or a role.
- **Auth:** Dashboard Admin
- **Request:** `title (string)`, `body (string)`, `type? (NotificationType)`, `role? (UserRole)`, `occurrence? (string)`, `time? (string)`
- **Response `201`:**
```json
{"success": true, "count": 42}
```

### `PATCH /dashboard/notifications/read-all`
- **Purpose:** Mark all current user notifications as read.
- **Auth:** Dashboard JWT
- **Response `200`:**
```json
{"success": true}
```

### `PATCH /dashboard/notifications/:id/read`
- **Purpose:** Mark notification as read (ownership enforced).
- **Auth:** Dashboard JWT
- **Response `200`:**
```json
{"id": 10, "userId": 3, "title": "Appointment reminder", "body": "Your visit is at 10:00", "type": "reminder", "isRead": true, "occurrence": null, "time": "10:00", "createdAt": "2026-09-26T07:00:00.000Z"}
```

### `DELETE /dashboard/notifications/:id`
- **Purpose:** Delete notification.
- **Auth:** Dashboard Admin
- **Response `200`:**
```json
{"success": true, "message": "Notification deleted successfully"}
```

#### Analytics

### `GET /dashboard/stats`
- **Purpose:** Dashboard overview stats.
- **Auth:** Dashboard Admin
- **Request:** `period? (string: last_7_days|last_30_days|this_year, default last_7_days)`
- **Response `200`:**
```json
{
  "totalDownloads": 0, "totalUsers": 120, "totalFarmers": 80, "totalDoctors": 20,
  "userGrowth": {"current": 12, "previous": 8, "changePercent": 50, "isPositive": true}
}
```

### `GET /dashboard/user-growth`
- **Purpose:** User growth chart.
- **Auth:** Dashboard Admin
- **Request:** `period? (string)`
- **Response `200`:**
```json
{
  "chartData": [{"day": "Mon", "value": 4}, {"day": "Tue", "value": 2}],
  "summary": {"total": 30, "changePercent": 12, "isPositive": true}
}
```

### `GET /dashboard/user-os`
- **Purpose:** Push token OS chart.
- **Auth:** Dashboard Admin
- **Request:** `period? (string)`
- **Response `200`:**
```json
{
  "android": [{"date": "01", "value": 3}],
  "ios": [{"date": "01", "value": 1}]
}
```

### `GET /dashboard/ai-users`
- **Purpose:** AI users stats.
- **Auth:** Dashboard Admin
- **Request:** `period? (string)`
- **Response `200`:**
```json
{"totalAiUsers": 45, "changePercent": 10, "isPositive": true, "gaugePercentage": 38}
```

### `GET /dashboard/appointments`
- **Purpose:** Appointments chart.
- **Auth:** Dashboard Admin
- **Request:** `period? (string)`
- **Response `200`:**
```json
{"chartData": [{"day": "Mon", "bar1": 5, "bar2": 1}, {"day": "Tue", "bar1": 3, "bar2": 0}]}
```

### `GET /dashboard/retention`
- **Purpose:** User retention chart.
- **Auth:** Dashboard Admin
- **Request:** `period? (string)`
- **Response `200`:**
```json
{
  "chartData": [{"day": "Mon", "value": 6}],
  "summary": {"total": 40, "changePercent": 5, "isPositive": true},
  "targetLine": 6
}
```

### `GET /dashboard/user-list-stats`
- **Purpose:** User list stats.
- **Auth:** Dashboard Admin
- **Request:** `period? (string)`
- **Response `200`:**
```json
{
  "totalFarmers": {"value": 80, "changePercent": 10, "isPositive": true},
  "totalDoctors": {"value": 20, "changePercent": 5, "isPositive": true},
  "activeAnimals": {"value": 42, "changePercent": 0, "isPositive": true},
  "referralUsers": {"value": 7, "changePercent": 16, "isPositive": true}
}
```

### `GET /dashboard/user-location`
- **Purpose:** User location distribution.
- **Auth:** Dashboard Admin
- **Request:** `period? (string)`, `role? (doctor = doctors, anything else = farmers)`, `filter? (District|Upazila|Division, default District)`
- **Response `200`:**
```json
{"chartData": [{"location": "Dhaka", "count": 12}, {"location": "Rangpur", "count": 5}]}
```

### `GET /dashboard/daily-users`
- **Purpose:** Daily users chart.
- **Auth:** Dashboard Admin
- **Request:** `period? (string)`
- **Response `200`:**
```json
{
  "chartData": [{"day": "Mon", "users": 4}],
  "summary": {"total": 30, "changePercent": 12, "isPositive": true}
}
```

### `GET /dashboard/registered-animals`
- **Purpose:** Registered animals chart.
- **Auth:** Dashboard Admin
- **Request:** `period? (string)`
- **Response `200`:**
```json
{
  "chartData": [{"day": "M", "fullDay": "Mon", "count": 15}],
  "summary": {"total": 100, "changePercent": 0, "isPositive": true}
}
```

### `GET /dashboard/task-feature-users`
- **Purpose:** Task feature users chart.
- **Auth:** Dashboard Admin
- **Request:** `period? (string)`
- **Response `200`:**
```json
{
  "chartData": [{"month": "Mon", "value": 3}],
  "summary": {"total": 9, "changePercent": 20, "isPositive": true}
}
```

### `GET /dashboard/search`
- **Purpose:** Global dashboard search (farmers, doctors, animals, notifications).
- **Auth:** Dashboard Admin
- **Request:** `q? (string, min 2 characters — shorter terms return empty arrays)`
- **Response `200`:**
```json
{
  "farmers": [{"id": 1, "name": "Rahim", "email": "r@example.com", "phone": "+8801XXXXXXXXX", "avatar": null, "verified": true}],
  "doctors": [],
  "animals": [{"id": 2, "name": "Bablu", "breed": "Sahiwal", "image": null, "userId": 1}],
  "notifications": [{"id": 10, "title": "Order placed", "body": "...", "type": "order", "isRead": false, "createdAt": "2026-09-26T07:00:00.000Z"}]
}
```

### `GET /dashboard/farmers`
- **Purpose:** Farmers list (paginated, searchable).
- **Auth:** Dashboard Admin
- **Request:** `page? (number)`, `limit? (number)`, `search? (string)`, `status? (active|inactive|pending|all)`
- **Response `200`:**
```json
{
  "users": [{"id": 1, "name": "Rahim", "email": "r@example.com", "phone": "+8801XXXXXXXXX", "avatar": null, "role": "user", "verified": true, "createdAt": "2026-01-15T09:30:00.000Z", "updatedAt": "2026-02-01T12:00:00.000Z"}],
  "pagination": {"page": 1, "limit": 10, "total": 80, "pages": 8}
}
```

### `GET /dashboard/doctors`
- **Purpose:** Doctors list (paginated, searchable).
- **Auth:** Dashboard Admin
- **Request:** `page? (number)`, `limit? (number)`, `search? (string)`, `status? (active|inactive|pending|all)`
- **Response `200`:**
```json
{
  "users": [{"id": 5, "name": "Dr. Salam", "email": "d@example.com", "phone": "+8801XXXXXXXXX", "avatar": null, "role": "doctor", "verified": true, "createdAt": "2026-01-20T09:30:00.000Z", "updatedAt": "2026-02-02T12:00:00.000Z"}],
  "pagination": {"page": 1, "limit": 10, "total": 20, "pages": 2}
}
```

### `GET /dashboard/farmers/:id`
- **Purpose:** Get farmer by id.
- **Auth:** Dashboard Admin
- **Response `200`:**
```json
{"id": 1, "name": "Rahim", "email": "r@example.com", "phone": "+8801XXXXXXXXX", "avatar": null, "role": "user", "verified": true, "createdAt": "2026-01-15T09:30:00.000Z", "updatedAt": "2026-02-01T12:00:00.000Z"}
```

### `GET /dashboard/doctors/:id`
- **Purpose:** Get doctor by id.
- **Auth:** Dashboard Admin
- **Response `200`:**
```json
{"id": 5, "name": "Dr. Salam", "email": "d@example.com", "phone": "+8801XXXXXXXXX", "avatar": null, "role": "doctor", "verified": true, "createdAt": "2026-01-20T09:30:00.000Z", "updatedAt": "2026-02-02T12:00:00.000Z"}
```

### `DELETE /dashboard/farmers/:id`
- **Purpose:** Delete farmer.
- **Auth:** Dashboard Admin
- **Response `200`:**
```json
{"success": true, "message": "Farmer deleted successfully"}
```

### `DELETE /dashboard/doctors/:id`
- **Purpose:** Delete doctor.
- **Auth:** Dashboard Admin
- **Response `200`:**
```json
{"success": true, "message": "Doctor deleted successfully"}
```

## 9. Doctors, scheduling & clinic services

This part covers the doctor profile/availability APIs, appointment booking and consultation lifecycle, blocked time-off ranges, calendar views, and the clinic/service catalogs plus the small patient, badge, task, alert, referral, support, FAQ and notification APIs that back the doctor and clinic apps. Successful responses are returned raw (no envelope); errors use `{"success": false, "statusCode": N, "message": "...", "errorSources": [...]}`.

### Doctors

### `GET /doctors`
- **Purpose:** List all doctors, optionally paginated or filtered by specialty.
- **Auth:** Public
- **Request:** `page (number)`, `limit (number)`, `specialty (string)`
- **Response `200`:**
```json
[
  { "id": 1, "userId": 10, "name": "Dr. John Smith", "specialty": "Cardiology", "experience": "10 Years", "rating": 4.8, "avatar": "...", "consultationFee": 500, "isVerified": true }
]
```

### `GET /doctors/me`
- **Purpose:** Get the current logged-in doctor's own profile.
- **Auth:** JWT + Role(DOCTOR)
- **Response `200`:**
```json
{ "id": 1, "userId": 10, "name": "Dr. John Smith", "specialty": "Cardiology", "bio": "...", "qualifications": ["MBBS"], "specializations": ["Cardiology"], "experiences": [], "consultationFee": 500, "isVerified": true }
```

### `PATCH /doctors/me`
- **Purpose:** Update the current doctor's core profile fields.
- **Auth:** JWT + Role(DOCTOR)
- **Request:** `name (string)`, `specialty (string)`, `experience (string)`, `avatar (string)`, `bio (string)`, `consultationFee (number)`
- **Response `200`:**
```json
{ "id": 1, "userId": 10, "name": "Dr. John Smith", "specialty": "Cardiology", "experience": "10 Years", "avatar": "...", "bio": "...", "consultationFee": 500, "licenseNumber": "VET-12345", "isVerified": true }
```

### `GET /doctors/:id`
- **Purpose:** Get a doctor by id.
- **Auth:** Public
- **Request:** `id (path param)`
- **Response `200`:**
```json
{ "id": 1, "userId": 10, "name": "Dr. John Smith", "specialty": "Cardiology", "rating": 4.8, "qualifications": [], "specializations": [], "consultationFee": 500, "isVerified": true }
```

### `GET /doctors/:id/availability`
- **Purpose:** Get a doctor's weekly availability windows (recurring rules and date overrides).
- **Auth:** Public
- **Request:** `id (path param)`
- **Response `200`:**
```json
[
  { "id": 3, "doctorId": 1, "dayOfWeek": 1, "startTime": "09:00", "endTime": "17:00", "slotDurationMinutes": 30, "bufferMinutes": 10, "isActive": true, "specificDate": null, "isAvailable": true }
]
```

### `POST /doctors/:id/availability`
- **Purpose:** Replace a doctor's whole weekly availability (doctor-only, own profile).
- **Auth:** JWT + Role(DOCTOR)
- **Request:** `id (path param)`, `entries[].dayOfWeek (number)`, `entries[].startTime (string)`, `entries[].endTime (string)`, `entries[].slotDurationMinutes (number)`, `entries[].bufferMinutes (number)`
- **Response `201`:**
```json
[
  { "id": 7, "doctorId": 1, "dayOfWeek": 1, "startTime": "09:00", "endTime": "17:00", "slotDurationMinutes": 30, "bufferMinutes": 10, "isActive": true }
]
```

### `PATCH /doctors/:id/availability/:dayId`
- **Purpose:** Update a single day's availability without resending the whole week.
- **Auth:** JWT + Role(DOCTOR)
- **Request:** `id (path param)`, `dayId (path param)`, `startTime (string)`, `endTime (string)`, `isActive (boolean)`, `overrideSlots (string[])`
- **Response `200`:**
```json
{ "id": 7, "doctorId": 1, "dayOfWeek": 1, "startTime": "10:00", "endTime": "16:00", "slotDurationMinutes": 30, "bufferMinutes": 10, "isActive": true, "isAvailable": true }
```

### `PATCH /doctors/me/qualifications`
- **Purpose:** Update the current doctor's qualifications.
- **Auth:** JWT + Role(DOCTOR)
- **Request:** `qualifications (string[])`
- **Response `200`:**
```json
{ "id": 1, "userId": 10, "name": "Dr. John Smith", "specialty": "Cardiology", "qualifications": ["MBBS", "MD Cardiology"], "specializations": [], "consultationFee": 500 }
```

### `PATCH /doctors/me/specializations`
- **Purpose:** Update the current doctor's specializations.
- **Auth:** JWT + Role(DOCTOR)
- **Request:** `specializations (string[])`
- **Response `200`:**
```json
{ "id": 1, "userId": 10, "name": "Dr. John Smith", "specialty": "Cardiology", "qualifications": [], "specializations": ["Cardiology", "Pediatrics"], "consultationFee": 500 }
```

### `PATCH /doctors/me/experiences`
- **Purpose:** Update the current doctor's work experiences.
- **Auth:** JWT + Role(DOCTOR)
- **Request:** `experiences[].title (string)`, `experiences[].organization (string)`, `experiences[].duration (string)`, `experiences[].description (string)`
- **Response `200`:**
```json
{ "id": 1, "userId": 10, "name": "Dr. John Smith", "experiences": [{ "title": "Senior Vet", "organization": "City Clinic", "duration": "3 years", "description": "..." }] }
```

### `GET /doctors/me/dashboard-stats`
- **Purpose:** Get the current doctor's dashboard stats (patient/consultation counts plus profile summary).
- **Auth:** JWT + Role(DOCTOR)
- **Response `200`:**
```json
{ "totalPatients": 42, "totalConsultations": 87, "yearsOfExperience": "10 Years", "specializations": ["Cardiology"], "qualifications": ["MBBS"], "consultationFee": 500, "rating": 4.8 }
```

### `GET /doctors/:id/schedule`
- **Purpose:** Get a doctor's schedule (appointments plus blocked time-off ranges) with optional filters.
- **Auth:** Public
- **Request:** `date (string)`, `consultationType (string)`, `status (string)`, `month (number)`, `year (number)`
- **Response `200`:**
```json
{
  "appointments": [{ "id": 5, "doctorId": 1, "patientId": 2, "startAt": "2026-08-01T10:00:00.000Z", "endAt": "2026-08-01T10:30:00.000Z", "status": "CONFIRMED", "consultationType": "physical" }],
  "blockTimes": [{ "id": 2, "doctorId": 1, "startDate": "2026-08-24", "endDate": "2026-08-26", "reason": "vacation", "note": "..." }]
}
```

### `GET /doctors/:id/schedule/list`
- **Purpose:** Get the doctor's schedule as a flat list of appointments for a month, ascending by start time.
- **Auth:** Public
- **Request:** `month (number)`, `year (number)`
- **Response `200`:**
```json
[
  { "id": 5, "doctorId": 1, "patientId": 2, "startAt": "2026-08-01T10:00:00.000Z", "endAt": "2026-08-01T10:30:00.000Z", "durationMinutes": 30, "price": 500, "status": "CONFIRMED" }
]
```

### Appointments

### `GET /doctors/:id/slots`
- **Purpose:** List open booking slots for a doctor on a given date.
- **Auth:** Public
- **Request:** `id (path param)`, `date (string)`
- **Response `200`:**
```json
["10:00 AM", "10:30 AM", "11:00 AM"]
```

### `POST /doctors/book`
- **Purpose:** Book an appointment slot with a doctor.
- **Auth:** JWT + Role(USER)
- **Request:** `doctorId (string)`, `date (string)`, `time (string)`, `animalId (number)`, `consultationType (string)`, `reasonForConsultation (string)`
- **Response `201`:**
```json
{ "id": 12, "doctorId": 1, "patientId": 2, "animalId": 4, "startAt": "2026-08-01T10:00:00.000Z", "endAt": "2026-08-01T10:30:00.000Z", "durationMinutes": 30, "price": 500, "paymentStatus": "pending", "status": "CONFIRMED" }
```

### `GET /doctors/bookings/all`
- **Purpose:** List the current user's appointments (patient: own bookings, doctor: their bookings), unpaginated unless `page`/`limit` given.
- **Auth:** JWT
- **Request:** `filter (string)`, `consultationType (string)`, `search (string)`, `page (number)`, `limit (number)`
- **Response `200`:**
```json
[
  { "id": 12, "doctorId": 1, "patientId": 2, "animalName": "Masha", "startAt": "2026-08-01T10:00:00.000Z", "status": "CONFIRMED", "consultationType": "online_video", "price": 500, "paymentStatus": "paid" }
]
```

### `GET /doctors/bookings/:id`
- **Purpose:** Get a single appointment's details by ID.
- **Auth:** JWT
- **Request:** `id (path param)`
- **Response `200`:**
```json
{ "id": 12, "doctorId": 1, "patientId": 2, "patientName": "Rahim Uddin", "animalName": "Masha", "startAt": "2026-08-01T10:00:00.000Z", "endAt": "2026-08-01T10:30:00.000Z", "status": "CONFIRMED", "reasonForConsultation": "...", "symptoms": ["Fever"] }
```

### `GET /doctors/bookings/stats/today`
- **Purpose:** Get today's appointment stats for the current doctor.
- **Auth:** JWT + Role(DOCTOR)
- **Response `200`:**
```json
{ "totalToday": 6, "completedToday": 2 }
```

### `GET /doctors/bookings/recent-completed`
- **Purpose:** Get recently completed appointments (last N days, default 2).
- **Auth:** JWT + Role(DOCTOR)
- **Request:** `days (number)`
- **Response `200`:**
```json
[
  { "id": 9, "doctorId": 1, "patientName": "Rahim Uddin", "animalName": "Masha", "startAt": "2026-08-25T09:00:00.000Z", "status": "COMPLETED", "consultationType": "physical", "price": 500 }
]
```

### `GET /doctors/bookings/search`
- **Purpose:** Search/filter the current doctor's appointments by patient or animal name, date and consultation type.
- **Auth:** JWT + Role(DOCTOR)
- **Request:** `search (string)`, `date (string)`, `consultationType (string)`, `page (number)`, `limit (number)`
- **Response `200`:**
```json
{ "data": [{ "id": 12, "patientName": "Rahim Uddin", "animalName": "Masha", "startAt": "2026-08-01T10:00:00.000Z", "status": "CONFIRMED" }], "page": 1, "limit": 20, "total": 1 }
```

### `PATCH /doctors/bookings/:id/reschedule`
- **Purpose:** Reschedule an appointment (must be outside the pre-start cancellation buffer).
- **Auth:** JWT
- **Request:** `id (path param)`, `date (string)`, `time (string)`
- **Response `200`:**
```json
{ "id": 13, "doctorId": 1, "patientId": 2, "startAt": "2026-08-02T11:30:00.000Z", "endAt": "2026-08-02T12:00:00.000Z", "status": "RESCHEDULED", "originalStartAt": "2026-08-01T10:00:00.000Z", "rescheduledAt": "2026-07-30T08:00:00.000Z" }
```

### `PATCH /doctors/bookings/:id/cancel`
- **Purpose:** Cancel an appointment outside the buffer window; refunds the patient wallet if the appointment was paid.
- **Auth:** JWT
- **Request:** `id (path param)`, `reason (string)`, `note (string)`
- **Response `200`:**
```json
{ "id": 12, "status": "CANCELLED", "cancelledAt": "2026-07-30T08:00:00.000Z", "cancellationReason": "Family emergency", "price": 500, "cancellationFee": 50, "refundAmount": 450, "walletDeduction": 500 }
```

### `PATCH /doctors/bookings/:id/complete`
- **Purpose:** Mark an appointment as completed (doctor-only) and record a CONSULTATION medical event.
- **Auth:** JWT + Role(DOCTOR)
- **Request:** `id (path param)`
- **Response `200`:**
```json
{ "id": 12, "doctorId": 1, "patientId": 2, "startAt": "2026-08-01T10:00:00.000Z", "status": "COMPLETED", "consultationType": "physical", "paymentStatus": "paid" }
```

### `POST /doctors/bookings/:id/join`
- **Purpose:** Get Agora token + channel info for joining an online consultation.
- **Auth:** JWT
- **Request:** `id (path param)`
- **Response `200`:**
```json
{ "token": "006...", "channelName": "appointment_12", "appId": "..." }
```

### `PATCH /doctors/bookings/:id/start-consultation`
- **Purpose:** Start a consultation for an appointment (doctor-only), optionally storing initial notes.
- **Auth:** JWT + Role(DOCTOR)
- **Request:** `id (path param)`, `consultationNotes (string)`
- **Response `200`:**
```json
{ "id": 12, "doctorId": 1, "status": "CONFIRMED", "consultationNotes": "Animal presents with fever...", "startAt": "2026-08-01T10:00:00.000Z", "consultationType": "online_video" }
```

### Time off (block times)

### `GET /doctors/:id/block-times`
- **Purpose:** List a doctor's blocked time-off date ranges.
- **Auth:** Public
- **Request:** `id (path param)`
- **Response `200`:**
```json
[
  { "id": 2, "doctorId": 1, "startDate": "2026-08-24", "endDate": "2026-08-26", "reason": "vacation", "note": "I need a vacation", "createdAt": "2026-08-01T10:00:00.000Z" }
]
```

### `POST /doctors/:id/block-times`
- **Purpose:** Block a date range; without `force` a conflict returns 409 with the conflict list and fee estimate, with `force: true` conflicting appointments are cancelled, patients refunded and the doctor wallet debited.
- **Auth:** JWT + Role(DOCTOR)
- **Request:** `id (path param)`, `startDate (string)`, `endDate (string)`, `reason (string)`, `note (string)`, `force (boolean)`
- **Response `201`:**
```json
{ "timeOff": { "id": 2, "doctorId": 1, "startDate": "2026-08-24", "endDate": "2026-08-26", "reason": "vacation", "note": "..." }, "cancelledAppointments": [{ "id": 12, "startAt": "2026-08-24T10:00:00.000Z", "patientId": 2, "price": 500 }], "refundedTotal": 500, "cancellationFeesTotal": 50, "walletDeduction": 550 }
```

### `DELETE /doctors/:id/block-times/:blockId`
- **Purpose:** Remove a blocked time-off range.
- **Auth:** JWT + Role(DOCTOR)
- **Request:** `id (path param)`, `blockId (path param)`
- **Response `200`:**
```json
{ "success": true }
```

### `GET /doctors/:id/block-times/calculate-fee`
- **Purpose:** Calculate the cancellation fee and refund amount for an appointment.
- **Auth:** JWT
- **Request:** `appointmentId (string, query)`
- **Response `200`:**
```json
{ "cancellationFee": 50, "refundAmount": 450 }
```

### Calendar

### `GET /calendar/doctor/:doctorId`
- **Purpose:** Get a doctor's month calendar with appointments, tasks and block times grouped per day.
- **Auth:** JWT
- **Request:** `doctorId (path param)`, `month (number)`, `year (number)`
- **Response `200`:**
```json
[
  { "date": "2026-08-01", "appointments": [{ "id": 12, "startAt": "2026-08-01T10:00:00.000Z", "status": "CONFIRMED" }], "tasks": [{ "id": 3, "title": "Feed Animals", "isDone": false }], "blockTimes": [] }
]
```

### `GET /calendar/doctor/:doctorId/week`
- **Purpose:** Get a doctor's week calendar (Sunday..Saturday) grouped per day.
- **Auth:** JWT
- **Request:** `doctorId (path param)`, `date (string)`
- **Response `200`:**
```json
[
  { "date": "2026-08-23", "appointments": [], "tasks": [], "blockTimes": [{ "id": 2, "startDate": "2026-08-24", "endDate": "2026-08-26", "reason": "vacation" }] }
]
```

### `GET /calendar/appointments`
- **Purpose:** Get the current user's appointments for a day/week/month view.
- **Auth:** JWT
- **Request:** `date (string)`, `view (string: day|week|month)`
- **Response `200`:**
```json
[
  { "id": 12, "doctorId": 1, "patientId": 2, "startAt": "2026-08-25T10:00:00.000Z", "endAt": "2026-08-25T10:30:00.000Z", "status": "CONFIRMED", "consultationType": "physical" }
]
```

### `GET /calendar/badges`
- **Purpose:** Get per-day appointment counts plus open/blocked day totals for a month.
- **Auth:** JWT
- **Request:** `month (number)`, `year (number)`
- **Response `200`:**
```json
{ "badges": { "2026-08-01": 2, "2026-08-02": 1 }, "totalAppointments": 34, "openDays": 18, "blockedDays": 3 }
```

### Clinics

### `GET /clinics`
- **Purpose:** List all clinics with optional pagination (includes associated doctors).
- **Auth:** Public
- **Request:** `page (number)`, `limit (number)`
- **Response `200`:**
```json
[
  { "id": 1, "userId": 7, "name": "Savar Veterinary Clinic", "location": "Dhaka, Savar", "isVerified": true, "rating": 5, "avatar": "...", "description": "...", "doctors": [] }
]
```

### `GET /clinics/:id`
- **Purpose:** Get details of a clinic by ID.
- **Auth:** Public
- **Request:** `id (path param)`
- **Response `200`:**
```json
{ "id": 1, "userId": 7, "name": "Savar Veterinary Clinic", "location": "Dhaka, Savar", "businessHours": { "mon_fri": "09:00-18:00" }, "isVerified": true, "rating": 5, "description": "...", "doctors": [{ "id": 1, "name": "Dr. John Smith", "specialty": "Cardiology" }] }
```

### `POST /clinics`
- **Purpose:** Create a new clinic profile (Clinic owner / Admin only).
- **Auth:** JWT + Role(CLINIC, ADMIN)
- **Request:** `name (string)`, `location (string)`, `description (string)`, `businessHours (object)`, `avatar (string)`
- **Response `201`:**
```json
{ "id": 3, "userId": 7, "name": "Savar Veterinary Clinic", "location": "Dhaka, Savar", "description": "...", "businessHours": null, "isVerified": false, "rating": 5, "doctors": [] }
```

### `PUT /clinics/:id`
- **Purpose:** Update clinic profile details (owner or admin).
- **Auth:** JWT
- **Request:** `id (path param)`, `name (string)`, `location (string)`, `description (string)`, `businessHours (object)`
- **Response `200`:**
```json
{ "id": 1, "userId": 7, "name": "Savar Veterinary Clinic", "location": "Dhaka, Savar", "description": "...", "isVerified": true, "rating": 5 }
```

### `PATCH /clinics/:id/verify`
- **Purpose:** Verify or reject a clinic profile (Admin only); notifies the clinic owner.
- **Auth:** JWT + Role(ADMIN)
- **Request:** `id (path param)`, `isVerified (boolean)`
- **Response `200`:**
```json
{ "id": 1, "userId": 7, "name": "Savar Veterinary Clinic", "isVerified": true, "location": "Dhaka, Savar", "rating": 5 }
```

### `POST /clinics/:id/doctors`
- **Purpose:** Add a doctor association to a clinic (Owner/Admin only).
- **Auth:** JWT
- **Request:** `id (path param)`, `doctorId (number)`
- **Response `201`:**
```json
{ "id": 1, "userId": 7, "name": "Savar Veterinary Clinic", "doctors": [{ "id": 1, "name": "Dr. John Smith", "specialty": "Cardiology" }] }
```

### `DELETE /clinics/:id/doctors/:doctorId`
- **Purpose:** Remove a doctor association from a clinic (Owner/Admin only).
- **Auth:** JWT
- **Request:** `id (path param)`, `doctorId (path param)`
- **Response `200`:**
```json
{ "id": 1, "userId": 7, "name": "Savar Veterinary Clinic", "doctors": [] }
```

### Services

### `GET /services`
- **Purpose:** List all active consulting services, optionally by provider.
- **Auth:** Public
- **Request:** `providerType (string)`, `providerId (number)`
- **Response `200`:**
```json
[
  { "id": 1, "providerType": "doctor", "providerId": 1, "name": "Cattle General Checkup", "durationMinutes": 30, "price": 500, "isOnline": true, "isOffline": false, "isActive": true }
]
```

### `GET /services/:id`
- **Purpose:** Get details of a service by ID.
- **Auth:** Public
- **Request:** `id (path param)`
- **Response `200`:**
```json
{ "id": 1, "providerType": "doctor", "providerId": 1, "name": "Cattle General Checkup", "description": "...", "durationMinutes": 30, "price": 500, "preparationInstructions": "...", "cancellationPolicy": "...", "isActive": true }
```

### `POST /services`
- **Purpose:** Create a new consulting service (Providers / Admin only).
- **Auth:** JWT + Role(DOCTOR, CLINIC, ADMIN)
- **Request:** `providerType (string)`, `providerId (number)`, `name (string)`, `description (string)`, `durationMinutes (number)`, `price (number)`
- **Response `201`:**
```json
{ "id": 4, "providerType": "doctor", "providerId": 1, "name": "Cattle General Checkup", "durationMinutes": 30, "price": 500, "isOnline": true, "isOffline": false, "isActive": true }
```

### `PUT /services/:id`
- **Purpose:** Update service details (Providers / Admin only).
- **Auth:** JWT + Role(DOCTOR, CLINIC, ADMIN)
- **Request:** `id (path param)`, `name (string)`, `price (number)`, `durationMinutes (number)`, `isActive (boolean)`
- **Response `200`:**
```json
{ "id": 4, "providerType": "doctor", "providerId": 1, "name": "Cattle General Checkup", "durationMinutes": 45, "price": 600, "isActive": true }
```

### `DELETE /services/:id`
- **Purpose:** Deactivate a service by ID (Providers / Admin only).
- **Auth:** JWT + Role(DOCTOR, CLINIC, ADMIN)
- **Request:** `id (path param)`
- **Response `200`:**
```json
null
```

### Patients

### `GET /patients`
- **Purpose:** List patients (animals) with owner info, paginated and searchable.
- **Auth:** JWT + Role(DOCTOR, ADMIN)
- **Request:** `page (number)`, `limit (number)`, `search (string)`
- **Response `200`:**
```json
{ "data": [{ "id": 4, "userId": 2, "name": "Masha", "breed": "Sahiwal", "age": "3 years", "gender": "female", "ownerName": "Rahim Uddin", "ownerPhone": "...", "ownerEmail": "..." }], "page": 1, "limit": 20, "total": 1 }
```

### `GET /patients/:id`
- **Purpose:** Get a single patient (animal) by ID with owner details.
- **Auth:** JWT + Role(DOCTOR, ADMIN)
- **Request:** `id (path param)`
- **Response `200`:**
```json
{ "id": 4, "userId": 2, "name": "Masha", "breed": "Sahiwal", "weight": "420 kg", "age": "3 years", "gender": "female", "ownerName": "Rahim Uddin", "ownerPhone": "...", "ownerEmail": "..." }
```

### Badges

### `GET /badges/available`
- **Purpose:** Get all badges a user can earn.
- **Auth:** Public
- **Response `200`:**
```json
[
  { "id": 1, "name": "First Consultation", "description": "Complete your first consultation", "icon": "...", "criteria": { "type": "consultations", "threshold": 1 }, "createdAt": "2026-01-01T00:00:00.000Z" }
]
```

### `GET /badges/me`
- **Purpose:** Get the badges the current user has earned.
- **Auth:** JWT
- **Response `200`:**
```json
[
  { "id": 1, "name": "First Consultation", "description": "Complete your first consultation", "icon": "...", "criteria": { "type": "consultations", "threshold": 1 }, "earnedAt": "2026-07-20T09:15:00.000Z" }
]
```

### Tasks

### `GET /tasks`
- **Purpose:** Get the current user's tasks for a given day (cached in Redis for 5 minutes).
- **Auth:** JWT
- **Request:** `date (string)`, `tzOffset (number)`, `category (string)`, `priority (string)`
- **Response `200`:**
```json
[
  { "id": 7, "userId": 10, "title": "Feed Animals", "detail": "Morning feed for cattle", "scheduledTime": "2026-07-27T06:30:00.000Z", "isDone": false, "category": "animal", "priority": "high", "dueDate": "2026-08-15" }
]
```

### `POST /tasks`
- **Purpose:** Create a task.
- **Auth:** JWT
- **Request:** `title (string)`, `scheduledTime (string)`, `detail (string)`, `category (string)`, `priority (string)`
- **Response `201`:**
```json
{ "id": 8, "userId": 10, "title": "Feed Animals", "detail": "Morning feed for cattle", "scheduledTime": "2026-07-27T06:30:00.000Z", "isDone": false, "category": "animal", "priority": "medium", "dueDate": null }
```

### `PATCH /tasks/:id/toggle`
- **Purpose:** Toggle a task done/undone.
- **Auth:** JWT
- **Request:** `id (path param)`
- **Response `200`:**
```json
{ "id": 7, "userId": 10, "title": "Feed Animals", "scheduledTime": "2026-07-27T06:30:00.000Z", "isDone": true, "category": "animal", "priority": "high" }
```

### `PATCH /tasks/:id`
- **Purpose:** Update a task's fields.
- **Auth:** JWT
- **Request:** `id (path param)`, `title (string)`, `detail (string)`, `scheduledTime (string)`, `priority (string)`, `dueDate (string)`
- **Response `200`:**
```json
{ "id": 7, "userId": 10, "title": "Feed Animals (updated)", "detail": "...", "scheduledTime": "2026-07-27T07:00:00.000Z", "isDone": false, "priority": "high" }
```

### `DELETE /tasks/:id`
- **Purpose:** Delete a task.
- **Auth:** JWT
- **Request:** `id (path param)`
- **Response `200`:**
```json
{ "success": true }
```

### Alerts

### `GET /alerts`
- **Purpose:** List active regional crop/disease risk alerts.
- **Auth:** JWT
- **Request:** `severity (string)`
- **Response `200`:**
```json
[
  { "id": 1, "title": "Late blight risk", "location": "Savar", "crop": "Potato", "severity": "HIGH", "actionType": "MANAGE", "isActive": true, "createdAt": "2026-08-20T06:00:00.000Z" }
]
```

### `POST /alerts/:id/action`
- **Purpose:** Dispatch the user's chosen action on an alert (queued for logging).
- **Auth:** JWT
- **Request:** `id (path param)`, `actionChoice (string: MANAGE|SCHEDULE)`
- **Response `201`:**
```json
{ "success": true }
```

### Referrals

### `GET /referrals/me`
- **Purpose:** Get the current user's referral code, earnings and share link (creates the row on first access).
- **Auth:** JWT
- **Response `200`:**
```json
{ "id": 5, "userId": 10, "referralCode": "FARM-8X29", "totalEarned": 300, "pendingAmount": 100, "payoutStatus": "PENDING", "referralCount": 3, "redeemedReferralCode": null, "shareLink": "https://gobadi.app/refer?code=FARM-8X29" }
```

### `POST /referrals/claim`
- **Purpose:** Claim another user's referral code (rate-limited to 30/min).
- **Auth:** JWT
- **Request:** `code (string)`
- **Response `201`:**
```json
{ "id": 6, "userId": 11, "referralCode": "FARM-3QQ1", "totalEarned": 0, "pendingAmount": 0, "payoutStatus": "NONE", "referralCount": 0, "redeemedReferralCode": "FARM-8X29" }
```

### Support

### `POST /support/tickets`
- **Purpose:** Create a support ticket.
- **Auth:** JWT
- **Request:** `subject (string)`, `message (string)`
- **Response `201`:**
```json
{ "id": 3, "userId": 10, "subject": "Cannot access my account", "message": "...", "status": "open", "createdAt": "2026-08-26T08:00:00.000Z", "updatedAt": "2026-08-26T08:00:00.000Z" }
```

### `GET /support/tickets`
- **Purpose:** List the current user's own support tickets.
- **Auth:** JWT
- **Response `200`:**
```json
[
  { "id": 3, "userId": 10, "subject": "Cannot access my account", "message": "...", "status": "open", "createdAt": "2026-08-26T08:00:00.000Z" }
]
```

### `GET /support/tickets/:id`
- **Purpose:** Get ticket details (owner or admin only).
- **Auth:** JWT
- **Request:** `id (path param)`
- **Response `200`:**
```json
{ "id": 3, "userId": 10, "subject": "Cannot access my account", "message": "...", "status": "in-progress", "createdAt": "2026-08-26T08:00:00.000Z", "updatedAt": "2026-08-26T09:00:00.000Z" }
```

### `POST /support/tickets/:id/reply`
- **Purpose:** Reply to a ticket (owner or admin only); moves an open ticket to in-progress.
- **Auth:** JWT
- **Request:** `id (path param)`, `message (string)`
- **Response `201`:**
```json
{ "id": 9, "ticketId": 3, "authorId": 10, "message": "Please try resetting your password.", "createdAt": "2026-08-26T09:05:00.000Z" }
```

### FAQs

### `GET /faqs`
- **Purpose:** List FAQs, optionally filtered by category.
- **Auth:** Public
- **Request:** `category (string)`
- **Response `200`:**
```json
[
  { "id": 1, "question": "How do I book an appointment?", "answer": "...", "category": "bookings", "sortOrder": 0, "createdAt": "2026-01-01T00:00:00.000Z" }
]
```

### `GET /faqs/:id`
- **Purpose:** Get a single FAQ.
- **Auth:** Public
- **Request:** `id (path param)`
- **Response `200`:**
```json
{ "id": 1, "question": "How do I book an appointment?", "answer": "...", "category": "bookings", "sortOrder": 0, "createdAt": "2026-01-01T00:00:00.000Z" }
```

### Notifications

### `GET /notifications`
- **Purpose:** Get the currently logged-in user's notifications, newest first.
- **Auth:** JWT
- **Response `200`:**
```json
[
  { "id": 15, "userId": 10, "title": "Appointment reminder", "body": "...", "type": "reminder", "referenceType": "Appointment", "referenceId": "12", "isRead": false, "createdAt": "2026-08-26T07:00:00.000Z" }
]
```

### `GET /notifications/user`
- **Purpose:** Get the current user's notifications (alias of `GET /notifications`).
- **Auth:** JWT
- **Response `200`:**
```json
[
  { "id": 15, "userId": 10, "title": "Appointment reminder", "body": "...", "type": "reminder", "referenceType": "Appointment", "referenceId": "12", "isRead": false, "createdAt": "2026-08-26T07:00:00.000Z" }
]
```

### `GET /notifications/unread-count`
- **Purpose:** Get the count of unread notifications for the current user.
- **Auth:** JWT
- **Response `200`:**
```json
{ "count": 4 }
```

### `GET /notifications/preferences`
- **Purpose:** Get the current user's notification preferences (creates defaults on first access).
- **Auth:** JWT
- **Response `200`:**
```json
{ "id": 2, "userId": 10, "appointmentReminders": true, "promotionalOffers": true, "chatMessages": true, "prescriptionUpdates": true, "labResults": true, "vaccinationReminders": true, "systemUpdates": true, "weatherAlerts": true }
```

### `PUT /notifications/preferences`
- **Purpose:** Update the current user's notification preferences.
- **Auth:** JWT
- **Request:** `appointmentReminders (boolean)`, `promotionalOffers (boolean)`, `chatMessages (boolean)`, `prescriptionUpdates (boolean)`, `systemUpdates (boolean)`
- **Response `200`:**
```json
{ "id": 2, "userId": 10, "appointmentReminders": true, "promotionalOffers": false, "chatMessages": true, "prescriptionUpdates": true, "labResults": true, "vaccinationReminders": true, "systemUpdates": true, "weatherAlerts": true }
```

### `GET /notifications/:id`
- **Purpose:** Get a single notification by ID (owner only).
- **Auth:** JWT
- **Request:** `id (path param)`
- **Response `200`:**
```json
{ "id": 15, "userId": 10, "title": "Appointment reminder", "body": "...", "type": "reminder", "referenceType": "Appointment", "referenceId": "12", "isRead": false, "createdAt": "2026-08-26T07:00:00.000Z" }
```

### `PATCH /notifications/:id/read`
- **Purpose:** Mark a notification as read (owner only).
- **Auth:** JWT
- **Request:** `id (path param)`
- **Response `200`:**
```json
{ "id": 15, "userId": 10, "title": "Appointment reminder", "body": "...", "type": "reminder", "isRead": true, "createdAt": "2026-08-26T07:00:00.000Z" }
```

### `PATCH /notifications/read-all`
- **Purpose:** Mark all of the current user's notifications as read.
- **Auth:** JWT
- **Response `200`:**
```json
{ "success": true }
```

### `POST /notifications/push-token`
- **Purpose:** Register the current device's Expo push token.
- **Auth:** JWT
- **Request:** `token (string)`, `deviceId (string)`
- **Response `201`:**
```json
{ "success": true }
```

### `DELETE /notifications/push-token`
- **Purpose:** Unregister the current device's Expo push token.
- **Auth:** JWT
- **Request:** `token (string)`
- **Response `200`:**
```json
{ "success": true }
```

## 10. Animals, livestock & medical records

Farm-animal registry, marketplace listings and land records, plus the clinical-record subsystem (medical events, uploaded records, lab tests, vaccinations, consultations, prescriptions, AI diagnosis) that doctors attach to animals. Most write operations are owner-scoped; clinical writes require the `doctor` role.

### Animals

### `GET /animals`
- **Purpose:** List the current user's animals.
- **Auth:** JWT
- **Request:** `page (number)`, `limit (number)`, `breed (string)` — query params
- **Response `200`:**
```json
[
  { "id": 1, "userId": 12, "name": "Bella", "breed": "Holstein", "weight": "450kg", "age": "3 years", "color": "Brown & White", "image": "https://…/bella.jpg", "gender": "Female" }
]
```
With `page`/`limit` the shape is `{ "data": [ … ], "page": 1, "limit": 20, "total": 3 }`.

### `GET /animals/:id`
- **Purpose:** Get an animal by id.
- **Auth:** JWT
- **Request:** `id (path param)`
- **Response `200`:**
```json
{ "id": 1, "userId": 12, "name": "Bella", "breed": "Holstein", "weight": "450kg", "age": "3 years", "color": "Brown & White", "image": "https://…/bella.jpg", "description": "A gentle cow", "dob": "15/03/2023" }
```

### `POST /animals`
- **Purpose:** Add a new animal.
- **Auth:** JWT
- **Request:** `name (string)`, `breed (string)`, `weight (string)`, `age (string)`, `color (string)`, `image? (string)`
- **Response `201`:**
```json
{ "id": 2, "userId": 12, "name": "Nora", "breed": "Sahiwal", "weight": "380kg", "age": "2 years", "color": "Red", "image": null, "photos": [], "sellingPrice": "80000" }
```

### `POST /animals/upload-photo`
- **Purpose:** Upload an animal photo and get back its S3 URL.
- **Auth:** JWT
- **Request:** multipart/form-data — `file (binary)`
- **Response `201`:**
```json
{ "url": "https://…/animals/1758960000-cow.png" }
```

### `PATCH /animals/:id`
- **Purpose:** Update an owned animal.
- **Auth:** JWT
- **Request:** `id (path param)`, plus any subset of `name`, `breed`, `weight`, `age`, `color`, `image`, `photos`
- **Response `200`:**
```json
{ "id": 1, "userId": 12, "name": "Bella", "breed": "Holstein Friesian", "weight": "465kg", "age": "3 years", "color": "Brown & White", "image": "https://…/bella.jpg", "liveWeight": "420kg", "reproStatus": "Pregnant" }
```

### `DELETE /animals/:id`
- **Purpose:** Delete an owned animal.
- **Auth:** JWT
- **Request:** `id (path param)`
- **Response `200`:**
```json
{ "success": true }
```

### `GET /animals/:id/medical-events`
- **Purpose:** List structured clinical records for an animal (own animal for owners, or any patient the doctor has treated).
- **Auth:** JWT
- **Request:** `id (path param)`, `type? (enum: CONSULTATION|TREATMENT|VACCINATION|LAB_TEST)`, `page? (number)`, `limit? (number)` — query
- **Response `200`:**
```json
{
  "data": [
    { "id": 5, "patientId": 1, "appointmentId": 10, "doctorId": 3, "type": "CONSULTATION", "status": "ONGOING", "data": { "diagnosis": "Pyrexia" }, "createdAt": "2026-09-20T08:00:00.000Z" }
  ],
  "page": 1,
  "limit": 20,
  "total": 3
}
```

### `POST /animals/:id/medical-events`
- **Purpose:** Create a structured clinical record for an animal (doctor-only).
- **Auth:** JWT + Role(doctor)
- **Request:** `id (path param)`, `appointmentId (number)`, `type (enum)`, `data (object)`, `nextFollowUpAt? (ISO date string)`
- **Response `201`:**
```json
{
  "id": 5,
  "patientId": 1,
  "appointmentId": 10,
  "doctorId": 3,
  "type": "CONSULTATION",
  "status": "ONGOING",
  "data": { "assessment": ["High fever for 3 days"], "diagnosis": "Pyrexia" },
  "nextFollowUpAt": "2026-08-20T00:00:00.000Z",
  "createdAt": "2026-09-20T08:00:00.000Z",
  "updatedAt": "2026-09-20T08:00:00.000Z"
}
```

### Livestock

### `GET /livestock`
- **Purpose:** List active livestock with optional pagination.
- **Auth:** Public
- **Request:** `page? (number)`, `limit? (number)`, `species? (string)`, `breed? (string)` — query
- **Response `200`:**
```json
{
  "data": [
    { "id": 7, "sellerId": 12, "species": "cattle", "breed": "Holstein Friesian", "age": "18 Months", "weight": 450, "gender": "Female", "healthStatus": "Healthy", "price": 180000, "status": "published" }
  ],
  "page": 1,
  "limit": 50,
  "total": 24
}
```

### `GET /livestock/featured`
- **Purpose:** List top featured livestock listings.
- **Auth:** Public
- **Response `200`:**
```json
[
  { "id": 7, "sellerId": 12, "species": "cattle", "breed": "Holstein Friesian", "farmName": "Rahman Agro Farm", "location": "Dhaka, Savar", "price": 180000, "isFeatured": true, "isVerified": true, "status": "published" }
]
```

### `GET /livestock/search`
- **Purpose:** Search livestock listings.
- **Auth:** Public
- **Request:** `q (string)`, `species? (string)` — query
- **Response `200`:**
```json
[
  { "id": 7, "sellerId": 12, "species": "cattle", "breed": "Holstein Friesian", "age": "18 Months", "weight": 450, "gender": "Female", "healthStatus": "Healthy", "price": 180000, "isSold": false }
]
```

### `GET /livestock/my`
- **Purpose:** List current seller's own listings.
- **Auth:** JWT
- **Response `200`:**
```json
[
  { "id": 7, "sellerId": 12, "species": "cattle", "breed": "Holstein Friesian", "price": 180000, "isReserved": false, "isSold": false, "isFeatured": true, "isVerified": true, "status": "published" }
]
```

### `GET /livestock/:id`
- **Purpose:** Get details of a single livestock listing.
- **Auth:** Public
- **Request:** `id (path param)`
- **Response `200`:**
```json
{
  "id": 7,
  "sellerId": 12,
  "species": "cattle",
  "breed": "Holstein Friesian",
  "age": "18 Months",
  "weight": 450,
  "healthStatus": "Healthy",
  "farmName": "Rahman Agro Farm",
  "location": "Dhaka, Savar",
  "price": 180000
}
```

### `POST /livestock`
- **Purpose:** Create a new livestock listing.
- **Auth:** JWT
- **Request:** `species (string)`, `breed (string)`, `age (string)`, `weight (number)`, `healthStatus (string)`, `price (number)`
- **Response `201`:**
```json
{ "id": 8, "sellerId": 12, "species": "goat", "breed": "Boer", "age": "12 Months", "weight": 45, "gender": "Male", "healthStatus": "Healthy", "farmName": "Rahman Agro Farm", "price": 25000 }
```

### `PUT /livestock/:id`
- **Purpose:** Update an existing listing (Owner only).
- **Auth:** JWT
- **Request:** `id (path param)`, plus any subset of `species`, `breed`, `age`, `weight`, `healthStatus`, `farmName`, `location`, `price`
- **Response `200`:**
```json
{ "id": 7, "sellerId": 12, "species": "cattle", "breed": "Holstein Friesian", "age": "18 Months", "weight": 460, "healthStatus": "Healthy", "farmName": "Rahman Agro Farm", "location": "Dhaka, Savar", "price": 185000 }
```

### `DELETE /livestock/:id`
- **Purpose:** Delete listing (Owner only).
- **Auth:** JWT
- **Request:** `id (path param)`
- **Response `200`:** empty body (soft delete).

### `PATCH /livestock/:id/verify`
- **Purpose:** Verify/Unverify livestock listing (Admin only).
- **Auth:** JWT + Role(admin)
- **Request:** `id (path param)`, `isVerified (boolean)`
- **Response `200`:**
```json
{ "id": 7, "sellerId": 12, "species": "cattle", "breed": "Holstein Friesian", "healthStatus": "Healthy", "price": 180000, "isVerified": true, "isFeatured": false, "status": "published", "updatedAt": "2026-09-27T08:10:00.000Z" }
```

### `PATCH /livestock/:id/feature`
- **Purpose:** Set featured status (Admin only).
- **Auth:** JWT + Role(admin)
- **Request:** `id (path param)`, `isFeatured (boolean)`
- **Response `200`:**
```json
{ "id": 7, "sellerId": 12, "species": "cattle", "breed": "Holstein Friesian", "price": 180000, "isFeatured": true, "isVerified": true, "isReserved": false, "isSold": false, "status": "published" }
```

### `PATCH /livestock/:id/reserve`
- **Purpose:** Reserve/Release a livestock listing (Owner only).
- **Auth:** JWT
- **Request:** `id (path param)`, `isReserved (boolean)`
- **Response `200`:**
```json
{ "id": 7, "sellerId": 12, "species": "cattle", "breed": "Holstein Friesian", "price": 180000, "isReserved": true, "isSold": false, "isFeatured": true, "isVerified": true, "status": "published" }
```

### `PATCH /livestock/:id/sold`
- **Purpose:** Mark listing as sold (Owner only).
- **Auth:** JWT
- **Request:** `id (path param)`, `isSold (boolean)`
- **Response `200`:**
```json
{ "id": 7, "sellerId": 12, "species": "cattle", "breed": "Holstein Friesian", "price": 180000, "isReserved": false, "isSold": true, "isFeatured": true, "isVerified": true, "status": "published" }
```

### Fields

### `GET /fields`
- **Purpose:** List user's fields.
- **Auth:** JWT
- **Response `200`:**
```json
[
  { "id": 1, "userId": 12, "name": "North Farm", "sizeAcres": 5.5, "cropType": "Rice", "location": "Dhaka, Bangladesh", "createdAt": "2026-09-01T06:00:00.000Z" }
]
```

### `POST /fields`
- **Purpose:** Create a field.
- **Auth:** JWT
- **Request:** `name (string)`, `sizeAcres (number)`, `cropType? (string)`, `location? (string)`
- **Response `201`:**
```json
{ "id": 2, "userId": 12, "name": "South Paddy", "sizeAcres": 3.25, "cropType": "Rice", "location": "Dhaka, Savar", "createdAt": "2026-09-27T07:00:00.000Z" }
```

### `PUT /fields/:id`
- **Purpose:** Update a field (owner-only).
- **Auth:** JWT
- **Request:** `id (path param)`, plus any subset of `name`, `sizeAcres`, `cropType`, `location`
- **Response `200`:**
```json
{ "id": 1, "userId": 12, "name": "North Farm", "sizeAcres": 6, "cropType": "Wheat", "location": "Dhaka, Bangladesh", "createdAt": "2026-09-01T06:00:00.000Z" }
```

### `DELETE /fields/:id`
- **Purpose:** Delete a field (owner-only).
- **Auth:** JWT
- **Request:** `id (path param)`
- **Response `200`:**
```json
{ "success": true }
```

### Medical records

### `POST /medical-records/upload`
- **Purpose:** Upload a medical file (PDF/image/DICOM) for background processing.
- **Auth:** JWT
- **Request:** multipart/form-data — `file (binary)`, `patientId? (string)` — doctor-only, `appointmentId? (string)`
- **Response `201`:**
```json
{
  "id": 4,
  "patientId": 12,
  "appointmentId": 10,
  "uploadedByUserId": 15,
  "originalFileName": "xray-frontal.pdf",
  "mimeType": "application/pdf",
  "fileSizeBytes": 204800,
  "storageUrl": "https://…/medical-records/xray-frontal.pdf",
  "status": "UPLOADED",
  "createdAt": "2026-09-27T09:12:00.000Z"
}
```

### `GET /medical-records`
- **Purpose:** List medical records (own for patients, or `?patientId=` for doctors).
- **Auth:** JWT
- **Request:** `patientId? (number)` — query (required for non-patient roles)
- **Response `200`:**
```json
[
  { "id": 4, "patientId": 12, "appointmentId": 10, "uploadedByUserId": 15, "originalFileName": "xray-frontal.pdf", "mimeType": "application/pdf", "fileSizeBytes": 204800, "storageUrl": "https://…/xray-frontal.pdf", "status": "READY", "createdAt": "2026-09-27T09:12:00.000Z" }
]
```

### `GET /medical-records/:id`
- **Purpose:** Get a single attachment (ownership-checked).
- **Auth:** JWT
- **Request:** `id (path param)`
- **Response `200`:**
```json
{ "id": 4, "patientId": 12, "appointmentId": null, "uploadedByUserId": 12, "originalFileName": "bloodwork.png", "mimeType": "image/png", "fileSizeBytes": 912345, "storageUrl": "https://…/bloodwork.png", "status": "READY", "failureReason": null }
```

### Medical events

### `GET /medical-events/:id`
- **Purpose:** Get a single medical event by ID.
- **Auth:** JWT
- **Request:** `id (path param)`
- **Response `200`:**
```json
{ "id": 5, "patientId": 1, "appointmentId": 10, "doctorId": 3, "type": "VACCINATION", "status": "COMPLETED", "data": { "vaccine": "Rabies", "dose": "1ml", "route": "IM" }, "nextFollowUpAt": null, "createdAt": "2026-09-20T08:00:00.000Z", "updatedAt": "2026-09-20T08:05:00.000Z" }
```

### `PATCH /medical-events/:eventId`
- **Purpose:** Update a clinical record (doctor-only, own records).
- **Auth:** JWT + Role(doctor)
- **Request:** `eventId (path param)`, `status? (enum: ONGOING|COMPLETED)`, `data? (object)`
- **Response `200`:**
```json
{ "id": 5, "patientId": 1, "appointmentId": 10, "doctorId": 3, "type": "CONSULTATION", "status": "COMPLETED", "data": { "diagnosis": "Pyrexia", "treatment": "Meloxicam 15 mg IM" }, "nextFollowUpAt": "2026-08-20T00:00:00.000Z", "createdAt": "2026-09-20T08:00:00.000Z", "updatedAt": "2026-09-27T10:00:00.000Z" }
```

### `DELETE /medical-events/:id`
- **Purpose:** Delete a medical event (doctor-only, own records).
- **Auth:** JWT + Role(doctor)
- **Request:** `id (path param)`
- **Response `200`:**
```json
{ "success": true }
```

### Lab tests

### `GET /lab-tests/animal/:animalId`
- **Purpose:** Get animal's lab tests.
- **Auth:** JWT
- **Request:** `animalId (path param)`
- **Response `200`:**
```json
[
  { "id": 6, "patientId": 1, "appointmentId": 10, "doctorId": 3, "type": "LAB_TEST", "status": "COMPLETED", "data": { "testName": "CBC", "results": "Normal range" }, "nextFollowUpAt": null, "createdAt": "2026-09-21T11:00:00.000Z", "updatedAt": "2026-09-21T11:00:00.000Z" }
]
```

### `POST /lab-tests`
- **Purpose:** Create a lab test record.
- **Auth:** JWT + Role(doctor)
- **Request:** `appointmentId (number)`, `animalId (number)`, `data (object)`
- **Response `201`:**
```json
{ "id": 6, "patientId": 1, "appointmentId": 10, "doctorId": 3, "type": "LAB_TEST", "status": "ONGOING", "data": { "testName": "CBC", "results": "Normal range", "notes": "" }, "nextFollowUpAt": null, "createdAt": "2026-09-21T11:00:00.000Z", "updatedAt": "2026-09-21T11:00:00.000Z" }
```

### `PUT /lab-tests/:id`
- **Purpose:** Update a lab test record.
- **Auth:** JWT + Role(doctor)
- **Request:** `id (path param)`, `status? (enum: ONGOING|COMPLETED)`, `data? (object)`
- **Response `200`:**
```json
{ "id": 6, "patientId": 1, "appointmentId": 10, "doctorId": 3, "type": "LAB_TEST", "status": "COMPLETED", "data": { "testName": "CBC", "results": "Normal range" }, "nextFollowUpAt": null, "createdAt": "2026-09-21T11:00:00.000Z", "updatedAt": "2026-09-22T09:00:00.000Z" }
```

### Vaccinations

### `GET /vaccinations/animal/:animalId`
- **Purpose:** Get animal's vaccination records.
- **Auth:** JWT
- **Request:** `animalId (path param)`
- **Response `200`:**
```json
[
  { "id": 7, "patientId": 1, "appointmentId": 11, "doctorId": 3, "type": "VACCINATION", "status": "COMPLETED", "data": { "vaccine": "FMD", "dose": "2ml", "route": "SC" }, "nextFollowUpAt": "2027-01-15T00:00:00.000Z", "createdAt": "2026-09-22T10:00:00.000Z", "updatedAt": "2026-09-22T10:00:00.000Z" }
]
```

### `POST /vaccinations`
- **Purpose:** Create a vaccination record.
- **Auth:** JWT + Role(doctor)
- **Request:** `appointmentId (number)`, `animalId (number)`, `data (object)`
- **Response `201`:**
```json
{ "id": 7, "patientId": 1, "appointmentId": 11, "doctorId": 3, "type": "VACCINATION", "status": "ONGOING", "data": { "vaccine": "Rabies", "dose": "1ml", "route": "IM" }, "nextFollowUpAt": "2027-03-01T00:00:00.000Z", "createdAt": "2026-09-22T10:00:00.000Z", "updatedAt": "2026-09-22T10:00:00.000Z" }
```

### `PUT /vaccinations/:id`
- **Purpose:** Update a vaccination record.
- **Auth:** JWT + Role(doctor)
- **Request:** `id (path param)`, `status? (enum: ONGOING|COMPLETED)`, `data? (object)`
- **Response `200`:**
```json
{ "id": 7, "patientId": 1, "appointmentId": 11, "doctorId": 3, "type": "VACCINATION", "status": "COMPLETED", "data": { "vaccine": "Rabies", "dose": "1ml", "route": "IM" }, "nextFollowUpAt": "2027-03-01T00:00:00.000Z", "createdAt": "2026-09-22T10:00:00.000Z", "updatedAt": "2026-09-23T08:00:00.000Z" }
```

### `DELETE /vaccinations/:id`
- **Purpose:** Delete a vaccination record.
- **Auth:** JWT + Role(doctor)
- **Request:** `id (path param)`
- **Response `200`:**
```json
{ "success": true }
```

### Consultations

### `GET /consultations/animal/:animalId`
- **Purpose:** Get animal's consultation records.
- **Auth:** JWT
- **Request:** `animalId (path param)`
- **Response `200`:**
```json
[
  { "id": 5, "patientId": 1, "appointmentId": 10, "doctorId": 3, "type": "CONSULTATION", "status": "ONGOING", "data": { "assessment": ["Off feed for 2 days"] }, "nextFollowUpAt": null, "createdAt": "2026-09-20T08:00:00.000Z", "updatedAt": "2026-09-20T08:00:00.000Z" }
]
```

### `GET /consultations/:id`
- **Purpose:** Get a single consultation record.
- **Auth:** JWT
- **Request:** `id (path param)`
- **Response `200`:**
```json
{ "id": 5, "patientId": 1, "appointmentId": 10, "doctorId": 3, "type": "CONSULTATION", "status": "ONGOING", "data": { "assessment": ["Off feed for 2 days"], "diagnosis": "Indigestion" }, "nextFollowUpAt": null, "createdAt": "2026-09-20T08:00:00.000Z", "updatedAt": "2026-09-20T08:00:00.000Z" }
```

### `PUT /consultations/:id`
- **Purpose:** Update a consultation record.
- **Auth:** JWT + Role(doctor)
- **Request:** `id (path param)`, `status? (enum: ONGOING|COMPLETED)`, `data? (object)`
- **Response `200`:**
```json
{ "id": 5, "patientId": 1, "appointmentId": 10, "doctorId": 3, "type": "CONSULTATION", "status": "ONGOING", "data": { "diagnosis": "Indigestion", "treatment": "Oral rehydration" }, "nextFollowUpAt": null, "createdAt": "2026-09-20T08:00:00.000Z", "updatedAt": "2026-09-27T12:00:00.000Z" }
```

### `POST /consultations/:id/end`
- **Purpose:** End a consultation (mark as completed).
- **Auth:** JWT + Role(doctor)
- **Request:** `id (path param)`
- **Response `201`:**
```json
{ "id": 5, "patientId": 1, "appointmentId": 10, "doctorId": 3, "type": "CONSULTATION", "status": "COMPLETED", "data": { "diagnosis": "Indigestion" }, "nextFollowUpAt": null, "createdAt": "2026-09-20T08:00:00.000Z", "updatedAt": "2026-09-27T12:30:00.000Z" }
```

### Prescriptions

### `POST /prescriptions`
- **Purpose:** Create a prescription.
- **Auth:** JWT + Role(doctor)
- **Request:** `appointmentId (number)`, `animalId (number)`, `medicines (array of {name, dosage?, quantity?, frequency?, duration?, instructions?, notes?})`
- **Response `201`:**
```json
{
  "id": 3,
  "appointmentId": 10,
  "doctorId": 3,
  "animalId": 1,
  "ownerId": 12,
  "medicines": [ { "name": "Amoxicillin", "dosage": "500mg twice daily", "quantity": "14 tablets", "frequency": "Twice daily", "duration": "7 days" } ],
  "attachmentUrl": null,
  "sentAt": null,
  "createdAt": "2026-09-27T09:00:00.000Z",
  "updatedAt": "2026-09-27T09:00:00.000Z"
}
```

### `GET /prescriptions/:appointmentId`
- **Purpose:** Get prescription by appointment ID.
- **Auth:** JWT
- **Request:** `appointmentId (path param)`
- **Response `200`:**
```json
{ "id": 3, "appointmentId": 10, "doctorId": 3, "animalId": 1, "ownerId": 12, "medicines": [ { "name": "Amoxicillin", "dosage": "500mg twice daily" } ], "attachmentUrl": null, "sentAt": null, "createdAt": "2026-09-27T09:00:00.000Z", "updatedAt": "2026-09-27T09:00:00.000Z" }
```
Returns `null` when the appointment has no prescription.

### `GET /prescriptions/by-appointment/:appointmentId`
- **Purpose:** Get prescription by appointment ID.
- **Auth:** JWT
- **Request:** `appointmentId (path param)`
- **Response `200`:**
```json
{ "id": 3, "appointmentId": 10, "doctorId": 3, "animalId": 1, "ownerId": 12, "medicines": [ { "name": "Amoxicillin", "dosage": "500mg twice daily" } ], "attachmentUrl": "https://…/prescriptions/rx.pdf", "sentAt": "2026-09-27T09:30:00.000Z", "createdAt": "2026-09-27T09:00:00.000Z", "updatedAt": "2026-09-27T09:30:00.000Z" }
```

### `GET /prescriptions/by-animal/:animalId`
- **Purpose:** Get animal's prescription history.
- **Auth:** JWT
- **Request:** `animalId (path param)`
- **Response `200`:**
```json
[
  { "id": 3, "appointmentId": 10, "doctorId": 3, "animalId": 1, "ownerId": 12, "medicines": [ { "name": "Amoxicillin", "duration": "7 days" } ], "attachmentUrl": null, "sentAt": null, "createdAt": "2026-09-27T09:00:00.000Z", "updatedAt": "2026-09-27T09:00:00.000Z" }
]
```

### `GET /prescriptions/animal/:animalId`
- **Purpose:** Get animal's prescription history.
- **Auth:** JWT
- **Request:** `animalId (path param)`
- **Response `200`:**
```json
[
  { "id": 2, "appointmentId": 6, "doctorId": 3, "animalId": 1, "ownerId": 12, "medicines": [ { "name": "Ivermectin", "dosage": "1ml per 50kg" } ], "attachmentUrl": null, "sentAt": "2026-08-14T10:00:00.000Z", "createdAt": "2026-08-14T09:00:00.000Z", "updatedAt": "2026-08-14T10:00:00.000Z" }
]
```

### `PUT /prescriptions/:id`
- **Purpose:** Update a prescription.
- **Auth:** JWT + Role(doctor)
- **Request:** `id (path param)`, `medicines? (array of {name, dosage?, quantity?, frequency?, duration?})`
- **Response `200`:**
```json
{ "id": 3, "appointmentId": 10, "doctorId": 3, "animalId": 1, "ownerId": 12, "medicines": [ { "name": "Amoxicillin", "dosage": "500mg three times daily", "duration": "5 days" } ], "attachmentUrl": null, "sentAt": null, "createdAt": "2026-09-27T09:00:00.000Z", "updatedAt": "2026-09-27T09:45:00.000Z" }
```

### `POST /prescriptions/:id/attachment`
- **Purpose:** Upload attachment for prescription.
- **Auth:** JWT + Role(doctor)
- **Request:** `id (path param)`, multipart/form-data — `file (binary)`
- **Response `201`:**
```json
{ "id": 3, "appointmentId": 10, "doctorId": 3, "animalId": 1, "ownerId": 12, "medicines": [ { "name": "Amoxicillin" } ], "attachmentUrl": "https://…/prescriptions/rx-scan.pdf", "sentAt": null, "createdAt": "2026-09-27T09:00:00.000Z", "updatedAt": "2026-09-27T10:00:00.000Z" }
```

### `POST /prescriptions/:id/send`
- **Purpose:** Send prescription to owner.
- **Auth:** JWT + Role(doctor)
- **Request:** `id (path param)`
- **Response `201`:**
```json
{ "id": 3, "appointmentId": 10, "doctorId": 3, "animalId": 1, "ownerId": 12, "medicines": [ { "name": "Amoxicillin" } ], "attachmentUrl": "https://…/prescriptions/rx-scan.pdf", "sentAt": "2026-09-27T10:05:00.000Z", "createdAt": "2026-09-27T09:00:00.000Z", "updatedAt": "2026-09-27T10:05:00.000Z" }
```

### AI diagnosis

### `POST /ai-diagnosis/upload-image`
- **Purpose:** Upload a photo for AI diagnosis and get back its URL.
- **Auth:** JWT
- **Request:** multipart/form-data — `file (binary)`
- **Response `201`:**
```json
{ "url": "https://…/ai-diagnosis/1758960000-skin.png" }
```

### `POST /ai-diagnosis/analyze`
- **Purpose:** Submit symptoms and photos for AI diagnosis (processed asynchronously).
- **Auth:** JWT
- **Request:** `symptoms (string[])`, `images? (string[])`
- **Response `201`:**
```json
{
  "id": 4,
  "userId": 12,
  "images": [ "https://…/ai-diagnosis/skin.png" ],
  "symptoms": [ "fever", "loss of appetite", "skin lesions" ],
  "status": "PENDING",
  "failureReason": null,
  "analysisResult": null,
  "confidenceScore": null,
  "recommendations": [],
  "recommendedDoctorIds": []
}
```

### `GET /ai-diagnosis/history`
- **Purpose:** Get current user's diagnostic check logs history.
- **Auth:** JWT
- **Response `200`:**
```json
[
  { "id": 4, "userId": 12, "images": [ "https://…/skin.png" ], "symptoms": [ "fever" ], "status": "READY", "analysisResult": "Possible dermatophilosis…", "confidenceScore": 0.82, "recommendations": [ "Isolate the animal", "Consult a veterinarian" ], "recommendedDoctorIds": [ 3 ], "prescriptionId": null, "createdAt": "2026-09-27T09:20:00.000Z" }
]
```

### `GET /ai-diagnosis/:id`
- **Purpose:** Poll a diagnosis by id for status/result.
- **Auth:** JWT
- **Request:** `id (path param)`
- **Response `200`:**
```json
{ "id": 4, "userId": 12, "images": [ "https://…/skin.png" ], "symptoms": [ "fever", "skin lesions" ], "status": "PENDING", "failureReason": null, "analysisResult": null, "confidenceScore": null, "recommendations": [], "recommendedDoctorIds": [], "createdAt": "2026-09-27T09:20:00.000Z" }
```

### Chat

### `GET /chat/conversations`
- **Purpose:** List the current user's conversations.
- **Auth:** JWT
- **Response `200`:**
```json
[
  { "id": 7, "doctorId": 3, "doctorUserId": 15, "patientId": 12, "appointmentId": 10, "lastMessageAt": "2026-09-27T10:32:11.000Z", "lastMessageText": "Thanks, doctor", "unreadCount": 2, "createdAt": "2026-09-25T09:00:00.000Z" }
]
```

### `POST /chat/conversations`
- **Purpose:** Create or find a conversation with a patient.
- **Auth:** JWT + Role(doctor)
- **Request:** `patientId (number)`
- **Response `201`:**
```json
{ "id": 7, "doctorId": 3, "doctorUserId": 15, "patientId": 12, "appointmentId": null, "lastMessageAt": null, "lastMessageText": null, "unreadCount": 0, "createdAt": "2026-09-27T10:00:00.000Z" }
```

### `GET /chat/messages`
- **Purpose:** List messages in a conversation.
- **Auth:** JWT
- **Request:** `conversationId? (number)` — query; auto-resolved for patients when omitted
- **Response `200`:**
```json
[
  { "id": 42, "conversationId": 7, "sender": "doctor", "text": "Hello, how is Bella doing?", "time": "10:32", "createdAt": "2026-09-27T10:32:11.000Z", "status": "READ", "attachmentUrl": null, "attachmentType": null, "attachmentMimeType": null }
]
```

### `POST /chat/message`
- **Purpose:** Send a chat message.
- **Auth:** JWT
- **Request:** `text (string)`, `conversationId? (number)`
- **Response `201`:**
```json
{ "id": 43, "conversationId": 7, "sender": "user", "text": "She is eating again", "time": "10:40", "createdAt": "2026-09-27T10:40:02.000Z", "status": "SENT", "attachmentUrl": null, "attachmentType": null, "attachmentMimeType": null }
```

### `POST /chat/message/attachment`
- **Purpose:** Send a chat message with an image/document attachment.
- **Auth:** JWT
- **Request:** multipart/form-data — `file (binary)`, `conversationId? (number)`, `caption? (string)`
- **Response `201`:**
```json
{ "id": 44, "conversationId": 7, "sender": "doctor", "text": "See the attached lab report", "time": "10:45", "createdAt": "2026-09-27T10:45:30.000Z", "status": "SENT", "attachmentUrl": "https://…/gobadi/chat/report.pdf", "attachmentType": "document", "attachmentMimeType": "application/pdf" }
```

### `PATCH /chat/messages/:id/read`
- **Purpose:** Mark a message as read.
- **Auth:** JWT
- **Request:** `id (path param)`
- **Response `200`:**
```json
{ "id": 42, "conversationId": 7, "senderId": 15, "senderRole": "doctor", "text": "Hello, how is Bella doing?", "createdAt": "2026-09-27T10:32:11.000Z", "status": "READ", "deliveredAt": "2026-09-27T10:32:12.000Z", "readAt": "2026-09-27T10:33:00.000Z", "attachmentUrl": null }
```

### `GET /chat/appointments`
- **Purpose:** List the current doctor's appointments available for chat.
- **Auth:** JWT + Role(doctor)
- **Request:** `page? (number)`, `limit? (number)` — query
- **Response `200`:**
```json
{
  "data": [
    { "id": 10, "doctorId": 3, "clinicId": null, "serviceId": null, "patientId": 12, "animalId": 1, "startAt": "2026-09-27T10:00:00.000Z", "endAt": "2026-09-27T10:30:00.000Z", "durationMinutes": 30, "status": "CONFIRMED" }
  ],
  "page": 1,
  "limit": 20,
  "total": 5
}
```

### Video call

### `POST /video-call/create`
- **Purpose:** Create a video call session (farmer or doctor).
- **Auth:** JWT
- **Request:** `appointmentId (number)`
- **Response `201`:**
```json
{ "sessionId": 3, "channelName": "appointment-10", "doctorUserId": 15, "patientId": 12 }
```

### `GET /video-call/join/:appointmentId`
- **Purpose:** Join a video call session.
- **Auth:** JWT
- **Request:** `appointmentId (path param)`
- **Response `200`:**
```json
{ "token": "007eJxTY…", "channelName": "appointment-10", "appId": "a1b2c3d4…" }
```

### `POST /video-call/end/:appointmentId`
- **Purpose:** End a video call session.
- **Auth:** JWT
- **Request:** `appointmentId (path param)`
- **Response `201`:**
```json
{ "success": true }
```

### `GET /video-call/token/:appointmentId`
- **Purpose:** Get fresh Agora token for reconnection.
- **Auth:** JWT
- **Request:** `appointmentId (path param)`
- **Response `200`:**
```json
{ "token": "007eJxTY…", "channelName": "appointment-10", "appId": "a1b2c3d4…" }
```

### Reviews

### `POST /reviews`
- **Purpose:** Submit a new review (Validates purchase/booking verified flags).
- **Auth:** JWT
- **Request:** `targetType (enum: product|livestock|doctor|clinic|service)`, `targetId (string)`, `rating (number 1-5)`, `text (string)`, `images? (string[])`
- **Response `201`:**
```json
{
  "id": 9,
  "userId": 12,
  "targetType": "doctor",
  "targetId": "3",
  "rating": 5,
  "text": "Great consultation, very attentive",
  "images": [],
  "videos": [],
  "reply": null,
  "helpfulCount": 0
}
```

### `GET /reviews/:targetType/:targetId`
- **Purpose:** List approved reviews for a specific target.
- **Auth:** Public
- **Request:** `targetType (enum: product|livestock|doctor|clinic|service)`, `targetId (path param)`
- **Response `200`:**
```json
[
  { "id": 9, "userId": 12, "targetType": "doctor", "targetId": "3", "rating": 5, "text": "Great consultation", "images": [], "videos": [], "reply": "Thank you!", "helpfulCount": 4 }
]
```

### `POST /reviews/:id/helpful`
- **Purpose:** Upvote a review helpfulness count.
- **Auth:** Public
- **Request:** `id (path param)`
- **Response `201`:**
```json
{ "id": 9, "userId": 12, "targetType": "doctor", "targetId": "3", "rating": 5, "text": "Great consultation", "images": [], "videos": [], "reply": null, "helpfulCount": 5 }
```

### `POST /reviews/:id/report`
- **Purpose:** Report a review as spam or inappropriate.
- **Auth:** Public
- **Request:** `id (path param)`
- **Response `201`:**
```json
{ "id": 9, "userId": 12, "targetType": "product", "targetId": "21", "rating": 1, "text": "Spam text", "images": [], "videos": [], "reply": null, "isReported": true }
```

### `GET /reviews/reported`
- **Purpose:** List all flagged/reported reviews (Admin only).
- **Auth:** JWT + Role(admin)
- **Response `200`:**
```json
[
  { "id": 9, "userId": 12, "targetType": "product", "targetId": "21", "rating": 1, "text": "Spam text", "images": [], "videos": [], "reply": null, "isReported": true }
]
```

### `PATCH /reviews/:id/moderate`
- **Purpose:** Approve or Reject a review from publication (Admin only).
- **Auth:** JWT + Role(admin)
- **Request:** `id (path param)`, `isApproved (boolean)`
- **Response `200`:**
```json
{ "id": 9, "userId": 12, "targetType": "product", "targetId": "21", "rating": 1, "text": "Spam text", "images": [], "videos": [], "reply": null, "isReported": false, "isApproved": false }
```

### `POST /reviews/:id/reply`
- **Purpose:** Submit a reply response to a review.
- **Auth:** JWT + Role(doctor, admin)
- **Request:** `id (path param)`, `replyText (string)`
- **Response `201`:**
```json
{ "id": 9, "userId": 12, "targetType": "doctor", "targetId": "3", "rating": 5, "text": "Great consultation", "images": [], "videos": [], "reply": "Thank you for your feedback!", "helpfulCount": 4 }
```

## 11. Commerce, payments & wallet

Storefront catalog, cart/checkout, delivery tracking, payment gateways, saved payment methods, wallet ledger, doctor/patient discounts, subscriptions and public market/weather/search data. Successful responses are returned raw; only admin routes (and doctor discount screens) require elevated roles.

### Products

### `GET /products`
- **Purpose:** List product catalog with optional pagination.
- **Auth:** Public
- **Request:** `page (number, optional)`, `limit (number, optional)`, `categoryId (number, optional)`, `brandId (number, optional)`
- **Response `200`:**
```json
[
  {
    "id": 1,
    "sku": "PRD-102-FEED",
    "name": "Organic Cattle Feed 25kg",
    "description": "...",
    "price": 1250,
    "discount": 50,
    "categoryId": 2,
    "brandId": 1,
    "status": "published",
    "visibility": true
  }
]
```

### `GET /products/:id`
- **Purpose:** Get product details by ID.
- **Auth:** Public
- **Request:** `id (path param, number)`
- **Response `200`:**
```json
{
  "id": 1,
  "sku": "PRD-102-FEED",
  "name": "Organic Cattle Feed 25kg",
  "description": "...",
  "price": 1250,
  "discount": 50,
  "images": ["feed_thumb.png"],
  "status": "published",
  "isPrescriptionRequired": false,
  "category": { "id": 2, "name": "Cattle Feed", "slug": "cattle-feed" }
}
```

### `POST /products`
- **Purpose:** Create a new product (Admin only).
- **Auth:** JWT + Role(ADMIN)
- **Request:** `sku (string)`, `name (string)`, `description (string)`, `price (number)`, `categoryId (number, optional)`, `status (enum: draft|published|archived, optional)`
- **Response `201`:**
```json
{
  "id": 5,
  "sku": "PRD-118-MINERAL",
  "name": "Mineral Salt Block",
  "price": 320,
  "discount": 0,
  "categoryId": 4,
  "status": "draft",
  "visibility": true,
  "createdAt": "2026-09-27T10:15:30.000Z"
}
```

### `PUT /products/:id`
- **Purpose:** Update a product (Admin only).
- **Auth:** JWT + Role(ADMIN)
- **Request:** `id (path param, number)`, `name? (string)`, `price? (number)`, `discount? (number)`, `status? (enum)`, `visibility? (boolean)`
- **Response `200`:**
```json
{
  "id": 1,
  "sku": "PRD-102-FEED",
  "name": "Organic Cattle Feed 25kg",
  "price": 1300,
  "discount": 100,
  "status": "published",
  "visibility": true,
  "updatedAt": "2026-09-27T11:00:00.000Z"
}
```

### `DELETE /products/:id`
- **Purpose:** Soft-delete a product (Admin only, no response body is returned).
- **Auth:** JWT + Role(ADMIN)
- **Request:** `id (path param, number)`
- **Response `200`:**
```json
{}
```

### `GET /products/search`
- **Purpose:** Search active products.
- **Auth:** Public
- **Request:** `q (string)`, `categoryId (number, optional)`
- **Response `200`:**
```json
[
  {
    "id": 1,
    "sku": "PRD-102-FEED",
    "name": "Organic Cattle Feed 25kg",
    "price": 1250,
    "discount": 50,
    "status": "published",
    "visibility": true,
    "category": { "id": 2, "name": "Cattle Feed" }
  }
]
```

### `GET /products/categories`
- **Purpose:** List all product categories.
- **Auth:** Public
- **Response `200`:**
```json
[
  { "id": 2, "name": "Cattle Feed", "slug": "cattle-feed", "description": "..." }
]
```

### `POST /products/categories`
- **Purpose:** Create a product category (Admin only).
- **Auth:** JWT + Role(ADMIN)
- **Request:** `name (string)`, `slug (string)`, `description (string, optional)`
- **Response `201`:**
```json
{ "id": 6, "name": "Veterinary Medicine", "slug": "veterinary-medicine", "description": "..." }
```

### `GET /products/brands`
- **Purpose:** List all product brands.
- **Auth:** Public
- **Response `200`:**
```json
[
  { "id": 1, "name": "ACI Agribusiness", "slug": "aci-agribusiness", "description": "..." }
]
```

### `POST /products/brands`
- **Purpose:** Create a product brand (Admin only).
- **Auth:** JWT + Role(ADMIN)
- **Request:** `name (string)`, `slug (string)`, `description (string, optional)`
- **Response `201`:**
```json
{ "id": 4, "name": "Cargill", "slug": "cargill", "description": "..." }
```

### `GET /products/:id/stock`
- **Purpose:** Get current stock level for a product.
- **Auth:** Public
- **Request:** `id (path param, number)`
- **Response `200`:**
```json
{ "productId": 1, "stock": 48 }
```

### `POST /products/:id/stock`
- **Purpose:** Add inventory stock for a product (Admin only).
- **Auth:** JWT + Role(ADMIN)
- **Request:** `id (path param, number)`, `quantity (number)`, `batchNumber (string, optional)`, `expiryDate (string, optional)`
- **Response `201`:**
```json
{ "success": true }
```

### Cart

### `GET /cart`
- **Purpose:** Get current user's cart summary with price and stock checks.
- **Auth:** JWT
- **Response `200`:**
```json
{
  "items": [
    {
      "id": 3,
      "productId": 1,
      "name": "Organic Cattle Feed 25kg",
      "image": "feed_thumb.png",
      "unitPrice": 1250,
      "discountPrice": 1200,
      "quantity": 2,
      "rowTotal": 2400,
      "isAvailable": true
    }
  ],
  "subtotal": 2400,
  "tax": 120,
  "shipping": 100,
  "total": 2620
}
```

### `POST /cart/add`
- **Purpose:** Add a product or livestock item to cart.
- **Auth:** JWT
- **Request:** `productId (number, optional)`, `livestockId (number, optional)`, `quantity (number, optional)`
- **Response `201`:**
```json
{ "id": 3, "userId": 12, "productId": 1, "livestockId": null, "quantity": 2, "createdAt": "2026-09-27T10:15:30.000Z" }
```

### `PUT /cart/item/:id`
- **Purpose:** Update cart item quantity.
- **Auth:** JWT
- **Request:** `id (path param, number)`, `quantity (number, min 1)`
- **Response `200`:**
```json
{ "id": 3, "userId": 12, "productId": 1, "livestockId": null, "quantity": 4, "createdAt": "2026-09-27T10:15:30.000Z" }
```

### `DELETE /cart/item/:id`
- **Purpose:** Remove item from cart (no response body is returned).
- **Auth:** JWT
- **Request:** `id (path param, number)`
- **Response `200`:**
```json
{}
```

### `DELETE /cart`
- **Purpose:** Clear all items from user cart (no response body is returned).
- **Auth:** JWT
- **Response `200`:**
```json
{}
```

### Wishlist

### `GET /wishlist`
- **Purpose:** Get current user's wishlist.
- **Auth:** JWT
- **Response `200`:**
```json
[
  {
    "id": 5,
    "userId": 12,
    "productId": 1,
    "livestockId": null,
    "createdAt": "2026-09-27T09:30:00.000Z",
    "product": { "id": 1, "name": "Organic Cattle Feed 25kg", "price": 1250 }
  }
]
```

### `POST /wishlist`
- **Purpose:** Add a product or livestock item to wishlist.
- **Auth:** JWT
- **Request:** `productId (number, optional)`, `livestockId (number, optional)`
- **Response `201`:**
```json
{ "id": 6, "userId": 12, "productId": 3, "livestockId": null, "createdAt": "2026-09-27T10:20:00.000Z" }
```

### `DELETE /wishlist/:id`
- **Purpose:** Remove item from wishlist (no response body is returned).
- **Auth:** JWT
- **Request:** `id (path param, number)`
- **Response `200`:**
```json
{}
```

### Orders

### `POST /orders`
- **Purpose:** Place a new product/livestock order from the shopping cart.
- **Auth:** JWT
- **Request:** `addressId (number)`, `deliveryMethod (string)`, `deliveryNotes (string, optional)`
- **Response `201`:**
```json
{
  "id": "GBD-123456",
  "userId": 12,
  "totalPrice": 2400,
  "tax": 120,
  "shippingFee": 100,
  "discountAmount": 0,
  "netAmount": 2620,
  "deliveryMethod": "standard",
  "status": "pending",
  "paymentStatus": "pending"
}
```

### `GET /orders/my`
- **Purpose:** Get currently logged-in user's orders list.
- **Auth:** JWT
- **Response `200`:**
```json
[
  {
    "id": "GBD-123456",
    "userId": 12,
    "totalPrice": 2400,
    "netAmount": 2620,
    "status": "shipped",
    "paymentStatus": "successful",
    "trackingNumber": "GBD-TRK-12345678",
    "createdAt": "2026-09-26T08:00:00.000Z",
    "items": [{ "id": 1, "productId": 1, "quantity": 2, "price": 1250, "discount": 50, "name": "Organic Cattle Feed 25kg" }]
  }
]
```

### `GET /orders/admin`
- **Purpose:** List all orders (Admin only).
- **Auth:** JWT + Role(ADMIN)
- **Request:** `page (number, optional)`, `limit (number, optional)`, `status (enum, optional)`
- **Response `200`:**
```json
{
  "data": [
    {
      "id": "GBD-123456",
      "userId": 12,
      "totalPrice": 2400,
      "netAmount": 2620,
      "status": "pending",
      "paymentStatus": "pending",
      "deliveryMethod": "standard",
      "createdAt": "2026-09-26T08:00:00.000Z",
      "items": [{ "id": 1, "productId": 1, "quantity": 2, "price": 1250, "name": "Organic Cattle Feed 25kg" }]
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 57
}
```

### `GET /orders/:id`
- **Purpose:** Get single order details by ID.
- **Auth:** JWT
- **Request:** `id (path param, e.g. GBD-123456)`
- **Response `200`:**
```json
{
  "id": "GBD-123456",
  "userId": 12,
  "totalPrice": 2400,
  "tax": 120,
  "shippingFee": 100,
  "netAmount": 2620,
  "deliveryAddress": { "label": "Home", "phone": "+8801712345678", "district": "Dhaka" },
  "status": "confirmed",
  "paymentStatus": "successful",
  "items": [{ "id": 1, "productId": 1, "quantity": 2, "price": 1250, "name": "Organic Cattle Feed 25kg" }]
}
```

### `PATCH /orders/:id/status`
- **Purpose:** Update order status (Admin only).
- **Auth:** JWT + Role(ADMIN)
- **Request:** `id (path param, e.g. GBD-123456)`, `status (enum: pending|confirmed|preparing|packed|shipped|delivered|completed|cancelled|refunded|returned|failed)`
- **Response `200`:**
```json
{
  "id": "GBD-123456",
  "userId": 12,
  "totalPrice": 2400,
  "netAmount": 2620,
  "status": "shipped",
  "paymentStatus": "successful",
  "trackingNumber": "GBD-TRK-12345678",
  "updatedAt": "2026-09-27T09:00:00.000Z",
  "items": [{ "id": 1, "quantity": 2, "price": 1250, "name": "Organic Cattle Feed 25kg" }]
}
```

### Delivery

### `GET /delivery/track/:trackingNumber`
- **Purpose:** Public tracking of shipment via tracking number.
- **Auth:** Public
- **Request:** `trackingNumber (path param, e.g. GBD-TRK-12345678)`
- **Response `200`:**
```json
{
  "id": 1,
  "orderId": "GBD-123456",
  "trackingNumber": "GBD-TRK-12345678",
  "courierName": "Steadfast",
  "status": "in_transit",
  "timeline": [
    { "status": "pending", "timestamp": "2026-09-26T09:00:00.000Z", "description": "Shipment info received by courier" }
  ],
  "deliveryProofUrl": null,
  "deliveryNotes": null
}
```

### `GET /delivery/order/:orderId`
- **Purpose:** Get shipment tracking details for an order (Authenticated).
- **Auth:** JWT
- **Request:** `orderId (path param, e.g. GBD-123456)`
- **Response `200`:**
```json
{
  "id": 1,
  "orderId": "GBD-123456",
  "trackingNumber": "GBD-TRK-12345678",
  "courierName": "Steadfast",
  "status": "out_for_delivery",
  "timeline": [
    { "status": "in_transit", "timestamp": "2026-09-27T04:30:00.000Z", "location": "Dhaka Hub", "description": "Shipment left facility" }
  ],
  "deliveryProofUrl": null,
  "order": { "id": "GBD-123456", "status": "shipped" }
}
```

### `POST /delivery/order/:orderId`
- **Purpose:** Create shipment/courier assignment (Admin only).
- **Auth:** JWT + Role(ADMIN)
- **Request:** `orderId (path param, e.g. GBD-123456)`, `courierName (string)`
- **Response `201`:**
```json
{
  "id": 1,
  "orderId": "GBD-123456",
  "trackingNumber": "GBD-TRK-12345678",
  "courierName": "Steadfast",
  "status": "pending",
  "timeline": [
    { "status": "pending", "timestamp": "2026-09-27T08:00:00.000Z", "description": "Shipment info received by courier" }
  ],
  "createdAt": "2026-09-27T08:00:00.000Z"
}
```

### `PUT /delivery/order/:orderId`
- **Purpose:** Update shipment status and timeline event (Admin only).
- **Auth:** JWT + Role(ADMIN)
- **Request:** `orderId (path param, e.g. GBD-123456)`, `status (enum: pending|picked_up|in_transit|out_for_delivery|delivered|failed|returned)`, `location? (string)`, `description? (string)`, `deliveryProofUrl? (string)`, `deliveryNotes? (string)`
- **Response `200`:**
```json
{
  "id": 1,
  "orderId": "GBD-123456",
  "trackingNumber": "GBD-TRK-12345678",
  "courierName": "Steadfast",
  "status": "delivered",
  "timeline": [
    { "status": "delivered", "timestamp": "2026-09-27T12:10:00.000Z", "location": "Savar", "description": "Delivered to customer" }
  ],
  "deliveryProofUrl": "http://proof-photo.jpg",
  "deliveryNotes": "Customer received the package"
}
```

### Payments

### `POST /payments/intent`
- **Purpose:** Create a payment intent (returns simulation URLs).
- **Auth:** JWT
- **Request:** `amount (number)`, `orderId (string, optional)`, `bookingId (number, optional)`, `provider (string, optional)`
- **Response `201`:**
```json
{
  "id": "3f2b8c1e-6a4d-4f9b-9c21-7e5a1d0b4f11",
  "orderId": "GBD-123456",
  "userId": 12,
  "amount": 2620,
  "provider": "simulate",
  "status": "pending",
  "redirectUrl": "/payments/simulate-checkout?transactionId=3f2b8c1e-6a4d-4f9b-9c21-7e5a1d0b4f11",
  "callbackUrl": "/payments/callback?transactionId=3f2b8c1e-6a4d-4f9b-9c21-7e5a1d0b4f11",
  "auditTrail": [{ "status": "pending", "timestamp": "2026-09-27T10:15:30.000Z", "message": "Payment intent created" }]
}
```

### `GET /payments/verify/:transactionId`
- **Purpose:** Verify/audit transaction status by transaction ID.
- **Auth:** JWT
- **Request:** `transactionId (path param, uuid)`
- **Response `200`:**
```json
{
  "id": "3f2b8c1e-6a4d-4f9b-9c21-7e5a1d0b4f11",
  "orderId": "GBD-123456",
  "userId": 12,
  "amount": 2620,
  "provider": "simulate",
  "status": "successful",
  "gatewayTransactionId": "SIM-TX-482913",
  "createdAt": "2026-09-27T10:15:30.000Z",
  "auditTrail": [{ "status": "successful", "timestamp": "2026-09-27T10:16:02.000Z", "message": "Payment succeeded via gateway simulator" }]
}
```

### `POST /payments/simulate-success`
- **Purpose:** Gateway simulation callback that forces a transaction to success (disabled in production).
- **Auth:** Public
- **Request:** `transactionId (string)`, `gatewayTxId (string, optional)`
- **Response `201`:**
```json
{
  "id": "3f2b8c1e-6a4d-4f9b-9c21-7e5a1d0b4f11",
  "orderId": "GBD-123456",
  "userId": 12,
  "amount": 2620,
  "provider": "simulate",
  "status": "successful",
  "gatewayTransactionId": "SIM-TX-482913",
  "auditTrail": [{ "status": "successful", "timestamp": "2026-09-27T10:16:02.000Z", "message": "Payment succeeded via gateway simulator" }]
}
```

### `POST /payments/simulate-fail`
- **Purpose:** Gateway simulation callback that forces a transaction to failed (disabled in production).
- **Auth:** Public
- **Request:** `transactionId (string)`
- **Response `201`:**
```json
{
  "id": "3f2b8c1e-6a4d-4f9b-9c21-7e5a1d0b4f11",
  "orderId": "GBD-123456",
  "userId": 12,
  "amount": 2620,
  "provider": "simulate",
  "status": "failed",
  "gatewayTransactionId": null,
  "auditTrail": [{ "status": "failed", "timestamp": "2026-09-27T10:16:02.000Z", "message": "Payment failed via gateway simulator" }]
}
```

### Payment methods

### `GET /payment-methods`
- **Purpose:** List user's payment methods.
- **Auth:** JWT
- **Response `200`:**
```json
[
  {
    "id": 1,
    "userId": 12,
    "type": "bkash",
    "maskedNumber": "017*****678",
    "provider": "bKash",
    "isDefault": true,
    "isVerified": false,
    "createdAt": "2026-09-20T08:00:00.000Z"
  }
]
```

### `POST /payment-methods`
- **Purpose:** Add a payment method.
- **Auth:** JWT
- **Request:** `type (enum: bkash|mobile_banking|card|cash)`, `maskedNumber (string, optional)`, `provider (string, optional)`
- **Response `201`:**
```json
{ "id": 2, "userId": 12, "type": "card", "maskedNumber": "4242", "provider": "Visa", "isDefault": false, "isVerified": false, "createdAt": "2026-09-27T10:15:30.000Z" }
```

### `PUT /payment-methods/:id`
- **Purpose:** Update a payment method (owner-only).
- **Auth:** JWT
- **Request:** `id (path param, number)`, `maskedNumber (string, optional)`, `provider (string, optional)`
- **Response `200`:**
```json
{ "id": 1, "userId": 12, "type": "bkash", "maskedNumber": "018*****432", "provider": "bKash", "isDefault": true, "isVerified": false, "createdAt": "2026-09-20T08:00:00.000Z" }
```

### `DELETE /payment-methods/:id`
- **Purpose:** Remove a payment method (owner-only).
- **Auth:** JWT
- **Request:** `id (path param, number)`
- **Response `200`:**
```json
{ "success": true }
```

### `PATCH /payment-methods/:id/default`
- **Purpose:** Set as default payment method (owner-only).
- **Auth:** JWT
- **Request:** `id (path param, number)`
- **Response `200`:**
```json
{ "id": 1, "userId": 12, "type": "bkash", "maskedNumber": "017*****678", "provider": "bKash", "isDefault": true, "isVerified": true, "createdAt": "2026-09-20T08:00:00.000Z" }
```

### `POST /payment-methods/:id/verify-otp`
- **Purpose:** Verify payment method with OTP.
- **Auth:** JWT
- **Request:** `id (path param, number)`, `otp (string)`
- **Response `201`:**
```json
{ "id": 1, "userId": 12, "type": "bkash", "maskedNumber": "017*****678", "provider": "bKash", "isDefault": true, "isVerified": true, "verificationOtp": null, "createdAt": "2026-09-20T08:00:00.000Z" }
```

### Wallet

### `GET /wallet`
- **Purpose:** Get the current user's wallet balance and coins.
- **Auth:** JWT
- **Response `200`:**
```json
{ "balance": 1500.5, "coins": 240 }
```

### `GET /wallet/transactions`
- **Purpose:** List the current user's wallet ledger.
- **Auth:** JWT
- **Request:** `page (number, optional)`, `limit (number, optional)`
- **Response `200`:**
```json
{
  "data": [
    { "id": 7, "walletId": 3, "amount": -250, "reason": "appointment_fee", "referenceType": "Appointment", "referenceId": "88", "createdAt": "2026-09-27T07:00:00.000Z" }
  ],
  "page": 1,
  "limit": 20,
  "total": 14
}
```

### `POST /wallet/topup`
- **Purpose:** Top up wallet balance.
- **Auth:** JWT
- **Request:** `amount (number)`, `method (string)`
- **Response `201`:**
```json
{ "balance": 2500.5, "coins": 240 }
```

### `POST /wallet/pay`
- **Purpose:** Pay from wallet balance (400 if balance is insufficient).
- **Auth:** JWT
- **Request:** `amount (number)`, `reason (string)`, `appointmentId (number, optional)`
- **Response `201`:**
```json
{ "balance": 2250.5, "coins": 240 }
```

### `POST /wallet/earn-coins`
- **Purpose:** Earn coins (internal).
- **Auth:** JWT
- **Request:** `amount (number, min 1)`, `reason (string)`
- **Response `201`:**
```json
{ "balance": 2250.5, "coins": 290 }
```

### `POST /wallet/spend-coins`
- **Purpose:** Spend coins (internal, 400 if coins are insufficient).
- **Auth:** JWT
- **Request:** `amount (number, min 1)`, `reason (string)`
- **Response `201`:**
```json
{ "balance": 2250.5, "coins": 265 }
```

### Discounts

### `GET /doctors/me/patients`
- **Purpose:** List the current doctor's patients, with any active discount, for the discount screens.
- **Auth:** JWT + Role(DOCTOR)
- **Request:** `search (string, optional)`, `discountGiven (boolean, optional)`
- **Response `200`:**
```json
[
  {
    "id": 4,
    "userId": 12,
    "name": "Gori",
    "breed": "Sahiwal",
    "weight": "320",
    "age": "3 years",
    "color": "Red",
    "ownerName": "Abdul Kader",
    "ownerAvatar": "...",
    "discount": { "id": 1, "doctorId": 3, "patientId": 4, "percent": 15 }
  }
]
```

### `GET /discounts/:patientId`
- **Purpose:** Get the current discount (if any) for a patient.
- **Auth:** JWT + Role(DOCTOR)
- **Request:** `patientId (path param, number)`
- **Response `200`:**
```json
{ "id": 1, "doctorId": 3, "patientId": 4, "percent": 15, "createdAt": "2026-09-27T09:00:00.000Z", "updatedAt": "2026-09-27T09:00:00.000Z" }
```

### `POST /discounts`
- **Purpose:** Apply a discount to a patient's next appointment fee.
- **Auth:** JWT + Role(DOCTOR)
- **Request:** `patientId (number)`, `percent (number, 0-100)`
- **Response `201`:**
```json
{ "id": 1, "doctorId": 3, "patientId": 4, "percent": 15, "createdAt": "2026-09-27T09:00:00.000Z", "updatedAt": "2026-09-27T09:00:00.000Z" }
```

### `PUT /discounts/:id`
- **Purpose:** Edit an existing discount.
- **Auth:** JWT + Role(DOCTOR)
- **Request:** `id (path param, number)`, `percent (number, 0-100)`
- **Response `200`:**
```json
{ "id": 1, "doctorId": 3, "patientId": 4, "percent": 20, "createdAt": "2026-09-27T09:00:00.000Z", "updatedAt": "2026-09-27T10:00:00.000Z" }
```

### `DELETE /discounts/:id`
- **Purpose:** Remove a discount.
- **Auth:** JWT + Role(DOCTOR)
- **Request:** `id (path param, number)`
- **Response `200`:**
```json
{ "success": true }
```

### `GET /discounts/available`
- **Purpose:** Get available discount codes for the current user.
- **Auth:** JWT
- **Response `200`:**
```json
[
  { "id": 1, "code": "EID10", "percent": 10, "validFrom": "2026-09-01", "validTo": "2026-10-31", "usageLimit": 100, "usageCount": 12, "isActive": true, "createdAt": "2026-08-30T08:00:00.000Z" }
]
```

### `POST /discounts/validate`
- **Purpose:** Validate a discount code.
- **Auth:** JWT
- **Request:** `code (string)`
- **Response `201`:**
```json
{ "id": 1, "code": "EID10", "percent": 10, "validFrom": "2026-09-01", "validTo": "2026-10-31", "usageLimit": 100, "usageCount": 12, "isActive": true, "createdAt": "2026-08-30T08:00:00.000Z" }
```

### `POST /discounts/apply`
- **Purpose:** Apply a discount code to an appointment.
- **Auth:** JWT
- **Request:** `code (string)`, `appointmentId (number)`
- **Response `201`:**
```json
{ "success": true, "discountPercent": 10 }
```

### `GET /discounts/my`
- **Purpose:** Get the current user's discount usage history.
- **Auth:** JWT
- **Response `200`:**
```json
[
  { "id": 1, "code": "EID10", "percent": 10, "validFrom": "2026-09-01", "validTo": "2026-10-31", "usageLimit": 100, "usageCount": 12, "isActive": true, "createdAt": "2026-08-30T08:00:00.000Z" }
]
```

### Subscriptions

### `GET /subscriptions/plans`
- **Purpose:** List available subscription plans.
- **Auth:** Public
- **Response `200`:**
```json
[
  { "id": 1, "name": "Pro Farmer", "price": 499, "durationDays": 30, "features": { "maxAnimals": 100 }, "isActive": true, "createdAt": "2026-08-01T08:00:00.000Z" }
]
```

### `GET /subscriptions/my`
- **Purpose:** Get user's current subscription.
- **Auth:** JWT
- **Response `200`:**
```json
{ "id": 5, "userId": 12, "planId": 1, "startDate": "2026-09-25T08:00:00.000Z", "endDate": "2026-10-25T08:00:00.000Z", "status": "active", "createdAt": "2026-09-25T08:00:00.000Z" }
```

### `POST /subscriptions/subscribe`
- **Purpose:** Subscribe to a plan.
- **Auth:** JWT
- **Request:** `planId (number)`, `paymentMethodId (number)`
- **Response `201`:**
```json
{ "id": 5, "userId": 12, "planId": 1, "startDate": "2026-09-27T10:15:30.000Z", "endDate": "2026-10-27T10:15:30.000Z", "status": "active", "createdAt": "2026-09-27T10:15:30.000Z" }
```

### `POST /subscriptions/cancel`
- **Purpose:** Cancel subscription.
- **Auth:** JWT
- **Response `201`:**
```json
{ "id": 5, "userId": 12, "planId": 1, "startDate": "2026-09-25T08:00:00.000Z", "endDate": "2026-10-25T08:00:00.000Z", "status": "cancelled", "createdAt": "2026-09-25T08:00:00.000Z" }
```

### `GET /subscriptions/admin/all`
- **Purpose:** List all subscriptions (admin).
- **Auth:** JWT + Role(ADMIN)
- **Response `200`:**
```json
[
  { "id": 5, "userId": 12, "planId": 1, "startDate": "2026-09-25T08:00:00.000Z", "endDate": "2026-10-25T08:00:00.000Z", "status": "active", "createdAt": "2026-09-25T08:00:00.000Z" }
]
```

### Market rates

### `GET /market-rates`
- **Purpose:** Get today's/latest rates for all commodities.
- **Auth:** Public
- **Response `200`:**
```json
[
  { "id": 3, "commodity": "broiler_chicken", "price": 220.5, "unit": "kg", "date": "2026-09-27", "region": null, "createdAt": "2026-09-27T06:00:00.000Z" }
]
```

### `GET /market-rates/history`
- **Purpose:** Get historical rates for a commodity.
- **Auth:** Public
- **Request:** `commodity (string, optional)`
- **Response `200`:**
```json
[
  { "id": 3, "commodity": "broiler_chicken", "price": 220.5, "unit": "kg", "date": "2026-09-27", "region": null, "createdAt": "2026-09-27T06:00:00.000Z" }
]
```

### Weather

### `GET /weather`
- **Purpose:** Get current farm weather for a location.
- **Auth:** Public
- **Request:** `lat (number, optional)`, `long (number, optional)`, `district (string, optional)`
- **Response `200`:**
```json
{
  "location": "Munshiganj, Bangladesh",
  "temperature": 28.5,
  "highTemp": 32.1,
  "lowTemp": 22.3,
  "humidityPercentage": 65,
  "precipitationMl": 0,
  "windMps": 5.2,
  "sunriseTime": "06:15 AM",
  "sunsetTime": "06:45 PM",
  "isCached": false
}
```

### Search

### `GET /search`
- **Purpose:** Mixed global search across products, livestock, clinics, and doctors.
- **Auth:** Public
- **Request:** `q (string)`
- **Response `200`:**
```json
{
  "products": [{ "id": 1, "sku": "PRD-102-FEED", "name": "Organic Cattle Feed 25kg", "price": 1250, "status": "published" }],
  "livestock": [],
  "doctors": [],
  "clinics": []
}
```


---

# WebSocket events (Socket.IO)

Real-time layer implemented by `ChatGateway` (`backend/src/chat/chat.gateway.ts`) — chat
messaging and call signalling for appointments. OpenAPI cannot describe socket events, so they
are documented here (they are also reproduced in the Swagger UI description at `/api/docs`).

## Connecting

```js
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: { token: accessToken },   // same JWT used as Authorization: Bearer on REST
  // or: query: { token: accessToken }
});
```

- Default namespace (`/socket.io`), same host/port as the REST API.
- The handshake token is verified with the same `JWT_SECRET`; a missing/invalid/expired token
  causes an immediate server-side disconnect.
- On success the server stores the payload on `client.data.user` and auto-joins the personal
  room **`user:{userId}`** — every user receives their `user:{id}` events without any further action.
- Conversation rooms are joined explicitly with the `joinConversation` event
  (room name `conversation:{conversationId}`); joining is a no-op unless the user is a
  participant of that conversation.

## Client → server

| Event | Payload | Purpose |
|-------|---------|---------|
| `joinConversation` | `{ conversationId: number }` | Join the conversation room so you receive room broadcasts. No-op if you are not a participant. |
| `sendMessage` | `{ conversationId: number, text: string }` | Persist a text message and broadcast it to the room; the saved message is emitted back to the room as `messageReceived`. |
| `typing` | `{ conversationId: number, isTyping: boolean }` | Broadcast a typing indicator to the room. |
| `markRead` | `{ messageId: number }` | Mark a message read; the status update is broadcast to the room. |
| `callStarted` | `{ appointmentId, callerId, callerName, callerRole: 'FARMER'\|'PATIENT'\|'DOCTOR', channelName }` | Notify the other party of an incoming video call (Agora channel name included). Only the appointment's doctor/patient may emit it. |
| `callResponse` | `{ appointmentId, accepted: boolean, responderId }` | Accept or decline an incoming call. |
| `callEnded` | `{ appointmentId, endedBy }` | Signal that the call has ended. |

## Server → client

| Event | Payload | Room | Purpose |
|-------|---------|------|---------|
| `messageReceived` | `ChatMessageClientView` (same shape as `POST /chat/message` response) | `conversation:{id}` | New chat message. Also emitted for attachments created over REST. |
| `conversationUpdated` | `ChatMessageClientView` | `user:{id}` (both participants) | Conversation-list refresh for screens that have not joined the conversation room. |
| `messageStatusUpdate` | `{ id, status: 'SENT'\|'DELIVERED'\|'READ' }` | `conversation:{id}` | Delivery/read receipt. |
| `typingIndicator` | `{ userId, isTyping: boolean }` | `conversation:{id}` | Peer typing state. |
| `callStarted` | `{ appointmentId, callerId, callerName, callerRole, channelName }` | `user:{targetUserId}` | Incoming call. |
| `callResponse` | `{ appointmentId, accepted, responderId }` | `user:{targetUserId}` | Call accepted/declined. |
| `callEnded` | `{ appointmentId, endedBy }` | `user:{targetUserId}` | Call finished. |

> Media attachments are REST-only (`POST /chat/message/attachment`) — there is no socket event
> for uploading files.

---

*Generated from source on 2026-09-27. Endpoint counts are verified: 324 route decorators in
`backend/src/**` = 324 entries in this document.*

