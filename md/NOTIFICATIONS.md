# Notification System

This document explains how notifications work across the backend (`backend/`) and the
app (`app/`): the persisted in-app notification list, real Expo push delivery, the
admin-triggered send/broadcast endpoints, and how to add a new notification type.

**Four systems exist, for different purposes:**

| System | Persisted per-user? | Push (Expo)? | Real-time (Socket.IO)? | Admin-triggerable? |
|---|---|---|---|---|
| `Notification` entity (`GET /notifications`) | Yes | **Yes** | No | **Yes** — `POST /admin/notifications/send` + `/broadcast` |
| `Alert` broadcast (crop/disease alerts) | No (alert row, not per-user) | No | Yes | Yes — `POST /admin/alerts` |
| Ad hoc socket pings (reminders, file processing) | No | No | Yes | No |

The `Notification` entity is now the system to build on for any new notification type —
it's the only one that's persisted, pushed, and admin-triggerable all at once.

---

## Quick start: integrating notifications into your module

This is the recipe for the common case — your module already has a service method where
some user-facing event happens (an order ships, a request is approved, whatever), and you
want that user to get a notification (persisted + pushed) for it. 12 modules already do
this (orders, payments, appointments, reminders, ai-diagnosis, medical-records, delivery,
chat, clinics, livestock, reviews, referrals — see the table in §1a for the exact
file/line of each) — copy whichever is closest to your case rather than starting blank.

**1. Add `NotificationsModule` to your module's `imports`.** `NotificationsService` is
exported but the module is **not** `@Global()`, so every module that wants to inject it
has to import `NotificationsModule` explicitly — there's no shortcut.

```ts
// your-thing.module.ts
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    // ...your existing imports
    NotificationsModule,
  ],
  // ...
})
export class YourThingModule {}
```

Circular-dependency check: `NotificationsModule` only imports `UsersModule`, and
`UsersModule` has no imports of its own — so importing `NotificationsModule` is safe from
anywhere in the codebase today. The only way to hit a cycle would be if your module is
itself a dependency of `UsersModule`, which nothing currently is. If Nest throws a
circular-dependency error at boot anyway, you're in genuinely new territory — don't reach
for `forwardRef()` as a first move; re-check what actually imports what first.

**2. Inject `NotificationsService` into your service (or processor).**

```ts
// your-thing.service.ts
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/notification.entity';

@Injectable()
export class YourThingService {
  constructor(
    // ...your existing injections
    private readonly notificationsService: NotificationsService,
  ) {}
}
```

**3. Call `createNotification()` right after the state change is saved.**

```ts
async approveRequest(id: number): Promise<Thing> {
  const thing = await this.thingRepository.findOneBy({ id });
  thing.status = 'approved';
  const saved = await this.thingRepository.save(thing);

  await this.notificationsService.createNotification(
    saved.ownerUserId,               // who gets notified — must be a real users.id
    'Request approved',              // title
    'Your request has been approved.', // body
    NotificationType.SYSTEM,         // pick an existing type unless you have a genuinely new category — see §5a
    'Thing',                         // referenceType (optional, freeform string)
    String(saved.id),                // referenceId (optional, must be a string)
  );

  return saved;
}
```

That single call persists the `Notification` row (shows up immediately in
`GET /notifications` and the app's notifications screen) **and** enqueues push delivery
— you don't need to touch the push provider, the queue, or the processor. See §1a for the
full signature and §5a for when you actually need a new `NotificationType` vs. reusing
`SYSTEM`.

**Notifying more than one user at once?** Don't loop `createNotification()` for large
lists — use `NotificationsService.sendToUsers(userIds, title, body, type?, referenceType?, referenceId?)`
instead (bulk-inserts the rows in one `save()` call). For "everyone" or "everyone with a
role," `broadcastToRole()` is what the admin endpoints use — it hands the whole audience
to a background job so the caller doesn't block on a large fan-out (see §3).

**Gotchas that have bitten every module wired up so far:**
- **Transactions**: if your state change happens inside `dataSource.transaction(...)`,
  call `createNotification()` *after* the transaction resolves, not inside the callback.
  It doesn't need to be atomic with your DB write, and there's no reason to hold a
  transaction open for a queue enqueue. Capture whatever you need to notify with
  (e.g. into a local variable) inside the callback, then notify once it returns — see
  `orders/orders.service.ts` (`updateStatus`) or `payments/payments.service.ts` for the
  pattern.
- **Nullable user references**: some FK fields that look like they always point to a user
  are typed nullable (e.g. `Doctor.userId?: number | null` for self-registered doctors
  without a linked account yet). TypeScript will catch this at compile time
  (`createNotification` requires a `number`) — guard with `if (doctor.userId) { ... }`
  rather than asserting non-null.
- **`referenceId` must be a `string`**, even for numeric IDs — `String(saved.id)`, not
  `saved.id`, unless the id is already a string (like `Order.id`, which is a string PK).
- **A failed notification never breaks your business logic** — `createNotification()`
  wraps its own push-enqueue in try/catch internally, so at worst a push silently fails
  to queue; it won't throw back into your calling code.

**4. Verify**: run `npx tsc --noEmit` in `backend/` — this is the fast way to catch a
missed module import (Nest DI failures on a missing provider are a *runtime* error, not
a compile error, but a wrong/missing type on the `createNotification()` call itself will
show up immediately).

If your event is admin-triggered rather than user-triggered by your own module, you
probably don't need a new endpoint at all — see §3, `POST /admin/notifications/send` and
`/broadcast` already cover "specific users" and "everyone / a role."

---

## 1. The `Notification` entity system

Location: `backend/src/notifications/`

### Entity — `notification.entity.ts`

```ts
export enum NotificationType {
  ORDER = 'order',
  BOOKING = 'booking',
  PAYMENT = 'payment',
  DELIVERY = 'delivery',
  REMINDER = 'reminder',
  AI_READY = 'ai_ready',
  PRESCRIPTION_READY = 'prescription_ready',
  PROMOTION = 'promotion',
  SYSTEM = 'system',
  MESSAGE = 'message',
  REFERRAL = 'referral',
}

@Entity('notifications')
export class Notification {
  id: number;
  userId: number;           // FK -> User, CASCADE on delete
  user?: User;
  title: string;
  body: string;             // text column
  type: NotificationType;   // defaults to SYSTEM
  referenceType?: string;   // e.g. 'Order', 'Appointment', 'AiDiagnosis'
  referenceId?: string;     // e.g. the Order/Appointment id
  isRead: boolean;          // defaults to false
  createdAt: Date;
}
```

There is no `updatedAt` and no free-form `metadata`/JSON column on this entity.
`MESSAGE` and `REFERRAL` were added alongside the trigger wiring in §1a below
(migration `1786311774523-AddNotificationTypes.ts`, `ALTER TYPE ... ADD VALUE`).

### Service — `notifications.service.ts`

```ts
async createNotification(
  userId: number,
  title: string,
  body: string,
  type: NotificationType,
  referenceType?: string,
  referenceId?: string,
): Promise<Notification> {
  const notification = this.notificationRepository.create({
    userId, title, body, type, referenceType, referenceId, isRead: false,
  });
  const saved = await this.notificationRepository.save(notification);

  try {
    await this.notificationsQueue.add('send-push', {
      userId, notificationId: saved.id, title: saved.title, body: saved.body, type: saved.type,
    });
  } catch (err) {
    console.warn('Failed to queue push notification job', err);
  }

  return saved;
}
```

Other methods:
- `getUserNotifications(userId)` — all notifications for a user, newest first.
- `markAsRead(id, userId)` — 404 if missing, 403 if the caller doesn't own it.
- `markAllAsRead(userId)` — bulk update, unread → read.
- `registerPushToken(userId, token, deviceId?)` / `unregisterPushToken(userId, token)`
  — upsert/delete a device's Expo push token.
- `sendToUsers(userIds, title, body, type?, referenceType?, referenceId?)` — used by the
  admin "send" endpoint (see §3).
- `broadcastToRole(title, body, type?, role?)` — used by the admin "broadcast" endpoint.
- `findAllPaginated(page, limit, type?, userId?)` — used by the admin list endpoint.

### Controller — `notifications.controller.ts`

All routes require a logged-in user (`JwtAuthGuard`) and only ever act on `user.sub`
(the current user):

| Method | Route | Description |
|---|---|---|
| `GET` | `/notifications` | Current user's notifications |
| `PATCH` | `/notifications/:id/read` | Mark one as read |
| `POST` | `/notifications/read-all` | Mark all as read |
| `POST` | `/notifications/push-token` | Register this device's Expo push token — body `{ token, deviceId? }` |
| `DELETE` | `/notifications/push-token` | Unregister a push token (called on logout) — body `{ token }` |

There's still no way to *create* a notification over HTTP as a regular user — creation
only happens via `NotificationsService.createNotification()` called from backend code, or
via the admin endpoints below.

### Module — `notifications.module.ts`

Registers `Notification` and `PushToken` repositories, a dedicated `notifications-queue`
BullMQ queue (separate from `mail-queue`), the `NotificationsProcessor` worker, and the
`ExpoPushProvider` bound to the `PUSH_PROVIDER` token. Imports `UsersModule` (needed by
`broadcastToRole` to resolve the audience). Exports `NotificationsService`. Registered in
`backend/src/app.module.ts` and imported by `AdminModule`.

### 1a. Where `createNotification()` is actually called from

Every module below injects `NotificationsService` (added to that module's `imports` via
`NotificationsModule`) and calls `createNotification()` right after the relevant
`save()`. No circular-dependency issues — `NotificationsModule` only imports
`UsersModule`, which has no imports of its own.

| Trigger | File | Type |
|---|---|---|
| Order placed | `orders/orders.service.ts` (`placeOrder`) | `ORDER` |
| Order status changed (confirmed/preparing/packed/shipped/delivered/completed/cancelled/refunded/returned/failed) | `orders/orders.service.ts` (`updateStatus`, via an `ORDER_STATUS_MESSAGES` map) | `ORDER` |
| Livestock listing sold (order COMPLETED) | `orders/orders.service.ts` (`updateStatus`, notifies the seller) | `ORDER` |
| Payment received / failed (order) | `payments/payments.service.ts` (`simulateSuccess`/`simulateFail`) | `PAYMENT` |
| Payment confirmed / failed (appointment) | `payments/payments.service.ts` (`simulateSuccess`/`simulateFail`) | `PAYMENT` |
| Appointment booked (patient + doctor) | `appointments/appointments.service.ts` (`bookAppointment`) | `BOOKING` |
| Appointment rescheduled | `appointments/appointments.service.ts` (`rescheduleAppointment`) | `BOOKING` |
| Appointment cancelled (notifies whichever side didn't request it) | `appointments/appointments.service.ts` (`cancelAppointment`) | `BOOKING` |
| Appointment completed | `appointments/appointments.service.ts` (`completeAppointment`) | `BOOKING` |
| Appointment reminder (patient + doctor, 24h/1h) | `reminders/reminders.processor.ts` (`dispatchReminder`) — alongside the existing live `chatGateway.notifyUser` calls | `REMINDER` |
| AI diagnosis ready | `ai-diagnosis/ai-diagnosis.service.ts` (`analyze`) | `AI_READY` |
| Uploaded document ready / failed | `medical-records/file-processing.processor.ts` | `PRESCRIPTION_READY` / `SYSTEM` |
| Delivery status changed | `delivery/delivery.service.ts` (`updateDelivery`) | `DELIVERY` |
| New chat message (notifies the other participant) | `chat/chat.gateway.ts` (`handleMessage`) | `MESSAGE` |
| Clinic verified / rejected | `clinics/clinics.service.ts` (`verifyClinic`) | `SYSTEM` |
| Livestock listing verified / rejected | `livestock/livestock.service.ts` (`verifyListing`) | `SYSTEM` |
| New review received (doctor/clinic) | `reviews/reviews.service.ts` (`create`) | `SYSTEM` |
| Referral claimed (notifies the referrer) | `referrals/referrals.processor.ts` (`'referral-claimed'` job — previously a no-op logger call) | `REFERRAL` |
| Referral payout approved | `referrals/referrals.service.ts` (`approvePayout`) | `REFERRAL` |

Calls inside a DB transaction (`orders.service.ts`, `payments.service.ts`) fire the
notification *after* the transaction resolves, not inside the transaction callback —
it doesn't need to be atomic with the DB write, and the BullMQ enqueue inside
`createNotification()` shouldn't hold a transaction open. `createNotification()` already
wraps its own push-enqueue in a try/catch, so a notification failure can't break the
underlying business operation.

---

## 2. Push notifications (Expo)

### Backend

**`push-token.entity.ts`** — `backend/src/notifications/push-token.entity.ts`. One row
per device: `userId`, `token` (unique), optional `deviceId`, timestamps. A user can have
several rows (multiple devices). Registration is an upsert-by-token, so reinstalling or
re-logging-in doesn't create duplicates.

**Provider abstraction** — same pattern as the weather module
(`backend/src/weather/weather-provider.interface.ts` +
`providers/openweather.provider.ts`):
- `push-provider.interface.ts` — `IPushProvider.sendPush(messages): Promise<string[]>`
  (returns tokens that turned out to be permanently invalid, for pruning).
- `providers/expo-push.provider.ts` — wraps `expo-server-sdk`. Filters out anything that
  isn't a valid Expo push token (`Expo.isExpoPushToken`), chunks messages
  (`expo.chunkPushNotifications`), sends them, and collects any ticket with
  `details.error === 'DeviceNotRegistered'` so the caller can delete that row.
- Bound in the module via `{ provide: PUSH_PROVIDER, useExisting: ExpoPushProvider }`.
  No API key is required for Expo push, so — unlike Resend/OpenWeather — there's no
  "unconfigured" fallback case to handle.

**Delivery worker** — `notifications.processor.ts`, `@Processor('notifications-queue')`:
- Job `'send-push'` — `{ userId, title, body, notificationId?, type? }` → loads that
  user's `PushToken` rows and sends.
- Job `'broadcast'` — `{ userIds, title, body, type? }` → does the bulk `Notification`
  row insert **and** the push fan-out inside the worker (see §3), so an admin broadcast
  request returns immediately regardless of audience size.
- Any stale tokens returned by the provider are deleted from `push_tokens`, so the table
  self-cleans instead of growing unboundedly as users uninstall the app.

**Migration**: `backend/src/migrations/1786310884479-AddPushTokens.ts` creates the
`push_tokens` table. ⚠️ The local dev Postgres database predates the existing
`SyncRemoteSchema` baseline migration (it's missing most tables — a pre-existing issue,
not caused by this change), so `npm run migration:run` currently fails against it partway
through on an unrelated `orders.tax` column. The new migration's SQL is correct and will
apply cleanly once run against a database whose schema matches the migration history
(e.g. staging/prod, or a freshly-provisioned local DB).

### App

**`app/src/lib/push-notifications.ts`** — a small side-effectful singleton module
(same rationale as `socket-manager.ts`'s doc comment: not serializable Redux state):
- `registerForPushNotifications()` — requests notification permission, reads the EAS
  `projectId` via `expo-constants`, gets the Expo push token
  (`Notifications.getExpoPushTokenAsync({ projectId })`), and dispatches the
  `registerPushToken` RTK Query mutation to POST it to the backend.
- `unregisterPushNotifications()` — DELETEs the currently-registered token.
- Configures `Notifications.setNotificationHandler` at module load so foreground pushes
  show a banner.

**⚠️ Prerequisite you still need to do**: Expo push tokens require an EAS `projectId`
(`app.json` → `extra.eas.projectId`). This repo has no `eas.json` and no projectId
configured yet. `registerForPushNotifications()` checks for it and **no-ops with a
console warning** if it's missing — the same defensive style `MailService` uses when
`RESEND_API_KEY` is unset — so the app won't crash, but push tokens won't actually
register until you run `eas init` (or otherwise set `extra.eas.projectId` in `app.json`)
and rebuild.

**Wiring** — `app/src/app/_layout.tsx`, in the same `useEffect` that already connects/
disconnects the chat socket based on auth state:
```ts
useEffect(() => {
  if (user) {
    socketManager.connect();
    registerForPushNotifications();
  } else {
    socketManager.disconnect();
    unregisterPushNotifications();
  }
}, [user]);
```
A second effect registers `Notifications.addNotificationResponseReceivedListener` so
tapping a push (app backgrounded or closed) routes to `/notifications` via
`expo-router`'s `router.push`.

**API client** — `app/src/store/notificationsApi.ts` gained
`registerPushToken`/`unregisterPushToken` mutations, same `builder.mutation` shape as
the existing `markNotificationRead`.

**Config** — `expo-notifications` added to the `plugins` array in `app/app.json` (the
config plugin wires up the Android notification icon/channel setup at build time).

---

## 3. Admin notification management

Location: `backend/src/admin/admin-notifications.controller.ts`, guarded the same way as
every other admin controller (`@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(UserRole.ADMIN)`,
copied from `admin-alerts.controller.ts`):

| Method | Route | Body | Description |
|---|---|---|---|
| `POST` | `/admin/notifications/send` | `SendNotificationDto` | Notify specific users by ID |
| `POST` | `/admin/notifications/broadcast` | `BroadcastNotificationDto` | Notify everyone, or everyone with a given role |
| `GET` | `/admin/notifications` | — (query: `page`, `limit`, `type?`, `userId?`) | Paginated audit list of every notification ever sent |

**`SendNotificationDto`** (`backend/src/notifications/dto/send-notification.dto.ts`):
`{ userIds: number[], title, body, type?, referenceType?, referenceId? }`. Calls
`NotificationsService.sendToUsers()`, which creates one `Notification` row per user
(single bulk `save()`) and enqueues one `'send-push'` job per recipient — fine for the
small, explicit lists an admin picks by hand.

**`BroadcastNotificationDto`** (`.../dto/broadcast-notification.dto.ts`):
`{ title, body, type?, role?: UserRole }`. Calls
`NotificationsService.broadcastToRole()`, which resolves the target user ID list via
`UsersService.findAllIds(role?)` (a new method — plain `id` projection, optionally
filtered by role) and enqueues a **single** `'broadcast'` job carrying the full
recipient list. The `NotificationsProcessor` worker does the (potentially large) bulk
insert and push fan-out, so the HTTP request returns immediately regardless of audience
size — the same reasoning `AlertsService.createAlert` uses when it enqueues
`'broadcast-alert'` instead of fanning out inline.

**`GET /admin/notifications`** reuses the existing `PaginatedResult<T>` interface and the
`findPaginated`-style query shape already used by `AdminUsersController`/`UsersService`,
so admins can audit what's gone out, optionally filtered by `type` or `userId`.

---

## 4. Other systems (unchanged)

### The `Alert` broadcast system

`backend/src/alerts/` + `backend/src/admin/admin-alerts.controller.ts` — a separate,
domain-specific entity (crop/disease/location risk alerts), not the generic
`Notification` entity. `POST /admin/alerts` saves an `Alert` row, indexes it into
Meilisearch, and enqueues `'broadcast-alert'` on `alerts-queue`, which fans out over
`ChatGateway.broadcastAll('alertBroadcast', alert)`. Nothing is persisted per-recipient
here — no read state, and a user who's offline when it broadcasts never sees it unless
they poll `GET /alerts` themselves.

### Real-time transport: the chat Socket.IO gateway doubles as a notification bus

There is no dedicated `NotificationsGateway`. `backend/src/chat/chat.gateway.ts`
(originally built for chat) is reused directly by unrelated features:

```ts
notifyUser(userId: number, event: string, payload: any): void {
  this.server.to(`user:${userId}`).emit(event, payload);
}

broadcastAll(event: string, payload: any): void {
  this.server.emit(event, payload);
}
```

| Caller | Event name | Purpose |
|---|---|---|
| `backend/src/reminders/reminders.processor.ts` | `'appointmentReminder'` | Appointment reminder (also sends an email) |
| `backend/src/medical-records/file-processing.processor.ts` | `'attachmentStatusUpdate'` | AI/attachment processing status |
| `backend/src/alerts/alerts.processor.ts` | `'alertBroadcast'` | Admin-created alert |
| `backend/src/chat/chat.gateway.ts` (internal) | `'conversationUpdated'`, etc. | Chat itself |

On the app side, only chat events are actually listened for
(`app/src/hooks/use-chat-socket.ts` via `app/src/lib/socket-manager.ts`). Push
notifications (§2) are the right tool now for anything that needs to reach a user who
isn't actively connected — these socket events only fire for someone with the app open.

---

## 5. How to add a new notification type

### 5a. Extend the `NotificationType` enum (if it's a genuinely new category)

`backend/src/notifications/notification.entity.ts`:

```ts
export enum NotificationType {
  ORDER = 'order',
  BOOKING = 'booking',
  PAYMENT = 'payment',
  DELIVERY = 'delivery',
  REMINDER = 'reminder',
  AI_READY = 'ai_ready',
  PRESCRIPTION_READY = 'prescription_ready',
  PROMOTION = 'promotion',
  SYSTEM = 'system',
  // ADD YOUR NEW TYPE HERE, e.g.:
  ADMIN_ANNOUNCEMENT = 'admin_announcement',
}
```

The column is a Postgres `enum`, so adding a value needs a migration (`ALTER TYPE ...
ADD VALUE`) — see `backend/src/migrations/` for the convention, and run
`npm run migration:generate` against a schema-current database.

If you're reusing an existing category, skip this step.

### 5b. Persist + push it via `NotificationsService`

From whatever module triggers it (order service, appointment service, etc.), inject
`NotificationsService` (add `NotificationsModule` to that module's `imports`) and call:

```ts
await this.notificationsService.createNotification(
  userId,
  'Your order has shipped',
  'Order #1234 is on its way and should arrive within 2 days.',
  NotificationType.DELIVERY,
  'Order',
  String(order.id),
);
```

This persists the row and enqueues push delivery in one call — no extra wiring needed,
since `createNotification` already pushes (§1/§2).

### 5c. If it's admin-triggered, no new controller is needed

`POST /admin/notifications/send` (specific users) and `POST /admin/notifications/broadcast`
(everyone / a role) already cover the general case — just pass your new `type` in the
request body. Only add a new admin endpoint if you need bespoke targeting logic beyond
"a list of user IDs" or "everyone with role X" (e.g. targeting by geography or by an
unrelated entity's state) — in that case, resolve your custom audience to a `number[]`
and call `NotificationsService.sendToUsers()` directly from a new controller method.

### 5d. Add the icon/label on the app side

`app/src/app/notifications.tsx` maps each `type` string to an emoji via a hardcoded
lookup:

```ts
const TYPE_ICONS: Record<string, string> = {
  order: '📦',
  booking: '📅',
  payment: '💳',
  delivery: '🚚',
  reminder: '⏰',
  ai_ready: '🩺',
  prescription_ready: '💊',
  promotion: '🏷️',
  system: '🔔',
  // add your new type's string value here, or it silently falls back to '🔔'
};
```

If you skip this, the notification still shows up and works fine — it just renders the
generic bell icon.

### 5e. Deliver it by email too (optional)

Notifications don't email by default. If a type should also be emailed, add a new branch
to `backend/src/mail/mail.processor.ts` (`@Processor('mail-queue')`) for a new job name,
and `.add(...)` that job from wherever you call `createNotification`/`sendToUsers` —
following the same pattern as `'send-booking-confirmation'` or
`'send-payment-confirmation'`.

---

## Quick reference — where things live

| Concern | File |
|---|---|
| Notification entity + enum | `backend/src/notifications/notification.entity.ts` |
| Push token entity | `backend/src/notifications/push-token.entity.ts` |
| Notification service (create/read/mark-read/push-token/send/broadcast) | `backend/src/notifications/notifications.service.ts` |
| Notification REST API (user-facing) | `backend/src/notifications/notifications.controller.ts` |
| Push provider interface + Expo implementation | `backend/src/notifications/push-provider.interface.ts`, `backend/src/notifications/providers/expo-push.provider.ts` |
| Push/broadcast delivery worker | `backend/src/notifications/notifications.processor.ts` (`@Processor('notifications-queue')`) |
| Admin send/broadcast/list endpoints | `backend/src/admin/admin-notifications.controller.ts` |
| Admin send/broadcast DTOs | `backend/src/notifications/dto/send-notification.dto.ts`, `.../broadcast-notification.dto.ts` |
| `push_tokens` table migration | `backend/src/migrations/1786310884479-AddPushTokens.ts` |
| Admin alert broadcast (separate system) | `backend/src/admin/admin-alerts.controller.ts`, `backend/src/alerts/` |
| Real-time transport (Socket.IO) | `backend/src/chat/chat.gateway.ts` (`notifyUser`, `broadcastAll`) |
| Email delivery worker | `backend/src/mail/mail.processor.ts` (`@Processor('mail-queue')`) |
| Role-gating for admin endpoints | `backend/src/auth/decorators/roles.decorator.ts`, `backend/src/auth/guards/roles.guard.ts` |
| App: notifications API client | `app/src/store/notificationsApi.ts` (RTK Query) |
| App: notifications screen + icon map | `app/src/app/notifications.tsx` |
| App: push registration/unregistration | `app/src/lib/push-notifications.ts` |
| App: push + socket lifecycle wiring, tap handler | `app/src/app/_layout.tsx` |
| App: socket connection + chat listeners | `app/src/lib/socket-manager.ts`, `app/src/hooks/use-chat-socket.ts` |
