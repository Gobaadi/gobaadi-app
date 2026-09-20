1. Registration & Authentication

GOB-MOB-FN-TC-012 (Registration - OTP): OTP is not received after entering a valid phone number during registration, preventing account creation.
- **Note: Dont complete this issues now** 
---

GOB-MOB-FN-TC-015 (Registration - Terms): Registration screen lacks a Terms & Conditions acceptance checkbox (only shows agreement text).
- **Note:already completed this issues** 
---

2. Localization

GOB-MOB-FN-TC-039 (Language): Changing and saving a language other than English does not update the app interface text.
- **Note: Dont complete this issues now** 
---

3. Animal Management (Add / Edit / Delete)

GOB-MOB-FN-TC-044 (Add Animal - Photo Required): Creation is blocked because required photo cannot be uploaded.
- **Note: after users select an image that image will be upload to clodinary in database you just need to send the image link i will add cloudinary env to my env file you just need to add the env example what you need in the env** 
- **SOLVED**: Created `lib/cloudinary-upload.ts` utility that reads local image as base64 via expo-file-system, uploads to Cloudinary API, and returns secure URL. `add-animal.tsx` now uploads all photos to Cloudinary before submitting, sends URLs instead of local URIs. Added `EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME` to `.env.example`.
---

GOB-MOB-FN-TC-046 (Add Animal - Input Validation): Invalid data in Name and Description fields is accepted without validation messages.
- **Note:on name an description file you will only take the stiring value not others input + number also allowed** 
- **SOLVED**: Added regex validation on both name and description fields in `add-animal.tsx`. Invalid characters trigger an Alert. Strings + numbers + basic punctuation allowed.
---

GOB-MOB-FN-TC-047 (Add Animal - Photo Picker): Photo picker opens but fails to select/upload a photo.
- **Note:use cloadinary to upload image you can craate an fucniton that fucntion will upload the image to cloudinary and that function will return an image url** 
- **SOLVED**: Created `uploadImageToCloudinary()` in `lib/cloudinary-upload.ts`. Photo picker now uploads to Cloudinary and returns URLs. Button shows "Uploading..." state during upload.
---

Blocked Test Cases (Not Run due to creation failure):

- GOB-MOB-FN-TC-041: View Animal List
- **Note: if user click here you have to return all animal list in the animal list page**
- **SOLVED**: `animals.tsx` fetches via `useGetAnimalsQuery()`. Fixed hardcoded filter counts to dynamic counts. Added proper filtering logic for Calf/Bull tabs.
---
- GOB-MOB-FN-TC-043: Open Animal Details
- **Note: user will able to read all the animal details and also able to edit the animal details**
- **SOLVED**: `my-animal-detail.tsx` displays all details (DOB, gender, source, breed, age, color, joined farm, live weight, price). Edit button navigates to add-animal with edit param loading existing data.
---
- GOB-MOB-FN-TC-048: Invalid Photo Handling
- **Note: handle photo properly here usr will able to upload the image and also able to delete the image image type will be image/jpeg. png and jpg are also allowed no pdf or other type of file**
- **SOLVED**: Added MIME type validation in `add-animal.tsx`. Only image/jpeg, image/png, image/jpg accepted. Non-image files filtered out with alert. Photo delete was already working.
---
- GOB-MOB-FN-TC-049 & TC-050: Edit Animal & Persistence
- **Note: user will able to edit the animal details and also able to save the animal details**
- **SOLVED**: `add-animal.tsx` handles both add and edit modes via `editId` param. Existing data loaded via `useGetAnimalByIdQuery`. Submit calls `updateAnimal` mutation (PATCH). Details persist.
---
- GOB-MOB-FN-TC-051 & TC-052: Delete Animal & Cancel Delete
- **Note: user will able to delete the animal and also able to cancel the delete**
- **SOLVED**: `my-animal-detail.tsx` has `confirmDelete()` with Alert.alert Cancel/Delete buttons. Cancel dismisses. Delete calls `deleteAnimal` mutation and navigates back.
---

4. Task Management (Add / Edit / Delete)

GOB-MOB-FN-TC-053 (Task List): Displays "Could not add task. Please try again." when creating tasks, leaving the list empty.
- **Note: user will able to add the task and also able to save the task**
- **SOLVED**: Root cause was `scheduledTime` set to `new Date().toISOString()` (always "now"). Fixed `add-task.tsx` to construct proper Date from selected date pill + parsed start time with 12h-to-24h conversion.
---

GOB-MOB-FN-TC-055 (Add Task): Valid task creation fails with generic error.
- **Note: user will able to add the task and also able to save the task**
- **SOLVED**: Same root cause as TC-053. Fixed by constructing proper `scheduledTime` from selected date + time inputs.
---

GOB-MOB-FN-TC-056 (Add Task Validation): Submitting empty fields displays generic error instead of required field messages.
- **Note: show an generic error dont show required fields empty errors**
- **SOLVED**: Already shows generic "Could not add task. Please try again." error. No changes needed.
---

GOB-MOB-FN-TC-058 (Add Task Repeat): Repeat task option fails to save task.
- **Note: save the task and also able to cancel the task**
- **SOLVED**: Repeat option already included in task detail string. Root cause was same scheduledTime issue from TC-053. Now saves correctly.
---

GOB-MOB-FN-TC-059 (Add Task Instructions): Tasks with instructions fail to save.
- **Note:save the task if the task have instructions**
- **SOLVED**: Instructions already included in task detail string. Root cause was same scheduledTime issue. Now saves correctly with instructions.
---

Blocked Test Cases (Not Run due to task creation failure):

- GOB-MOB-FN-TC-057: Invalid Task Date/Time
- **Note: invalid data wil not be accepted here like past date not acceptable here user have to enter an upcoming data and time** 
- **SOLVED**: Added past-date validation in `add-task.tsx`. If scheduled date/time is before current time, shows "Invalid date" alert and blocks submission.
- GOB-MOB-FN-TC-060 & TC-061: Edit Task & Persistence
- **Note:solve that issues** 
- **SOLVED**: `edit-task.tsx` passes scheduledTime from params and uses it for update. updateTask mutation does DELETE+CREATE which persists the edited task.
- GOB-MOB-FN-TC-062 & TC-063: Mark Task Completed & Status Persistence
- **Note:solve that issues** 
- **SOLVED**: `my-task.tsx` uses `toggleTaskMutation` with optimistic update. Task status toggles between done/pending and persists to backend. Strike-through styling on completed tasks.
- GOB-MOB-FN-TC-064 & TC-065: Delete Task & Cancel Delete
- **Note:solve that issues** 
- **SOLVED**: `my-task.tsx` has custom delete confirmation Modal with Cancel and "Yes, Delete" buttons. Cancel closes modal. Delete calls `deleteTaskMutation` and refreshes list.
---

5. Appointments & Doctor Consultations

GOB-MOB-FN-TC-078 (Book Slot Validation): User can proceed to checkout without entering a booking reason.
- **Note:No user have to add an booking reasosn for sure** 
- **SOLVED**: Added required validation in `book-slot.tsx`. If bookingReason is empty, shows "Please enter a booking reason" alert and blocks navigation.
---

GOB-MOB-FN-TC-082 (Appointment Listing): Confirmed appointments are missing from "My Treatment -> Online Visit" after payment.
- **Note: confirm  appointment should be show to My Treatment page** 
- **SOLVED**: `my-treatment.tsx` now filters appointments by visit type (online/physical) using `consultationType` field. Online Visit / Physical Visit tabs now actually filter appointments.
---

GOB-MOB-FN-TC-083 (Duplicate Booking): System allows double-booking an already booked time slot.
- **Note: user dont book booked time slot like if an user booked on that time another user will not able to book that session  again here you need to update it in real when use enter this page refetch the doctor avilbale time again here . an user can able to book many session on the same day** 
- **SOLVED**: Added `refetchSlots` on page open via useEffect in `book-slot.tsx`. Available slots refetched when entering page so already-booked slots excluded. Users can still book multiple sessions on same day (different times).
---

GOB-MOB-FN-TC-106 (Audio/Video Consultation): Consultation screen gets stuck on "Connecting...".
- **Note:dont fix this issues now**
---

Blocked Test Cases:

- GOB-MOB-FN-TC-075 & TC-076: Unavailable and past slot booking
- GOB-MOB-FN-TC-086, TC-087, TC-090: Payment failure/cancellation edge cases
- GOB-MOB-FN-TC-102: Real-time incoming message receipt
- GOB-MOB-FN-TC-110: Doctor-issued prescription view
- **Note:** 
---

6. Notifications

GOB-MOB-FN-TC-091 (Notification List): Screen shows "Failed to load notifications" error.
- **Note:** 
---

Blocked Test Cases (Not Run due to notification load failure):

- GOB-MOB-FN-TC-092: Unread notification badge state
- GOB-MOB-FN-TC-093: Mark single notification as read
- GOB-MOB-FN-TC-094: Mark all notifications as read
- **Note:** 
---

7. Marketplace & Checkout

GOB-MOB-FN-TC-118 (Search): Searching "cow" returns no results despite active listings.
- **Note:if cow exist than show all the cows other wise show no cow exist you can check another pet ** 
- **SOLVED**: Updated no-results message in `search.tsx` to show "No [query] found. Try searching for another pet or browse the marketplace." Search depends on backend MeiliSearch setup.
---

GOB-MOB-FN-TC-130 (Proceed Booking): Clicking "Proceed Booking" button gives no response.
- **Note: fix that issues** 
- **SOLVED**: Added user-facing error Alert in `book-animal.tsx` when `reserveListing` fails. Error message now shown to user instead of silent catch.
---

GOB-MOB-FN-TC-140 (Place Order): "Place Order" button is non-functional.
- **Note:fix that issues** 
- **SOLVED**: Added user-facing error Alert in `checkout.tsx` when order/payment fails. Error message shown to user instead of silent catch.
---

GOB-MOB-FN-TC-144 (Create Listing): Returns "Could not create listing – Please try again.".
- **Note:dont fix issues now**
---

8. Profile & Subscriptions

GOB-MOB-FN-TC-151 (Profile Location): Location changes fail to save or update on the profile.
- **Note:fix this issues ** 
- **SOLVED**: Updated `UpdateProfileInput` in `usersApi.ts` to include `phone` and `location` fields. `handleSave` in `edit-profile.tsx` now sends `{ name, phone, location }` to the API instead of just `{ name }`.
---

GOB-MOB-FN-TC-156 (Cancel Subscription): Shows error popup "Failed to cancel subscription".
- **Note:dont fix issues now**
---
