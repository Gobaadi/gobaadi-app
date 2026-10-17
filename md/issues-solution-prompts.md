# React Native App — Issues & Solution Prompts

Use these prompts one by one to fix each issue. Each prompt is self-contained —
copy-paste into a session to solve that specific problem.

---

## Issue 1: Payment Flow Disabled (Critical)

**Problem:** All payment screens are commented out in `_layout.tsx` (lines 89-93, 108-109):
`booking-payment`, `payment-method`, `payment-success`, `confirm-pay`,
`bkash-number`, `billing-details`, `booking-bkash-number`.

**Solution Prompt:**
> In `E:\office\gobadi-app\app\src\app\_layout.tsx`, uncomment all payment-related
> `Stack.Screen` entries that are currently commented out. These include:
> `confirm-pay`, `payment-method`, `bkash-number`, `payment-success`,
> `billing-details`, `booking-payment`, and `booking-bkash-number`.
> Verify the routes are properly registered and accessible.

**Testing:**
- [ ] Navigate to `/booking-payment` from Book Animal — screen loads without crash
- [ ] Navigate to `/payment-method` — screen renders correctly
- [ ] Navigate to `/payment-success` — success screen displays
- [ ] Navigate to `/confirm-pay` — confirmation screen renders
- [ ] Navigate to `/bkash-number` — input screen renders
- [ ] Navigate to `/billing-details` — details screen renders
- [ ] Navigate to `/booking-bkash-number` — input screen renders
- [ ] Complete full payment flow end-to-end (Book Animal → Payment → Success)

---

## Issue 2: No User-Side "My Appointments" Screen (Critical)

**Problem:** `appointments.tsx` is guarded by `useRequireDoctor()` — users cannot
view their own appointments. There is no user-facing appointment list.

**Solution Prompt:**
> Create a new screen file `my-appointments.tsx` in `E:\office\gobadi-app\app\src\app\`
> that shows the logged-in user's (farmer's) upcoming and past appointments.
> - Use an RTK Query endpoint to fetch user appointments (e.g. `GET /bookings/my`)
> - Show tabs for "Upcoming" and "Past" appointments
> - Each card should show: animal image, doctor name, date/time, status badge, consultation type
> - Tapping a card navigates to a user-facing appointment detail view
> - Register the new screen in `_layout.tsx` and add a navigation entry point
>   from the farmer home screen or profile screen.

**Testing:**
- [ ] Log in as a farmer/user account
- [ ] Navigate to "My Appointments" from home or profile
- [ ] "Upcoming" tab shows future appointments with correct data
- [ ] "Past" tab shows completed/cancelled appointments
- [ ] Tapping an appointment card opens the detail view with correct info
- [ ] Status badges render with correct colors (confirmed=green, completed=blue, cancelled=red)
- [ ] Empty state shows when no appointments exist
- [ ] Log in as a doctor — "My Appointments" entry is NOT visible in farmer tabs
- [ ] Doctor appointments screen still works as before

---

## Issue 3: Book Animal Flow Broken at Payment Step (Critical)

**Problem:** `book-animal.tsx` line 144 navigates to `/booking-payment`, but that
route was disabled. The reservation API succeeds but the flow crashes.

**Solution Prompt:**
> In `E:\office\gobadi-app\app\src\app\book-animal.tsx`, fix the navigation flow
> after `handleReserve()` succeeds. Instead of navigating to `/booking-payment` (which
> was disabled), update the flow to either:
> 1. Navigate to `/checkout` with the reserved item data (preferred, since checkout is functional),
>    OR
> 2. Navigate to `/confirm-booking` with the reservation details as params.
> Update line ~144 (`router.push('/booking-payment')`) to use the correct target route.
> Make sure the reserved item data is passed as route params so the next screen can display it.

**Testing:**
- [ ] Navigate to an animal listing → tap "Book Animal"
- [ ] Select a booking option (3/5/10/20 days)
- [ ] Tap "Proceed Booking"
- [ ] Reservation API call succeeds
- [ ] Navigation proceeds to the correct next screen (checkout or confirm-booking) — no crash
- [ ] The reserved item data is displayed on the next screen
- [ ] Complete full booking flow to end (Book → Payment → Success)
- [ ] Verify on both iOS and Android

---

## Issue 4: Task Edit Uses Delete+Recreate (Medium)

**Problem:** `tasksApi.ts` `updateTask` mutation sends `method: 'DELETE'` then creates
a new task. The task gets a **new ID** after editing, breaking any references.

**Solution Prompt:**
> In `E:\office\gobadi-app\app\src\store\tasksApi.ts`, fix the `updateTask` mutation
> (around line 64). Currently it uses `method: 'DELETE'` followed by creating a new task.
> Replace this with a proper `PATCH` or `PUT` request:
> - Change the method to `'PATCH'`
> - Set the URL to `` `/tasks/${id}` ``
> - Send the updated task fields in the body
> - Update the `providesTags` and `invalidatesTags` to match (invalidate `Task` tag)
> - Update the `updateTask` response type and `arg` type in `tasksApi.ts` accordingly.
> Then verify the backend has a PATCH endpoint for task updates. If not, check
> `E:\office\gobadi-app\backend\src\tasks\tasks.controller.ts` and add one.

**Testing:**
- [ ] Navigate to My Tasks → tap "Edit" on a task
- [ ] Modify the task title and save
- [ ] Task updates in the list without disappearing/reappearing
- [ ] Task ID remains the same after editing (check via API or console log)
- [ ] Other references to the task (if any) still work
- [ ] Edit task type, instructions, schedule time — all persist correctly
- [ ] Run `npm run lint` and `npm run typecheck` — no new errors

---

## Issue 5: Discount Remove — No UI (Medium)

**Problem:** The API endpoint `useRemoveDiscountMutation` exists in `discountsApi.ts`
but there is no delete/remove button in the `discount.tsx` screen.

**Solution Prompt:**
> In `E:\office\gobadi-app\app\src\app\discount.tsx`, add a "Remove Discount" button
> to the discount details screen. Requirements:
> - Import `useRemoveDiscountMutation` from `@/store/discountsApi`
> - Add a "Remove Discount" button (red/warning style) below the existing Save button
> - On tap, show an `Alert.alert` confirmation dialog:
>   Title: "Remove Discount"
>   Message: "Are you sure you want to remove this patient's discount?"
>   Buttons: "Cancel" and "Remove"
> - On confirm, call `removeDiscount(discount.id)` with the discount ID from the route params
> - On success, navigate back to `/apply-discount`
> - Show loading state on the button while the API call is in progress
> - Only show this button if a discount already exists (i.e., `discountData` is not null)

**Testing:**
- [ ] Navigate to Apply Discount → select a patient with an existing discount
- [ ] "Remove Discount" button is visible on the discount details screen
- [ ] Tap "Remove Discount" → confirmation dialog appears
- [ ] Tap "Cancel" → dialog closes, discount is NOT removed
- [ ] Tap "Remove Discount" again → confirm → API call succeeds
- [ ] Navigates back to Apply Discount screen
- [ ] The patient's discount is cleared (no longer shows "Discount Given" badge)
- [ ] "Remove Discount" button is NOT visible for patients without an existing discount
- [ ] Run `npm run lint` and `npm run typecheck` — no new errors

---

## Issue 6: Reschedule Time Slots Hardcoded (Medium)

**Problem:** `appointment-reschedule.tsx` hardcodes time slots to 7:00 PM – 10:00 PM
instead of using the doctor's actual availability.

**Solution Prompt:**
> In `E:\office\gobadi-app\app\src\app\appointment-reschedule.tsx`, replace the
> hardcoded time slots with dynamic slots fetched from the doctor's availability.
> - Import the appropriate RTK Query hook to get the doctor's available time slots
>   for the selected date (e.g. `useGetSlotsQuery` with doctorId and date params,
>   similar to how `book-slot.tsx` does it)
> - Replace the hardcoded `TIME_SLOTS` array (around line 60-70) with the API response
> - Add a loading state while slots are being fetched
> - Show an empty state if no slots are available for the selected date
> - Keep the same UI for slot selection (the time slot buttons)
> Reference: `E:\office\gobadi-app\app\src\app\book-slot.tsx` lines 68-80 for how
> slots are fetched and rendered.

**Testing:**
- [ ] Navigate to Appointments → tap an appointment → tap "Reschedule"
- [ ] Select a date on the calendar
- [ ] Time slots load dynamically from doctor's availability (not hardcoded 7-10 PM)
- [ ] Loading indicator shows while slots are being fetched
- [ ] Empty state shows if no slots available for that date
- [ ] Select a slot → tap "Reschedule" → API call succeeds with correct time
- [ ] Appointment list updates with the new date/time
- [ ] Verify slots match the doctor's working hours settings

---

## Issue 7: Wallet Weekly Chart Uses Mock Data (Low)

**Problem:** `wallet.tsx` has a hardcoded `MOCK_WEEKLY_DATA` array for the weekly
performance bar chart instead of real transaction data.

**Solution Prompt:**
> In `E:\office\gobadi-app\app\src\app\wallet.tsx`, replace `MOCK_WEEKLY_DATA`
> (around line 50-57) with real weekly earnings data derived from the transactions
> fetched via `useGetTransactionsQuery`.
> - Filter transactions from the current week (Mon–Sun)
> - Group by day of week and sum credit amounts per day
> - Map the result to the bar chart data format:
>     `{ label: 'Mon', value: <sum for Monday> }`
> - Handle the case where no transactions exist for a day (value: 0)
> - Keep the same bar chart component and styling
> This approach uses existing API data, so no new backend endpoint is needed.

**Testing:**
- [ ] Navigate to Wallet screen as a doctor
- [ ] Weekly performance bar chart shows real data (not always the same pattern)
- [ ] Days with no transactions show 0 value
- [ ] Days with transactions show correct summed amounts
- [ ] Chart updates when new transactions are added (pull to refresh)
- [ ] Total earnings match the sum of the weekly bars
- [ ] Empty state handles gracefully when no transactions exist at all
- [ ] Run `npm run lint` and `npm run typecheck` — no new errors

---

## Issue 8: `discount.tsx` Not Registered in _layout.tsx (Low)

**Problem:** `discount.tsx` is navigated to from `apply-discount.tsx` but has no
`Stack.Screen` entry in `_layout.tsx`. Works via file-system routing but lacks
explicit configuration (e.g., `headerShown: false`).

**Solution Prompt:**
> In `E:\office\gobadi-app\app\src\app\_layout.tsx`, add a `Stack.Screen` entry
> for the `discount` route:
> ```tsx
> <Stack.Screen name="discount" options={{ headerShown: false }} />
> ```
> Place it near the other doctor-related screens (around line 136-140). This ensures
> the screen has consistent header behavior with the rest of the app.

**Testing:**
- [ ] Navigate to Apply Discount → select a patient → discount screen opens
- [ ] Screen has no default header (headerShown: false applied)
- [ ] Back navigation works correctly
- [ ] Screen UI renders fully with discount info
- [ ] Run `npm run lint` and `npm run typecheck` — no new errors

---

## Verification Checklist (After All Fixes)

- [ ] `npm run lint` — passes with no errors
- [ ] `npm run typecheck` — passes with no errors
- [ ] Full regression test: Farmer login → browse animals → book animal → payment → success
- [ ] Full regression test: Doctor login → appointments → reschedule/cancel → patient details → prescription
- [ ] Test on both iOS and Android devices
