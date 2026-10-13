# Remaining Issues - Step by Step Guide

## Issues Intentionally Deferred (Do Not Fix Now)

These issues were marked "Dont complete this issues now" by the user.

---

### 1. GOB-MOB-FN-TC-012 - OTP Not Received

- **Section:** Registration & Authentication
- **Problem:** OTP is not received after entering a valid phone number during registration, preventing account creation.
- **Status:** Deferred
- **Action:** Wait for backend OTP service to be configured/fixed.

---

### 2. GOB-MOB-FN-TC-039 - Language Change Not Updating UI

- **Section:** Localization
- **Problem:** Changing and saving a language other than English does not update the app interface text.
- **Status:** Deferred
- **Action:** Requires full i18n implementation across all screens.

---

### 3. GOB-MOB-FN-TC-106 - Audio/Video Consultation Stuck

- **Section:** Appointments & Doctor Consultations
- **Problem:** Consultation screen gets stuck on "Connecting...".
- **Status:** Deferred
- **Action:** Likely requires WebRTC/Socket.IO backend integration.

---

### 4. GOB-MOB-FN-TC-144 - Create Listing Fails

- **Section:** Marketplace & Checkout
- **Problem:** Returns "Could not create listing - Please try again."
- **Status:** Deferred
- **Action:** Requires backend marketplace listing endpoint to be fixed.

---

### 5. GOB-MOB-FN-TC-156 - Cancel Subscription Fails

- **Section:** Profile & Subscriptions
- **Problem:** Shows error popup "Failed to cancel subscription".
- **Status:** Deferred
- **Action:** Requires backend subscription cancellation endpoint to be fixed.

---

## Issues With No Clear Instructions

These issues have only a "Note:" label with no description of what to fix or how.

---

### 6. GOB-MOB-FN-TC-075 - Unavailable Slot Booking

- **Section:** Appointments & Doctor Consultations
- **Problem:** User can book a slot that is already unavailable.
- **Suggested Fix:** Disable already-booked time slots in the UI. In `book-slot.tsx`, already-booked slots should be visually disabled and not selectable.

---

### 7. GOB-MOB-FN-TC-076 - Past Slot Booking

- **Section:** Appointments & Doctor Consultations
- **Problem:** User can book a time slot that has already passed.
- **Suggested Fix:** In `book-slot.tsx`, filter out past time slots for the selected date. If the selected date is today, only show slots after the current time.

---

### 8. GOB-MOB-FN-TC-086 - Payment Failure Handling

- **Section:** Appointments & Doctor Consultations
- **Problem:** Payment failure during appointment booking is not handled properly.
- **Suggested Fix:** Add error handling in the payment flow. Show user-friendly error message and allow retry.

---

### 9. GOB-MOB-FN-TC-087 - Payment Cancellation Handling

- **Section:** Appointments & Doctor Consultations
- **Problem:** Cancelling a payment does not properly clean up the booking state.
- **Suggested Fix:** When user cancels payment, ensure the appointment is not left in a pending/inconsistent state.

---

### 10. GOB-MOB-FN-TC-090 - Payment Edge Cases

- **Section:** Appointments & Doctor Consultations
- **Problem:** Edge cases in payment flow (e.g., double payment, timeout) are not handled.
- **Suggested Fix:** Add idempotency checks and timeout handling in payment flow.

---

### 11. GOB-MOB-FN-TC-102 - Real-time Incoming Message Receipt

- **Section:** Appointments & Doctor Consultations
- **Problem:** Real-time messages are not received during consultation.
- **Suggested Fix:** Requires WebSocket/Socket.IO connection for real-time messaging during consultations.

---

### 12. GOB-MOB-FN-TC-110 - Doctor-Issued Prescription View

- **Section:** Appointments & Doctor Consultations
- **Problem:** Patient cannot view prescriptions issued by the doctor.
- **Suggested Fix:** Create a prescriptions screen that fetches and displays prescriptions linked to the user's appointments.

---

### 13. GOB-MOB-FN-TC-091 - Notification List Fails to Load

- **Section:** Notifications
- **Problem:** Screen shows "Failed to load notifications" error.
- **Root Cause:** Backend API endpoint `/notifications` is returning an error.
- **Current State:** UI handles this gracefully with an error state (cloud-offline icon + message).
- **Suggested Fix:** Fix the backend notifications endpoint. The frontend code in `notifications.tsx` is correct.

---

### 14. GOB-MOB-FN-TC-092 - Unread Notification Badge State

- **Section:** Notifications
- **Problem:** Unread notification count badge is not displayed correctly.
- **Depends On:** TC-091 (notifications must load first)
- **Suggested Fix:** Once notifications load, add a badge count to the notification bell icon across the app (header, tab bar).

---

### 15. GOB-MOB-FN-TC-093 - Mark Single Notification as Read

- **Section:** Notifications
- **Problem:** Tapping a single notification does not mark it as read.
- **Depends On:** TC-091
- **Current State:** `notifications.tsx` already has `handlePress` calling `markAsRead(notif.id)` and shows unread dot. This should work once the backend notifications endpoint is fixed.
- **Suggested Fix:** Verify the `useMarkNotificationReadMutation` PATCH endpoint works correctly on the backend.

---

### 16. GOB-MOB-FN-TC-094 - Mark All Notifications as Read

- **Section:** Notifications
- **Problem:** No "Mark all as read" button exists.
- **Depends On:** TC-091
- **Suggested Fix:** Add a "Mark all read" button in the notifications header that calls a bulk mark-read API endpoint.

---

## Previously Fixed Issue - Bug Found During Review

### TC-049/050 - Edit Animal Data Loading (FIXED)

- **Problem:** When editing an animal, only name/breed/weight/age/color were pre-populated. All other fields (dob, gender, source, joinedFarm, liveWeight, reproStatus, description, photos, photoCost, sellingPrice, liveWeightPrice) were lost.
- **Fix Applied:** Updated `useEffect` in `add-animal.tsx:255-262` to load ALL fields from `existingAnimal`.

---

## Recommended Fix Order

1. **TC-091** (Notification list) - Backend fix needed first, unblocks TC-092/093/094
2. **TC-075/076** (Slot booking validation) - Frontend-only fix in `book-slot.tsx`
3. **TC-086/087/090** (Payment edge cases) - Frontend error handling improvements
4. **TC-110** (Prescription view) - New screen creation
5. **TC-102** (Real-time messages) - Requires WebSocket infrastructure
6. **TC-144** (Create Listing) - Backend fix needed
7. **TC-156** (Cancel Subscription) - Backend fix needed
8. **TC-012** (OTP) - Backend SMS service configuration
9. **TC-039** (Localization) - Full i18n implementation
10. **TC-106** (Video consultation) - WebRTC/Socket.IO integration
