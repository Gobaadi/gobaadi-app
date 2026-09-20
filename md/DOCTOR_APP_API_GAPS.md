# Doctor App API Gaps — Handoff for Interns

Scope: `backend/` (NestJS + TypeORM) work needed to support the doctor-facing
screens from the `Gobaadi For DEV` Figma file — Appointments (today/previous/
filter/details/reschedule/cancel), Schedule/Calendar (working hours, block
time off), Patient Details (consultations/treatments/vaccinations/lab tests/
files), and Discounts. API design only.

Conventions used throughout (match existing modules under `src/*`):
- One module per feature: `src/<feature>/<feature>.module.ts` + `.controller.ts` + `.service.ts` + `<entity>.entity.ts` (TypeORM) + `dto/*.dto.ts` (class-validator)
- Auth: `@UseGuards(JwtAuthGuard, RolesGuard)`, `@Roles(UserRole.DOCTOR)`, `@CurrentUser() user: JwtPayload` → `user.sub` is the `User.id`
- Doctor-scoped routes must resolve the doctor record via `doctorsService.getDoctorByUserId(user.sub)` — `user.sub` is never a `Doctor.id` directly (see `DoctorsController.getMyDoctorProfile` for the existing pattern)
- Pagination: `PaginatedResult<T>` (`{ data, page, limit, total }`), same shape as `DoctorsService.getDoctors`
- Swagger decorators (`@ApiTags`, `@ApiOperation`, `@ApiResponse`, etc.) on every route, matching every existing controller

---

## 1. What's already implemented (verified by reading the controllers)

| Feature | Endpoints | Notes |
|---|---|---|
| Doctor discovery | `GET /doctors`, `GET /doctors/:id`, `GET /doctors/me` | |
| Availability (recurring weekly) | `GET /doctors/:id/availability`, `POST /doctors/:id/availability` | Replaces the full week per call; per-day `dayOfWeek/startTime/endTime/slotDurationMinutes/bufferMinutes` |
| Booking | `GET /doctors/:id/slots`, `POST /doctors/book` | |
| Appointments list | `GET /doctors/bookings/all` | **No query params** — returns everything for the caller, unfiltered, unpaginated |
| Reschedule | `PATCH /doctors/bookings/:id/reschedule` | Body `{ date, time }`; enforces a >2h buffer; cancels the old row, creates a new one with `RESCHEDULED` status |
| Cancel | `PATCH /doctors/bookings/:id/cancel` | **No body** — no reason, no note, no refund/fee logic. Just flips status + sends a notification |
| Complete | `PATCH /doctors/bookings/:id/complete` | Doctor-only |
| Medical files | `POST /medical-records/upload`, `GET /medical-records`, `GET /medical-records/:id` | Covers the **Files** tab only (Attachment = file metadata, no clinical content) |
| Clinics, chat, reviews, referrals, AI diagnosis, payments (simulated) | full CRUD | Not directly touched by these screens except as dependencies |

## 2. Entity gaps (do first, as one shared PR — don't let each intern invent their own shape)

1. **`Appointment` has no `consultationType`.** Screens filter by
   Online-Video/Online-Voice/Online-Chat/Physical. Add
   `consultationType: enum('online_video'|'online_voice'|'online_chat'|'physical')`
   to `appointment.entity.ts` (set at booking time, probably derived from the
   chosen `Service`'s `isOnline`/`isOffline` flags plus a sub-mode, or passed
   explicitly in `BookSlotDto`).
2. **`Appointment` has no structured reason/symptoms.** The Details screen
   shows "Reason for Consultation" and "Symptoms" as distinct fields, not
   free text. Add `reasonForConsultation: string` and `symptoms: string[]` (or
   reuse `notes` if product decides free text is fine — confirm before building).
3. **No structured clinical record entity.** The Patient Details tabs
   (Consultations, Treatments, Vaccinations, Lab Tests) show typed structured
   data — clinical actions, assessment, diagnosis, treatment plan, medicine +
   dosage + administration, sample details + report summary — none of which
   fits the existing `Attachment` entity (that's file metadata only, correctly
   used for the **Files** tab). Add a new entity, e.g.:
   ```ts
   @Entity('medical_events')
   export class MedicalEvent {
     id: number;
     patientId: number;       // Animal.id
     appointmentId: number;
     doctorId: number;
     type: 'CONSULTATION' | 'TREATMENT' | 'VACCINATION' | 'LAB_TEST';
     status: 'ONGOING' | 'COMPLETED';
     data: Record<string, unknown>; // jsonb — shape varies per type, validate at the DTO layer per type
     nextFollowUpAt?: Date;
     createdAt: Date;
   }
   ```
4. **No time-off entity.** `Availability` only models recurring weekly hours.
   Add:
   ```ts
   @Entity('doctor_time_off')
   export class DoctorTimeOff {
     id: number;
     doctorId: number;
     startDate: Date;
     endDate: Date;
     reason: 'vacation' | 'sick_leave' | 'conference_training' | 'emergency' | 'other';
     note?: string;
     createdAt: Date;
   }
   ```
5. **No wallet/ledger entity.** The Cancel and Block-time-off screens show
   "Estimated Wallet Deduction" and a paid receipt with a barcode/fee
   breakdown. `grep -r wallet src/` returns nothing — this is 100% new. Add:
   ```ts
   @Entity('wallets')
   export class Wallet {
     id: number;
     userId: number;   // unique
     balance: number;
   }

   @Entity('wallet_transactions')
   export class WalletTransaction {
     id: number;
     walletId: number;
     amount: number;          // signed: negative = deduction, positive = credit/refund
     reason: string;          // 'appointment_cancellation_fee' | 'time_off_refund' | ...
     referenceType?: string;  // 'Appointment' | 'DoctorTimeOff'
     referenceId?: string;
     createdAt: Date;
   }
   ```
6. **No per-patient discount entity.** `discount` only exists on
   `products`/`orders` (e-commerce line items) — unrelated. Add:
   ```ts
   @Entity('patient_discounts')
   @Index(['doctorId', 'patientId'], { unique: true })
   export class PatientDiscount {
     id: number;
     doctorId: number;
     patientId: number; // Animal.id
     percent: number;   // 0-100
     createdAt: Date;
     updatedAt: Date;
   }
   ```

## 3. Endpoints to add

All paths relative to the API root. `DOCTOR`-guarded means
`@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(UserRole.DOCTOR)`.

### 3.1 Appointments — extend `appointments/`

| Method & Path | Purpose | Request | Response | Depends on |
|---|---|---|---|---|
| `GET /doctors/bookings/all` *(modify existing)* | Add filtering/pagination for Today/Previous/Filter screens | Query: `status=today\|previous\|upcoming\|completed\|cancelled`, `consultationType=online_video\|online_voice\|online_chat\|physical`, `search` (patient name), `page`, `limit` | `PaginatedResult<AppointmentWithPatient>` | §2.1 for `consultationType` filter |
| `PATCH /doctors/bookings/:id/cancel` *(modify existing)* | Capture reason/note, compute fee, deduct/refund wallet | Body: `{ reason: 'emergency'\|'schedule_conflict'\|'other', note?: string }` | Updated `Appointment` + `{ walletDeduction: number }` | §2.5 wallet |
| `POST /doctors/bookings/:id/join` | Return a join token/URL for online consultations | — | `{ url: string }` or provider-specific token | Video provider decision (Twilio/Agora/etc. — not yet chosen, stub the interface first) |

### 3.2 Schedule / Time-off — new module `time-off/`

| Method & Path | Purpose | Request | Response | Depends on |
|---|---|---|---|---|
| `GET /doctors/:id/time-off` | List blocked date ranges | — | `DoctorTimeOff[]` | §2.4 |
| `POST /doctors/:id/time-off` | Block a date range | `{ startDate, endDate, reason, note? }` | `201` → `DoctorTimeOff`, or `409` with the list of conflicting appointments if any exist in range (matches the "You have existing appointments" confirm screen) | §2.4 |
| `POST /doctors/:id/time-off/:timeOffId/confirm` | Confirm blocking despite conflicts — cancels overlapping appointments, refunds patients, deducts the doctor's wallet for cancellation fees, returns a receipt | — | `{ timeOff, cancelledAppointments, walletDeduction, totalFees }` (matches the Billing Details/barcode receipt screen) | §2.4, §2.5 |
| `DELETE /doctors/:id/time-off/:timeOffId` | Remove a blocked range | — | `204` | §2.4 |
| `GET /doctors/:id/schedule` | Combined calendar view: per-day appointment counts + `{ openDays, blockedDays, totalAppointments }` summary for the Calendar screens | Query: `view=monthly\|weekly`, `month`, `year` | — | Reads `Appointment` + `Availability` + `DoctorTimeOff` |

### 3.3 Patient medical records — new module `medical-events/`

Distinct from the existing `medical-records` module (which stays as-is for
file attachments). Depends on §2.3.

| Method & Path | Purpose | Request | Response | Depends on |
|---|---|---|---|---|
| `GET /animals/:id/medical-events` | List structured records for a patient | Query: `type=consultation\|treatment\|vaccination\|lab_test`, `page`, `limit` | `PaginatedResult<MedicalEvent>` | §2.3; only doctors with appointment history for this patient, or admins |
| `POST /animals/:id/medical-events` | Create a record during/after a consultation | `{ appointmentId, type, data: {...}, nextFollowUpAt? }` — `data` shape validated per `type` via a discriminated DTO | `201` → `MedicalEvent` | §2.3, `DOCTOR`-guarded |
| `PATCH /medical-events/:id` | Update (e.g. mark treatment `COMPLETED`, log a new day's entry) | `{ status?, data? }` | Updated `MedicalEvent` | §2.3 |

### 3.4 Discounts — new module `discounts/`

Depends on §2.6.

| Method & Path | Purpose | Request | Response | Depends on |
|---|---|---|---|---|
| `GET /doctors/me/patients` | List this doctor's patients for the discount screens | Query: `search`, `discountGiven=true\|false` | Distinct `Animal`s from this doctor's appointment history, joined with any active discount | Reads `Appointment` + §2.6 |
| `GET /discounts/:patientId` | Current discount for a patient under this doctor | — | `PatientDiscount \| null` | §2.6 |
| `POST /discounts` | Apply a discount | `{ patientId, percent }` | `201` → `PatientDiscount` | §2.6; apply at next booking's price calculation only, per the design's own disclaimer text |
| `PUT /discounts/:id` | Edit | `{ percent }` | Updated `PatientDiscount` | §2.6 |
| `DELETE /discounts/:id` | Remove | — | `204` | §2.6 |

### 3.5 Wallet — new module `wallet/`

Depends on §2.5. Needed by §3.1 (cancel) and §3.2 (time-off confirm).

| Method & Path | Purpose | Request | Response | Depends on |
|---|---|---|---|---|
| `GET /wallet/me` | Current balance | — | `{ balance: number }` | §2.5 |
| `GET /wallet/me/transactions` | Ledger, paginated | Query: `page`, `limit` | `PaginatedResult<WalletTransaction>` | §2.5 — every cancel/time-off action that moves money must write a row here, not just mutate `balance` |

## 4. Customer/user-side gaps

Unlike the earlier `gobadi-website` analysis, this repo already has a mature
customer-facing API surface — doctor discovery/booking, chat, reviews,
referrals, AI diagnosis, and simulated payments all exist and are wired up
(§1). The customer side doesn't need a parallel build-out; it only needs
small extensions to consume the new features above:

| Method & Path | Purpose | Depends on |
|---|---|---|
| `GET /wallet/me`, `GET /wallet/me/transactions` *(same endpoints as §3.5)* | Customers also need their own wallet balance/ledger — refunds credit here, not just doctors' deduction side | §2.5, §3.5 (same module, both roles) |
| `POST /wallet/top-up` | Fund a wallet directly (if product wants pre-funded balances rather than refund-only credit) — confirm with product before building, not implied by the screens shown | §2.5; likely reuses `payments` module's intent/verify flow |
| `GET /animals/:id/medical-events` *(same endpoint as §3.3)* | Owners need read access to their own animal's consultation/treatment/vaccination/lab-test history, not just doctors | §2.3; same endpoint, just allow `patientId` owner in addition to the treating doctor |
| `POST /doctors/book` *(modify existing)* | Apply any active `PatientDiscount` (§2.6) to `price` at booking time | §2.6, §3.4 |

## 5. Recommended implementation order

1. **Shared entity PR** (one person, reviewed before anyone builds on it):
   `Appointment.consultationType`/`reasonForConsultation`/`symptoms`,
   `MedicalEvent`, `DoctorTimeOff`, `Wallet`/`WalletTransaction`,
   `PatientDiscount` (§2). Generate + run the TypeORM migration.
2. **Wallet module (§3.5)** first among the new modules — cancel and
   time-off both need it, build it once so nobody duplicates the ledger logic.
3. **Appointments enhancements (§3.1)** — filtering/pagination on the list
   endpoint is low-risk and unblocks the Today/Previous/Filter screens
   immediately; cancel-with-reason+refund comes after wallet exists.
4. **Time-off module (§3.2)** — depends on wallet; the conflict-check +
   confirm two-step flow is the most involved piece, do it after appointments
   filtering is solid so you can reuse that query logic to find conflicts.
5. **Medical events module (§3.3)** — independent of the above, can be built
   in parallel by a second intern once the entity PR lands.
6. **Discounts module (§3.4)** — depends on appointments (for the patient
   list) and touches the booking price calculation in `AppointmentsService`,
   so do it last to avoid merge conflicts with whoever's mid-flight on booking logic.
7. **Video join endpoint (§3.1)** — blocked on a provider decision (Twilio/
   Agora/etc.); can be stubbed with a placeholder URL until that's chosen so
   frontend work isn't blocked.
