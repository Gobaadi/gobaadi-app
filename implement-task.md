Doctor Module Api need :-

Doctor Home Screen:
- doctor me api.
- doctor bookings.
- today doctor total appointments count and total completed appointment count api.


Appointments screen:
-- Appointments screen Today's tab:
- search patient api.
- filter patient api. exm: date, booked appointments, consultation type.
- today's total appointments api.
-- Appointments screen Previous tab:
- last 2 day's completed appointments.


Appointments details screen:
- get a single appointment details api. Here is a reschedule button if user click that button will redirect to the appointment reschedule screen.

Appointments details Reschedule screen:
- send appointment details as a prop in frontend.
- Need a reschedule api for reschedule the appointment. For reschedule doctor will send time and date.


Appointments details Cancel screen:
- Need a post api to cancel the appointment. and doctor will select the cancel reason and at optional note.


Schedule Screen:
Schedule Full Calendar Screen:
- Need an api seeing all doctor schedule.
- Need an api for filter doctor schedule, exm: date, booked appointments, consultation type.

Schedule List View Screen:
- Need and api for seeing all the schedule by current month in the ascending order.


Patient Details Screen:
- Need an api for getting the single patient details.
- Need an api for start consultation.


1st time Discount Screen:
- Need an api for getting all the patients.
- Need an api for getting the single patient details, so we can give him the discount.
- Need an api for giving discount to the patient. exm: doctor will send discount percentage and click continue.


Edit & Remove Discount Screen:
Apply discount Screen:
- Need an api for getting all the patients.
- Need an api for searching the patiens.

Discount Details Screen:
- Need an api for getting the single patient details, so we can give him the discount. Then if doctor click the edit discount it will open the edit discount details screen and doctor can edit the patient discount percentage.
- Need an api for updating the patient discount percentage.
- If doctor click the remove discount it will open the remove discount details screen and doctor can remove the patient discount percentage. Need an api for remove the discount.


Calendar Screen:
Calendar Screen Monthly tab:
- Need an api for getting the open days, blocked days, total appointment count.
- Need an api for getting the all appointments.

Calendar Screen Weekly tab:
- Need an api for getting the current weekly patients appointments.


Calendar settings Screen:
Calendar settings Working hours Screen:
- Need an api for set the working hours in bulk.

Calendar settings Block time off Screen:
- Need an api for blocking the doctor time. frontend will send the start date, end date, reason and an optional note.


Chat Screen:
- Need an api for getting all the appointments. so we can start a chat with the farmer.

Inside a patient chat Screen:
- Need an api for give and receive an msg from the farmer and doctor.
- Need an api for start the video call with the farmer.
- Need an api for end the consultation and give prescription.

Inside the chat send prescription Screen:
- Need an api for send the prescription to the farmer. doctor will send exm: medication name, quantity, frequency, instructions, medication note optional. 


Profile Screen:
- Need an api for getting myself.
- Need an api for getting total patients count, total consultation count, years of experience.

Profile Personal Information Screen:
- Need an api for getting myself doctor.
- Need an api for updating the personal information.
- Need an api for updating the experiences information.
- Need an api for updating the qualifications information.
- Need an api for updating the specialization information.
- Need an api for getting the patient reviews.

Profile Notifications Screen:
- Need an api for getting the notifications.
- Need an api for update the appointments reminders.
- Need an api for update the patient messages.
- Need an api for update the follow up reminders.
- Need an api for update the hygiene reminders.
- Need an api for update the system updates.


================================================================================
                         BACKEND API ANALYSIS - DOCTOR MODULE
================================================================================

Existing APIs Found vs Required - Doctor Module Only
Date: 2026-09-20

================================================================================
SECTION 1: EXISTING APIs THAT MATCH REQUIREMENTS (No Changes Needed)
================================================================================

Doctor Home Screen:
  [EXISTS] GET /doctors/me
    -> Returns current logged-in doctor profile
    -> File: doctors/doctors.controller.ts:54
    -> Auth: JwtAuthGuard + RolesGuard (DOCTOR)

  [EXISTS] GET /doctors/bookings/all
    -> Lists doctor's appointments (filterable, paginated)
    -> Query params: filter, consultationType, search, page, limit
    -> File: appointments/appointments.controller.ts:80
    -> Auth: JwtAuthGuard
    -> NOTE: Works for doctor bookings. Can use filter=today for today's list.


Appointments Details Reschedule Screen:
  [EXISTS] PATCH /doctors/bookings/:id/reschedule
    -> Reschedule appointment (>2h before start)
    -> Body: { date: string, time: string }
    -> File: appointments/appointments.controller.ts:124
    -> Auth: JwtAuthGuard

    -> NOTE: Do that:  before the appointment starts (1h before start), the doctor can reschedule the appointment.


Appointments Details Cancel Screen:
  [EXISTS] PATCH /doctors/bookings/:id/cancel
    -> Cancel appointment with reason + optional note
    -> Body: { reason: string (required), note?: string }
    -> File: appointments/appointments.controller.ts:145
    -> Auth: JwtAuthGuard


Patient Details Screen:
  [EXISTS] GET /patients/:id
    -> Single patient details with owner info
    -> File: patients/patients.controller.ts:43
    -> Auth: JwtAuthGuard + RolesGuard (DOCTOR, ADMIN)


1st Time Discount Screen:
  [EXISTS] GET /patients
    -> List all patients (paginated, searchable by name/breed)
    -> File: patients/patients.controller.ts:25
    -> Auth: JwtAuthGuard + RolesGuard (DOCTOR, ADMIN)

  [EXISTS] GET /patients/:id
    -> Single patient details
    -> File: patients/patients.controller.ts:43

  [EXISTS] POST /discounts
    -> Apply discount to patient (doctor sends percent)
    -> File: discounts/discounts.controller.ts:84
    -> Auth: JwtAuthGuard + DOCTOR role


Discount Details Screen:
  [EXISTS] GET /doctors/me/patients
    -> List doctor's patients with discount info
    -> File: discounts/discounts.controller.ts:47
    -> Auth: JwtAuthGuard + DOCTOR role

  [EXISTS] GET /discounts/:patientId
    -> Get current discount for a patient
    -> File: discounts/discounts.controller.ts:68

  [EXISTS] PUT /discounts/:id
    -> Edit existing discount percentage
    -> File: discounts/discounts.controller.ts:101

  [EXISTS] DELETE /discounts/:id
    -> Remove a discount
    -> File: discounts/discounts.controller.ts:117


Calendar Screen:
  [EXISTS] GET /calendar/doctor/:doctorId
    -> Doctor monthly calendar (appointments + tasks + block times)
    -> Query: month, year
    -> File: calendar/calendar.controller.ts:21

  [EXISTS] GET /calendar/doctor/:doctorId/week
    -> Doctor weekly calendar
    -> Query: date (YYYY-MM-DD)
    -> File: calendar/calendar.controller.ts:38

  [EXISTS] GET /calendar/appointments
    -> User's appointments grouped by view (day/week/month)
    -> Query: date, view
    -> File: calendar/calendar.controller.ts:52

  [EXISTS] GET /calendar/badges
    -> Per-day appointment count for a month
    -> Query: month, year
    -> File: calendar/calendar.controller.ts:64


Calendar Settings - Working Hours:
  [EXISTS] POST /doctors/:id/availability
    -> Replace entire weekly availability (bulk set)
    -> Body: { entries: [{ dayOfWeek, startTime, endTime, slotDurationMinutes?, bufferMinutes? }] }
    -> File: doctors/doctors.controller.ts:84
    -> Auth: JwtAuthGuard + RolesGuard (DOCTOR, own profile only)


Calendar Settings - Block Time Off:
  [EXISTS] POST /doctors/:id/block-times
    -> Block a date range with reason
    -> File: time-off/time-off.controller.ts:49
    -> Auth: JwtAuthGuard + DOCTOR role


Chat Screen:
  [EXISTS] GET /chat/conversations
    -> List user's conversations
    -> File: chat/chat.controller.ts:50

  [EXISTS] GET /chat/messages
    -> List messages in a conversation
    -> File: chat/chat.controller.ts:61

  [EXISTS] POST /chat/message
    -> Send a chat message
    -> File: chat/chat.controller.ts:78

  [EXISTS] WebSocket: sendMessage, joinConversation, typing, markRead
    -> File: chat/chat.gateway.ts


Inside Patient Chat - Video Call:
  [EXISTS] POST /video-call/create
    -> Create video call session (DOCTOR only)
    -> File: video-call/video-call.controller.ts:25

  [EXISTS] POST /video-call/join/:appointmentId
    -> Join video call session
    -> File: video-call/video-call.controller.ts:37

  [EXISTS] POST /video-call/end/:appointmentId
    -> End video call session
    -> File: video-call/video-call.controller.ts:51

  [EXISTS] POST /doctors/bookings/:id/join
    -> Get Agora token + channel for online consultation
    -> File: appointments/appointments.controller.ts:182


Inside Chat - Prescription:
  [EXISTS] POST /prescriptions
    -> Create prescription (DOCTOR only)
    -> File: prescriptions/prescriptions.controller.ts:37

  [EXISTS] POST /prescriptions/:id/send
    -> Send prescription to owner
    -> File: prescriptions/prescriptions.controller.ts:108


Profile Screen:
  [EXISTS] GET /users/me
    -> Get current user profile
    -> File: users/users.controller.ts:30

  [EXISTS] GET /doctors/me
    -> Get current doctor profile
    -> File: doctors/doctors.controller.ts:54

  [EXISTS] PATCH /users/me
    -> Update personal information
    -> File: users/users.controller.ts:40


Profile - Patient Reviews:
  [EXISTS] GET /reviews/:targetType/:targetId
    -> List approved reviews for a target
    -> File: reviews/reviews.controller.ts:46
    -> Usage: GET /reviews/doctor/:doctorId


Profile - Notifications:
  [EXISTS] GET /notifications
    -> Get current user's notifications
    -> File: notifications/notifications.controller.ts:35

  [EXISTS] PUT /notifications/preferences
    -> Update notification preferences (all 6 toggles at once)
    -> File: notifications/notifications.controller.ts:127
    -> Fields: appointmentReminders, patientMessages, followUpReminders, hygieneReminders, systemUpdates


================================================================================
SECTION 2: APIs THAT EXIST BUT NEED UPDATES/EXTENSIONS
================================================================================

[NEEDS UPDATE] GET /doctors/bookings/all
  Current: Returns paginated list with filter=today/previous/etc
  Needed: Also return total count + completed count for "today" filter
  Action: Add summary counts to response OR create new endpoint
  File: appointments/appointments.service.ts (listForUser method)
  Effort: Small - add count queries alongside existing list query


[NEEDS UPDATE] GET /notifications/preferences
  Current: Returns all 6 preference booleans
  Needed: Individual toggle endpoints per preference type
  Action: Add PATCH endpoints for each preference OR keep bulk update
  File: notifications/notifications.controller.ts
  Effort: Small - add individual PATCH routes or frontend sends all at once


[NEEDS UPDATE] GET /calendar/doctor/:doctorId (Monthly)
  Current: Returns CalendarDay[] with appointments, tasks, blockTimes
  Needed: Also return open days count, blocked days count, total appointment count
  Action: Add summary stats to response
  File: calendar/calendar.service.ts (getDoctorMonthlyCalendar)
  Effort: Small - add aggregate counts


[NEEDS REVIEW] GET /doctors/me/patients (Search)
  Current: Lists doctor's patients with discount info
  Needed: Search by patient name
  Action: Check if search param exists, add if missing
  File: discounts/discounts.controller.ts
  Effort: Small - add query param


[NEEDS REVIEW] POST /consultations/:id/end
  Current: Ends a consultation (marks completed)
  Needed: "Start consultation" might be separate from video call create
  Action: Clarify if start consultation = video call create, or needs separate endpoint
  File: medical-events/medical-events.controller.ts:352
  Effort: Depends on requirement clarification


================================================================================
SECTION 3: NEW APIs - ALL IMPLEMENTED
================================================================================

--- Doctor Home Screen ---

[DONE] GET /doctors/bookings/stats/today
  Purpose: Today's total appointments count + completed count
  Auth: JwtAuthGuard + RolesGuard (DOCTOR)
  Response: { totalToday: number, completedToday: number }
  File: appointments/appointments.controller.ts
  Service: appointments.service.ts (getDoctorStats method)


--- Appointments Screen - Today's Tab ---

[DONE] GET /doctors/bookings/search
  Purpose: Search patients within doctor's appointments by patient/animal name
  Auth: JwtAuthGuard + RolesGuard (DOCTOR)
  Query: ?search=<name>&date=<YYYY-MM-DD>&consultationType=<type>&page=&limit=
  Response: Appointment[] with patient details
  File: appointments/appointments.controller.ts
  Service: appointments.service.ts (searchDoctorAppointments method)


[DONE] GET /doctors/bookings/stats/today (merged with doctor stats above)


--- Appointments Screen - Previous Tab ---

[DONE] GET /doctors/bookings/recent-completed
  Purpose: Last N days completed appointments (default 2)
  Auth: JwtAuthGuard + RolesGuard (DOCTOR)
  Query: ?days=2
  Response: Appointment[] with patient+animal details
  File: appointments/appointments.controller.ts
  Service: appointments.service.ts (getRecentCompleted method)


--- Appointments Details Screen ---

[DONE] GET /doctors/bookings/:id
  Purpose: Single appointment full details with patient+animal info
  Auth: JwtAuthGuard (ownership check)
  Response: AppointmentWithPatient
  File: appointments/appointments.controller.ts
  Service: appointments.service.ts (getAppointmentById method)


--- Schedule Screen - Full Calendar ---

[DONE] GET /doctors/:id/schedule
  Purpose: Doctor schedule with optional filters (date, consultationType, status, month/year)
  Auth: public
  Response: { appointments: Appointment[], blockTimes: DoctorTimeOff[] }
  File: doctors/doctors.controller.ts


--- Schedule List View ---

[DONE] GET /doctors/:id/schedule/list
  Purpose: Flat ascending list of appointments for a month
  Auth: public
  Query: ?month=<MM>&year=<YYYY>
  Response: Appointment[] sorted by startAt ASC
  File: doctors/doctors.controller.ts


--- Patient Details - Start Consultation ---

[DONE] PATCH /doctors/bookings/:id/start-consultation
  Purpose: Start consultation for an appointment
  Auth: JwtAuthGuard + RolesGuard (DOCTOR)
  Body: { consultationNotes?: string }
  Response: Appointment
  File: appointments/appointments.controller.ts
  Service: appointments.service.ts (startConsultation method)


--- Chat Screen - Appointments for Chat ---

[DONE] GET /chat/appointments
  Purpose: List doctor's appointments available for chat
  Auth: JwtAuthGuard + RolesGuard (DOCTOR)
  Query: ?page=&limit=
  Response: { data: Appointment[], page, limit, total }
  File: chat/chat.controller.ts


--- Profile Screen - Doctor Stats ---

[DONE] GET /doctors/me/dashboard-stats
  Purpose: Total patients count, total consultation count, experience, specializations
  Auth: JwtAuthGuard + RolesGuard (DOCTOR)
  Response: { totalPatients, totalConsultations, yearsOfExperience, specializations, qualifications, consultationFee, rating }
  File: doctors/doctors.controller.ts


--- Profile Personal Information - Update Doctor Fields ---

[DONE] PATCH /doctors/me/qualifications
  Purpose: Update doctor's qualifications
  Auth: JwtAuthGuard + RolesGuard (DOCTOR)
  Body: { qualifications: string[] }
  File: doctors/doctors.controller.ts
  Service: doctors.service.ts (updateQualifications method)

[DONE] PATCH /doctors/me/specializations
  Purpose: Update doctor's specializations
  Auth: JwtAuthGuard + RolesGuard (DOCTOR)
  Body: { specializations: string[] }
  File: doctors/doctors.controller.ts
  Service: doctors.service.ts (updateSpecializations method)
  Entity: Doctor.specializations (new field added)

[DONE] PATCH /doctors/me/experiences
  Purpose: Update doctor's work experiences
  Auth: JwtAuthGuard + RolesGuard (DOCTOR)
  Body: { experiences: [{ title, organization, duration, description? }] }
  File: doctors/doctors.controller.ts
  Service: doctors.service.ts (updateExperiences method)
  Entity: Doctor.experiences (new jsonb field added)


================================================================================
SECTION 4: SUMMARY
================================================================================

Total Requirements: 48 API needs
Already Exist (No Changes): 30 APIs
Need Updates/Extensions: 5 APIs
New APIs Created: 13 APIs (ALL IMPLEMENTED)

--- Files Modified ---
backend/src/appointments/appointments.controller.ts  (+5 new routes)
backend/src/appointments/appointments.service.ts     (+6 new methods)
backend/src/doctors/doctors.controller.ts            (+6 new routes)
backend/src/doctors/doctors.service.ts               (+4 new methods)
backend/src/doctors/doctor.entity.ts                 (+2 new fields: specializations, experiences)
backend/src/doctors/doctors.module.ts                (+Appointment, DoctorTimeOff imports)
backend/src/chat/chat.controller.ts                  (+1 new route)
backend/src/chat/chat.module.ts                      (already had Appointment, Doctor)

--- Entity Changes Applied ---
- Doctor.specializations: string[] (text array, default '{}')
- Doctor.experiences: jsonb (default '[]')
- NotificationPreference.followUpReminders: boolean (default true)
- NotificationPreference.hygieneReminders: boolean (default true)
- NotificationPreference.systemUpdates: boolean (default true)
- Medicine interface: added quantity, frequency, instructions fields
- TypeORM synchronize: true will auto-sync on next startup

--- Additional Fixes Applied ---
- Reschedule/cancel buffer changed from 2h to 1h
- Calendar badges endpoint now returns: { badges, totalAppointments, openDays, blockedDays }
- Prescription MedicineDto now accepts: name, dosage, quantity, frequency, duration, instructions, notes

--- Build Status: PASSING (npm run build succeeded)

================================================================================
