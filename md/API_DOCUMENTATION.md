# API Documentation

## Table of Contents

- [Base URL](#base-url)
- [Authentication](#authentication)
- [Roles](#roles)
- [1. Auth](#1-auth-rate-limited-10min)
- [2. Users](#2-users)
- [3. Addresses](#3-addresses)
- [4. Animals](#4-animals)
- [5. Doctors](#5-doctors)
- [6. Patients](#6-patients)
- [7. Clinics](#7-clinics)
- [8. Services](#8-services)
- [9. Appointments](#9-appointments)
- [10. Video Call](#10-video-call)
- [11. Products](#11-products)
- [12. Livestock](#12-livestock)
- [13. Cart](#13-cart)
- [14. Wishlist](#14-wishlist)
- [15. Orders](#15-orders)
- [16. Payments](#16-payments)
- [17. Wallet](#17-wallet)
- [18. Payment Methods](#18-payment-methods)
- [19. Discounts (User-side)](#19-discounts-user-side)
- [20. Discounts (Doctor-side)](#20-discounts-doctor-side)
- [21. Prescriptions](#21-prescriptions)
- [22. Calendar](#22-calendar)
- [23. Block Times (Time-Off)](#23-block-times-time-off)
- [24. Subscriptions](#24-subscriptions)
- [25. FAQs](#25-faqs)
- [26. Support Tickets](#26-support-tickets)
- [27. Fields](#27-fields)
- [28. Market Rates](#28-market-rates)
- [29. Badges](#29-badges)
- [30. Delivery](#30-delivery)
- [31. Chat](#31-chat)
- [32. Reviews](#32-reviews)
- [33. Referrals](#33-referrals)
- [34. AI Diagnosis](#34-ai-diagnosis)
- [35. Medical Records](#35-medical-records)
- [36. Medical Events](#36-medical-events)
- [37. Lab Tests](#37-lab-tests)
- [38. Vaccinations](#38-vaccinations)
- [39. Consultations](#39-consultations)
- [40. Alerts](#40-alerts)
- [41. Notifications](#41-notifications)
- [42. Tasks](#42-tasks-rate-limited-30min)
- [43. Search](#43-search)
- [44. Weather](#44-weather)
- [45. Health](#45-health)
- [46. Admin Auth](#46-admin-auth-admins)
- [47. Admin CRUD](#47-admin-crud-admins--roles-super_admin)
- [48. Admin Users](#48-admin-users-adminusers)
- [49. Admin Orders](#49-admin-orders-adminorders)
- [50. Admin Alerts](#50-admin-alerts-adminalerts)
- [51. Admin Notifications](#51-admin-notifications-adminnotifications)
- [52. Admin Referrals](#52-admin-referrals-adminreferrals)
- [53. Admin Discounts](#53-admin-discounts-admindiscounts)
- [54. WebSocket: ChatGateway](#54-websocket-chatgateway)
- [55. Swagger](#55-swagger)

---

## Base URL

```
http://localhost:3000
```

## Authentication

All authenticated endpoints require the following header:

```
Authorization: Bearer <token>
```

## Roles

| Role | Description |
|------|-------------|
| `USER` | Regular user (farmer, pet owner) |
| `DOCTOR` | Veterinary doctor |
| `CLINIC` | Clinic account |
| `ADMIN` | System administrator |
| `SUPER_ADMIN` | Super administrator |

---

## 1. Auth (rate limited: 10/min)

### POST `/auth/register`

Register a new user account.

- **Request Body:**
  ```json
  {
    "name": "string",
    "identifier": "string",
    "password": "string (min 8 characters)",
    "role": "USER | DOCTOR | CLINIC | ADMIN"
  }
  ```
- **Response:**
  ```json
  {
    "user": "User",
    "accessToken": "string",
    "refreshToken": "string"
  }
  ```

---

### POST `/auth/login`

Authenticate with identifier and password.

- **Request Body:**
  ```json
  {
    "identifier": "string",
    "password": "string"
  }
  ```
- **Response:**
  ```json
  {
    "user": "User",
    "accessToken": "string",
    "refreshToken": "string"
  }
  ```

---

### POST `/auth/send-otp`

Send a one-time password to a phone number.

- **Request Body:**
  ```json
  {
    "phone": "string",
    "purpose": "'login' | 'verify' | 'reset' (optional)"
  }
  ```
- **Response:**
  ```json
  {
    "success": true
  }
  ```

---

### POST `/auth/verify-otp`

Verify a one-time password.

- **Request Body:**
  ```json
  {
    "phone": "string",
    "code": "string",
    "purpose": "'login' | 'verify' | 'reset' (optional)"
  }
  ```
- **Response:**
  ```json
  {
    "user": "User",
    "accessToken": "string",
    "refreshToken": "string"
  }
  ```

---

### POST `/auth/forgot-password`

Request a password reset token.

- **Request Body:**
  ```json
  {
    "identifier": "string"
  }
  ```
- **Response:**
  ```json
  {
    "success": true
  }
  ```

---

### POST `/auth/reset-password`

Reset password using a reset token.

- **Request Body:**
  ```json
  {
    "resetToken": "string",
    "newPassword": "string (min 8 characters)"
  }
  ```
- **Response:**
  ```json
  {
    "success": true
  }
  ```

---

### POST `/auth/oauth/google`

Authenticate via Google OAuth.

- **Request Body:**
  ```json
  {
    "idToken": "string"
  }
  ```
- **Response:**
  ```json
  {
    "user": "User",
    "accessToken": "string",
    "refreshToken": "string"
  }
  ```

---

### POST `/auth/oauth/facebook`

Authenticate via Facebook OAuth.

- **Request Body:**
  ```json
  {
    "accessToken": "string"
  }
  ```
- **Response:**
  ```json
  {
    "user": "User",
    "accessToken": "string",
    "refreshToken": "string"
  }
  ```

---

### POST `/auth/refresh`

Refresh an access token.

- **Request Body:**
  ```json
  {
    "refreshToken": "string"
  }
  ```
- **Response:**
  ```json
  {
    "accessToken": "string",
    "refreshToken": "string"
  }
  ```

---

### POST `/auth/logout`

Invalidate a refresh token.

- **Request Body:**
  ```json
  {
    "refreshToken": "string"
  }
  ```
- **Response:**
  ```json
  {
    "success": true
  }
  ```

---

## 2. Users

### GET `/users/me`

Get the authenticated user's profile.

- **Roles:** Any authenticated user
- **Response:** User object (no password)

---

### PATCH `/users/me`

Update the authenticated user's profile.

- **Roles:** Any authenticated user
- **Request Body:**
  ```json
  {
    "name": "string (optional)",
    "email": "string (optional)",
    "profilePhoto": "string (optional)",
    "dateOfBirth": "string (optional)",
    "bloodGroup": "string (optional)",
    "allergies": "string (optional)",
    "emergencyContactName": "string (optional)",
    "emergencyContactPhone": "string (optional)"
  }
  ```
- **Response:** Updated User object

---

### PATCH `/users/me/language`

Update the authenticated user's language preference.

- **Roles:** Any authenticated user
- **Request Body:**
  ```json
  {
    "language": "'en' | 'bn'"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "language": "string"
  }
  ```

---

## 3. Addresses

### GET `/addresses`

Get all addresses for the authenticated user.

- **Roles:** Any authenticated user
- **Response:** `Address[]`

---

### GET `/addresses/:id`

Get a specific address by ID.

- **Roles:** Any authenticated user
- **Response:** `Address`

---

### POST `/addresses`

Create a new address.

- **Roles:** Any authenticated user
- **Request Body:**
  ```json
  {
    "label": "string",
    "contactName": "string",
    "phone": "string",
    "division": "string",
    "district": "string",
    "upazila": "string",
    "postalCode": "string",
    "latitude": "number (optional)",
    "longitude": "number (optional)",
    "isDefault": "boolean (optional)"
  }
  ```
- **Response:** Created `Address`

---

### PUT `/addresses/:id`

Update an existing address.

- **Roles:** Any authenticated user
- **Request Body:** Same as POST, all fields optional
- **Response:** Updated `Address`

---

### DELETE `/addresses/:id`

Delete an address.

- **Roles:** Any authenticated user
- **Response:** void

---

## 4. Animals

### GET `/animals`

Get all animals for the authenticated user.

- **Roles:** Any authenticated user
- **Query Params:**
  - `page` (optional) — page number
  - `limit` (optional) — items per page
  - `breed` (optional) — filter by breed
- **Response:** `Animal[]` or `PaginatedResult<Animal>`

---

### GET `/animals/:id`

Get a specific animal by ID.

- **Roles:** Any authenticated user
- **Response:** `Animal`

---

### POST `/animals`

Create a new animal record.

- **Roles:** Any authenticated user
- **Request Body:**
  ```json
  {
    "name": "string",
    "breed": "string",
    "weight": "number",
    "age": "number",
    "color": "string",
    "image": "string (optional)",
    "description": "string (optional)",
    "dob": "string (optional)",
    "gender": "string (optional)",
    "source": "string (optional)",
    "joinedFarm": "string (optional)",
    "liveWeight": "number (optional)",
    "reproStatus": "string (optional)",
    "photos": "array (optional)",
    "photoCost": "number (optional)",
    "sellingPrice": "number (optional)",
    "liveWeightPrice": "number (optional)"
  }
  ```
- **Response:** Created `Animal`

---

### PATCH `/animals/:id`

Update an existing animal record.

- **Roles:** Any authenticated user
- **Request Body:** Same as POST, all fields optional
- **Response:** Updated `Animal`

---

### DELETE `/animals/:id`

Delete an animal record.

- **Roles:** Any authenticated user
- **Response:**
  ```json
  {
    "success": true
  }
  ```

---

## 5. Doctors

### GET `/doctors`

Get all doctors.

- **Roles:** Public
- **Query Params:**
  - `page` (optional) — page number
  - `limit` (optional) — items per page
  - `specialty` (optional) — filter by specialty
- **Response:** `Doctor[]` or `PaginatedResult<Doctor>`

---

### GET `/doctors/me`

Get the authenticated doctor's profile.

- **Roles:** `DOCTOR`
- **Response:** `Doctor`

---

### GET `/doctors/me/dashboard-stats`

Get dashboard statistics for the authenticated doctor.

- **Roles:** `DOCTOR`
- **Response:**
  ```json
  {
    "totalPatients": "number",
    "totalConsultations": "number",
    "yearsOfExperience": "number",
    "specializations": ["string"],
    "qualifications": ["string"],
    "consultationFee": "number",
    "rating": "number"
  }
  ```

---

### PATCH `/doctors/me/qualifications`

Update the authenticated doctor's qualifications.

- **Roles:** `DOCTOR`
- **Request Body:**
  ```json
  {
    "qualifications": ["string"]
  }
  ```
- **Response:** Updated `Doctor`

---

### PATCH `/doctors/me/specializations`

Update the authenticated doctor's specializations.

- **Roles:** `DOCTOR`
- **Request Body:**
  ```json
  {
    "specializations": ["string"]
  }
  ```
- **Response:** Updated `Doctor`

---

### PATCH `/doctors/me/experiences`

Update the authenticated doctor's work experiences.

- **Roles:** `DOCTOR`
- **Request Body:**
  ```json
  {
    "experiences": [
      {
        "title": "string",
        "organization": "string",
        "duration": "string",
        "description": "string (optional)"
      }
    ]
  }
  ```
- **Response:** Updated `Doctor`

---

### GET `/doctors/:id`

Get a specific doctor by ID.

- **Roles:** Public
- **Response:** `Doctor`

---

### GET `/doctors/:id/availability`

Get availability slots for a specific doctor.

- **Roles:** Public
- **Response:** `Availability[]`

---

### POST `/doctors/:id/availability`

Create availability entries for a doctor.

- **Roles:** `DOCTOR`
- **Request Body:**
  ```json
  {
    "entries": [
      {
        "dayOfWeek": "number (0-6)",
        "startTime": "string",
        "endTime": "string",
        "slotDurationMinutes": "number (optional)",
        "bufferMinutes": "number (optional)"
      }
    ]
  }
  ```
- **Response:** `Availability[]`

---

### PATCH `/doctors/:id/availability/:dayId`

Update a specific availability entry.

- **Roles:** `DOCTOR`
- **Request Body:**
  ```json
  {
    "startTime": "string (optional)",
    "endTime": "string (optional)",
    "slotDurationMinutes": "number (optional)",
    "bufferMinutes": "number (optional)",
    "isActive": "boolean (optional)",
    "specificDate": "string (optional)",
    "isAvailable": "boolean (optional)",
    "overrideSlots": "boolean (optional)"
  }
  ```
- **Response:** Updated `Availability`

---

### GET `/doctors/:id/schedule`

Get the schedule for a specific doctor.

- **Roles:** Public
- **Query Params:**
  - `date` (optional) — filter by date
  - `consultationType` (optional) — filter by consultation type
  - `status` (optional) — filter by status
  - `month` (optional) — month number
  - `year` (optional) — year number
- **Response:**
  ```json
  {
    "appointments": ["Appointment"],
    "blockTimes": ["DoctorTimeOff"]
  }
  ```

---

### GET `/doctors/:id/schedule/list`

Get a list of appointments for a specific doctor sorted chronologically.

- **Roles:** Public
- **Query Params:**
  - `month` (optional) — month number
  - `year` (optional) — year number
- **Response:** `Appointment[]` (sorted ASC by startAt)

---

## 6. Patients

### GET `/patients`

Get all patients (with owner info).

- **Roles:** `DOCTOR`, `ADMIN`
- **Query Params:**
  - `page` (optional) — page number
  - `limit` (optional) — items per page
  - `search` (optional) — search term
- **Response:** `PaginatedResult<PatientWithOwner>`

---

### GET `/patients/:id`

Get a specific patient with owner info.

- **Roles:** `DOCTOR`, `ADMIN`
- **Response:** `PatientWithOwner`

---

## 7. Clinics

### GET `/clinics`

Get all clinics.

- **Roles:** Public
- **Query Params:**
  - `page` (optional) — page number
  - `limit` (optional) — items per page
- **Response:** `Clinic[]` or `PaginatedResult<Clinic>`

---

### GET `/clinics/:id`

Get a specific clinic by ID.

- **Roles:** Public
- **Response:** `Clinic`

---

### POST `/clinics`

Create a new clinic.

- **Roles:** `CLINIC`, `ADMIN`
- **Request Body:**
  ```json
  {
    "name": "string",
    "location": "string",
    "description": "string",
    "businessHours": "object (optional)",
    "avatar": "string (optional)"
  }
  ```
- **Response:** Created `Clinic`

---

### PUT `/clinics/:id`

Update an existing clinic.

- **Roles:** `CLINIC`, `ADMIN`
- **Request Body:** Same as POST, all fields optional
- **Response:** Updated `Clinic`

---

### PATCH `/clinics/:id/verify`

Toggle verification status for a clinic.

- **Roles:** `ADMIN`
- **Request Body:**
  ```json
  {
    "isVerified": "boolean"
  }
  ```
- **Response:** Updated `Clinic`

---

### POST `/clinics/:id/doctors`

Add a doctor to a clinic.

- **Roles:** `CLINIC`, `ADMIN`
- **Request Body:**
  ```json
  {
    "doctorId": "number"
  }
  ```
- **Response:** Updated `Clinic`

---

### DELETE `/clinics/:id/doctors/:doctorId`

Remove a doctor from a clinic.

- **Roles:** `CLINIC`, `ADMIN`
- **Response:** Updated `Clinic`

---

## 8. Services

### GET `/services`

Get all services.

- **Roles:** Public
- **Query Params:**
  - `providerType` (optional) — filter by provider type
  - `providerId` (optional) — filter by provider ID
- **Response:** `Service[]`

---

### GET `/services/:id`

Get a specific service by ID.

- **Roles:** Public
- **Response:** `Service`

---

### POST `/services`

Create a new service.

- **Roles:** `DOCTOR`, `CLINIC`, `ADMIN`
- **Request Body:**
  ```json
  {
    "providerType": "string",
    "providerId": "number",
    "name": "string",
    "description": "string",
    "durationMinutes": "number (>= 5)",
    "price": "number (>= 0)",
    "preparationInstructions": "string (optional)",
    "requirements": "string (optional)",
    "isOnline": "boolean (optional)",
    "isOffline": "boolean (optional)",
    "location": "string (optional)",
    "cancellationPolicy": "string (optional)",
    "isRecurring": "boolean (optional)"
  }
  ```
- **Response:** Created `Service`

---

### PUT `/services/:id`

Update an existing service.

- **Roles:** `DOCTOR`, `CLINIC`, `ADMIN`
- **Request Body:** Same as POST, all fields optional
- **Response:** Updated `Service`

---

### DELETE `/services/:id`

Delete a service.

- **Roles:** `DOCTOR`, `CLINIC`, `ADMIN`
- **Response:** void

---

## 9. Appointments

### GET `/doctors/:id/slots`

Get available time slots for a specific date.

- **Roles:** Any authenticated user
- **Query Params:**
  - `date` (required) — format YYYY-MM-DD
- **Response:** `string[]` (array of time slot strings)

---

### POST `/doctors/book`

Book an appointment with a doctor.

- **Roles:** `USER`
- **Request Body:**
  ```json
  {
    "doctorId": "number",
    "date": "string",
    "time": "string",
    "clinicId": "number (optional)",
    "serviceId": "number (optional)",
    "animalId": "number (optional)",
    "consultationType": "string (optional)",
    "reasonForConsultation": "string (optional)",
    "symptoms": "string (optional)"
  }
  ```
- **Response:** Created `Appointment`

---

### GET `/doctors/bookings/all`

Get all bookings for the authenticated doctor.

- **Roles:** `DOCTOR`
- **Query Params:**
  - `filter` (optional) — `today`, `previous`, `upcoming`, `completed`, `cancelled`
  - `consultationType` (optional) — filter by consultation type
  - `search` (optional) — search term
  - `page` (optional) — page number
  - `limit` (optional) — items per page
- **Response:** `AppointmentWithPatient[]`

---

### GET `/doctors/bookings/:id`

Get a specific booking by ID.

- **Roles:** `DOCTOR`
- **Response:** `AppointmentWithPatient`

---

### GET `/doctors/bookings/stats/today`

Get today's booking statistics.

- **Roles:** `DOCTOR`
- **Response:**
  ```json
  {
    "totalToday": "number",
    "completedToday": "number"
  }
  ```

---

### GET `/doctors/bookings/search`

Search bookings with filters.

- **Roles:** `DOCTOR`
- **Query Params:**
  - `search` (optional) — search term
  - `date` (optional) — filter by date
  - `consultationType` (optional) — filter by consultation type
  - `page` (optional) — page number
  - `limit` (optional) — items per page
- **Response:** `AppointmentWithPatient[]`

---

### GET `/doctors/bookings/recent-completed`

Get recently completed bookings.

- **Roles:** `DOCTOR`
- **Query Params:**
  - `days` (optional) — number of days, default 2
- **Response:** `AppointmentWithPatient[]`

---

### PATCH `/doctors/bookings/:id/reschedule`

Reschedule an appointment.

- **Roles:** `DOCTOR`
- **Request Body:**
  ```json
  {
    "date": "string",
    "time": "string"
  }
  ```
- **Response:** Updated `Appointment`

---

### PATCH `/doctors/bookings/:id/cancel`

Cancel an appointment.

- **Roles:** `DOCTOR`
- **Request Body:**
  ```json
  {
    "reason": "string",
    "note": "string (optional)"
  }
  ```
- **Response:**
  ```json
  {
    "appointment": "Appointment",
    "walletDeduction": "number",
    "cancellationFee": "number",
    "refundAmount": "number"
  }
  ```

---

### PATCH `/doctors/bookings/:id/complete`

Mark an appointment as completed.

- **Roles:** `DOCTOR`
- **Response:** Updated `Appointment`

---

### PATCH `/doctors/bookings/:id/start-consultation`

Start a consultation for an appointment.

- **Roles:** `DOCTOR`
- **Request Body:**
  ```json
  {
    "consultationNotes": "string (optional)"
  }
  ```
- **Response:** Updated `Appointment`

---

### POST `/doctors/bookings/:id/join`

Join a video call for an appointment.

- **Roles:** Any authenticated user
- **Response:**
  ```json
  {
    "token": "string",
    "channelName": "string"
  }
  ```

---

## 10. Video Call

### POST `/video-call/create`

Create a video call session for an appointment.

- **Roles:** `DOCTOR`
- **Request Body:**
  ```json
  {
    "appointmentId": "number"
  }
  ```
- **Response:**
  ```json
  {
    "sessionId": "string",
    "channelName": "string"
  }
  ```

---

### POST `/video-call/join/:appointmentId`

Join an existing video call session.

- **Roles:** Any authenticated user
- **Response:**
  ```json
  {
    "sessionId": "string",
    "channelName": "string",
    "token": "string"
  }
  ```

---

### POST `/video-call/end/:appointmentId`

End a video call session.

- **Roles:** `DOCTOR`
- **Response:**
  ```json
  {
    "success": true
  }
  ```

---

### GET `/video-call/token/:appointmentId`

Get a token to join an existing video call.

- **Roles:** Any authenticated user
- **Response:**
  ```json
  {
    "sessionId": "string",
    "channelName": "string",
    "token": "string"
  }
  ```

---

## 11. Products

### GET `/products`

Get all products.

- **Roles:** Public
- **Query Params:**
  - `page` (optional) — page number
  - `limit` (optional) — items per page
  - `categoryId` (optional) — filter by category
  - `brandId` (optional) — filter by brand
- **Response:** `Product[]`

---

### GET `/products/categories`

Get all product categories.

- **Roles:** Public
- **Response:** `Category[]`

---

### POST `/products/categories`

Create a new product category.

- **Roles:** `ADMIN`
- **Request Body:**
  ```json
  {
    "name": "string",
    "slug": "string",
    "description": "string (optional)"
  }
  ```
- **Response:** Created `Category`

---

### GET `/products/brands`

Get all product brands.

- **Roles:** Public
- **Response:** `Brand[]`

---

### POST `/products/brands`

Create a new product brand.

- **Roles:** `ADMIN`
- **Request Body:**
  ```json
  {
    "name": "string",
    "slug": "string",
    "description": "string (optional)"
  }
  ```
- **Response:** Created `Brand`

---

### GET `/products/search`

Search products.

- **Roles:** Public
- **Query Params:**
  - `q` (required) — search query
  - `categoryId` (optional) — filter by category
- **Response:** `Product[]`

---

### GET `/products/:id`

Get a specific product by ID.

- **Roles:** Public
- **Response:** `Product`

---

### POST `/products`

Create a new product.

- **Roles:** `ADMIN`
- **Request Body:**
  ```json
  {
    "sku": "string",
    "barcode": "string (optional)",
    "name": "string",
    "description": "string",
    "price": "number",
    "discount": "number (optional)",
    "brandId": "number (optional)",
    "categoryId": "number (optional)",
    "specifications": "object (optional)",
    "instructions": "string (optional)",
    "images": "string[] (optional)",
    "videos": "string[] (optional)",
    "documents": "string[] (optional)",
    "seoTitle": "string (optional)",
    "seoDescription": "string (optional)",
    "seoKeywords": "string[] (optional)",
    "status": "string (optional)",
    "visibility": "string (optional)",
    "isPrescriptionRequired": "boolean (optional)"
  }
  ```
- **Response:** Created `Product`

---

### PUT `/products/:id`

Update an existing product.

- **Roles:** `ADMIN`
- **Request Body:** Same as POST, all fields optional
- **Response:** Updated `Product`

---

### DELETE `/products/:id`

Delete a product.

- **Roles:** `ADMIN`
- **Response:** void

---

### GET `/products/:id/stock`

Get stock quantity for a product.

- **Roles:** Public
- **Response:**
  ```json
  {
    "productId": "number",
    "stock": "number"
  }
  ```

---

### POST `/products/:id/stock`

Add stock for a product.

- **Roles:** `ADMIN`
- **Request Body:**
  ```json
  {
    "quantity": "number",
    "batchNumber": "string (optional)",
    "expiryDate": "string (optional)"
  }
  ```
- **Response:**
  ```json
  {
    "success": true
  }
  ```

---

## 12. Livestock

### GET `/livestock`

Get all livestock listings.

- **Roles:** Public
- **Query Params:**
  - `page` (optional) — page number
  - `limit` (optional) — items per page
  - `species` (optional) — filter by species
  - `breed` (optional) — filter by breed
- **Response:** `Livestock[]`

---

### GET `/livestock/featured`

Get featured livestock listings.

- **Roles:** Public
- **Response:** `Livestock[]`

---

### GET `/livestock/search`

Search livestock listings.

- **Roles:** Public
- **Query Params:**
  - `q` (required) — search query
  - `species` (optional) — filter by species
- **Response:** `Livestock[]`

---

### GET `/livestock/my`

Get the authenticated user's livestock listings.

- **Roles:** Any authenticated user
- **Response:** `Livestock[]`

---

### GET `/livestock/:id`

Get a specific livestock listing by ID.

- **Roles:** Public
- **Response:** `Livestock`

---

### POST `/livestock`

Create a new livestock listing.

- **Roles:** Any authenticated user
- **Request Body:**
  ```json
  {
    "species": "string",
    "breed": "string",
    "age": "number",
    "weight": "number",
    "gender": "string",
    "vaccinationHistory": "string (optional)",
    "medicalHistory": "string (optional)",
    "healthStatus": "string",
    "pregnancyStatus": "string (optional)",
    "certification": "string (optional)",
    "farmName": "string",
    "location": "string",
    "images": "string[] (optional)",
    "videos": "string[] (optional)",
    "documents": "string[] (optional)",
    "price": "number",
    "isNegotiable": "boolean (optional)",
    "status": "string (optional)"
  }
  ```
- **Response:** Created `Livestock`

---

### PUT `/livestock/:id`

Update an existing livestock listing.

- **Roles:** Any authenticated user
- **Request Body:** Same as POST, all fields optional
- **Response:** Updated `Livestock`

---

### DELETE `/livestock/:id`

Delete a livestock listing.

- **Roles:** Any authenticated user
- **Response:** void

---

### PATCH `/livestock/:id/verify`

Toggle verification status for a livestock listing.

- **Roles:** `ADMIN`
- **Request Body:**
  ```json
  {
    "isVerified": "boolean"
  }
  ```
- **Response:** Updated `Livestock`

---

### PATCH `/livestock/:id/feature`

Toggle featured status for a livestock listing.

- **Roles:** `ADMIN`
- **Request Body:**
  ```json
  {
    "isFeatured": "boolean"
  }
  ```
- **Response:** Updated `Livestock`

---

### PATCH `/livestock/:id/reserve`

Toggle reservation status for a livestock listing.

- **Roles:** Any authenticated user
- **Request Body:**
  ```json
  {
    "isReserved": "boolean"
  }
  ```
- **Response:** Updated `Livestock`

---

### PATCH `/livestock/:id/sold`

Toggle sold status for a livestock listing.

- **Roles:** Any authenticated user
- **Request Body:**
  ```json
  {
    "isSold": "boolean"
  }
  ```
- **Response:** Updated `Livestock`

---

## 13. Cart

### GET `/cart`

Get the authenticated user's cart summary.

- **Roles:** Any authenticated user
- **Response:** `CartSummary`

---

### POST `/cart/add`

Add an item to the cart.

- **Roles:** Any authenticated user
- **Request Body:**
  ```json
  {
    "productId": "number (optional)",
    "livestockId": "number (optional)",
    "quantity": "number (optional)"
  }
  ```
- **Response:** `CartItem`

---

### PUT `/cart/item/:id`

Update cart item quantity.

- **Roles:** Any authenticated user
- **Request Body:**
  ```json
  {
    "quantity": "number (>= 1)"
  }
  ```
- **Response:** Updated `CartItem`

---

### DELETE `/cart/item/:id`

Remove an item from the cart.

- **Roles:** Any authenticated user
- **Response:** void

---

### DELETE `/cart`

Clear the entire cart.

- **Roles:** Any authenticated user
- **Response:** void

---

## 14. Wishlist

### GET `/wishlist`

Get the authenticated user's wishlist.

- **Roles:** Any authenticated user
- **Response:** `WishlistItem[]`

---

### POST `/wishlist`

Add an item to the wishlist.

- **Roles:** Any authenticated user
- **Request Body:**
  ```json
  {
    "productId": "number (optional)",
    "livestockId": "number (optional)"
  }
  ```
- **Response:** `WishlistItem`

---

### DELETE `/wishlist/:id`

Remove an item from the wishlist.

- **Roles:** Any authenticated user
- **Response:** void

---

## 15. Orders

### POST `/orders`

Place a new order.

- **Roles:** Any authenticated user
- **Request Body:**
  ```json
  {
    "addressId": "number",
    "deliveryMethod": "string",
    "deliveryNotes": "string (optional)"
  }
  ```
- **Response:** Created `Order`

---

### GET `/orders/my`

Get all orders for the authenticated user.

- **Roles:** Any authenticated user
- **Response:** `Order[]`

---

### GET `/orders/:id`

Get a specific order by ID.

- **Roles:** Any authenticated user
- **Response:** `Order`

---

### GET `/orders/admin`

Get all orders (admin view).

- **Roles:** `ADMIN`
- **Query Params:**
  - `page` (optional) — page number
  - `limit` (optional) — items per page
  - `status` (optional) — filter by status
- **Response:** `Order[]`

---

### PATCH `/orders/:id/status`

Update order status.

- **Roles:** `ADMIN`
- **Request Body:**
  ```json
  {
    "status": "PENDING | CONFIRMED | PREPARING | PACKED | SHIPPED | DELIVERED | COMPLETED | CANCELLED | REFUNDED | RETURNED | FAILED"
  }
  ```
- **Response:** Updated `Order`

---

## 16. Payments

### POST `/payments/intent`

Create a payment intent.

- **Roles:** Any authenticated user
- **Request Body:**
  ```json
  {
    "amount": "number (>= 1)",
    "orderId": "number (optional)",
    "bookingId": "number (optional)",
    "provider": "string (optional)"
  }
  ```
- **Response:** `Transaction`

---

### GET `/payments/verify/:transactionId`

Verify a transaction status.

- **Roles:** Any authenticated user
- **Response:** `Transaction`

---

### POST `/payments/simulate-success`

Simulate a successful payment (for testing).

- **Roles:** Any authenticated user
- **Request Body:**
  ```json
  {
    "transactionId": "number",
    "gatewayTxId": "string (optional)"
  }
  ```
- **Response:** `Transaction`

---

### POST `/payments/simulate-fail`

Simulate a failed payment (for testing).

- **Roles:** Any authenticated user
- **Request Body:**
  ```json
  {
    "transactionId": "number"
  }
  ```
- **Response:** `Transaction`

---

## 17. Wallet

### GET `/wallet`

Get the authenticated user's wallet balance.

- **Roles:** Any authenticated user
- **Response:**
  ```json
  {
    "balance": "number",
    "coins": "number"
  }
  ```

---

### GET `/wallet/transactions`

Get paginated wallet transactions.

- **Roles:** Any authenticated user
- **Query Params:**
  - `page` (optional) — page number
  - `limit` (optional) — items per page
- **Response:** `PaginatedResult<WalletTransaction>`

---

### POST `/wallet/topup`

Top up wallet balance.

- **Roles:** Any authenticated user
- **Request Body:**
  ```json
  {
    "amount": "number (>= 0.01)",
    "method": "string"
  }
  ```
- **Response:**
  ```json
  {
    "balance": "number",
    "coins": "number"
  }
  ```

---

### POST `/wallet/pay`

Make a payment from wallet balance.

- **Roles:** Any authenticated user
- **Request Body:**
  ```json
  {
    "amount": "number (>= 0.01)",
    "appointmentId": "number (optional)",
    "reason": "string"
  }
  ```
- **Response:**
  ```json
  {
    "balance": "number",
    "coins": "number"
  }
  ```

---

### POST `/wallet/earn-coins`

Earn coins (e.g., referral bonus).

- **Roles:** Any authenticated user
- **Request Body:**
  ```json
  {
    "amount": "number (>= 1)",
    "reason": "string"
  }
  ```
- **Response:**
  ```json
  {
    "balance": "number",
    "coins": "number"
  }
  ```

---

### POST `/wallet/spend-coins`

Spend coins.

- **Roles:** Any authenticated user
- **Request Body:**
  ```json
  {
    "amount": "number (>= 1)",
    "reason": "string"
  }
  ```
- **Response:**
  ```json
  {
    "balance": "number",
    "coins": "number"
  }
  ```

---

## 18. Payment Methods

### GET `/payment-methods`

Get all payment methods for the authenticated user.

- **Roles:** Any authenticated user
- **Response:** `PaymentMethod[]`

---

### POST `/payment-methods`

Add a new payment method.

- **Roles:** Any authenticated user
- **Request Body:**
  ```json
  {
    "type": "'bkash' | 'card' | 'nagad' | 'rocket'",
    "maskedNumber": "string (optional)",
    "provider": "string (optional)"
  }
  ```
- **Response:** Created `PaymentMethod`

---

### PUT `/payment-methods/:id`

Update a payment method.

- **Roles:** Any authenticated user
- **Request Body:**
  ```json
  {
    "maskedNumber": "string (optional)",
    "provider": "string (optional)"
  }
  ```
- **Response:** Updated `PaymentMethod`

---

### DELETE `/payment-methods/:id`

Delete a payment method.

- **Roles:** Any authenticated user
- **Response:**
  ```json
  {
    "success": true
  }
  ```

---

### PATCH `/payment-methods/:id/default`

Set a payment method as default.

- **Roles:** Any authenticated user
- **Response:** Updated `PaymentMethod`

---

### POST `/payment-methods/:id/verify-otp`

Verify a payment method with OTP.

- **Roles:** Any authenticated user
- **Request Body:**
  ```json
  {
    "otp": "string"
  }
  ```
- **Response:** Updated `PaymentMethod`

---

## 19. Discounts (User-side)

### GET `/discounts/available`

Get all available discounts for the authenticated user.

- **Roles:** Any authenticated user
- **Response:** `Discount[]`

---

### POST `/discounts/validate`

Validate a discount code.

- **Roles:** Any authenticated user
- **Request Body:**
  ```json
  {
    "code": "string"
  }
  ```
- **Response:** `Discount`

---

### POST `/discounts/apply`

Apply a discount code to an appointment.

- **Roles:** Any authenticated user
- **Request Body:**
  ```json
  {
    "code": "string",
    "appointmentId": "number"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "discountPercent": "number"
  }
  ```

---

### GET `/discounts/my`

Get the authenticated user's discounts.

- **Roles:** Any authenticated user
- **Response:** `Discount[]`

---

## 20. Discounts (Doctor-side)

### GET `/doctors/me/patients`

Get patients for the authenticated doctor.

- **Roles:** `DOCTOR`
- **Query Params:**
  - `search` (optional) — search term
  - `discountGiven` (optional) — filter by discount given status
- **Response:** `DoctorPatient[]`

---

### GET `/discounts/:patientId`

Get discount for a specific patient.

- **Roles:** `DOCTOR`
- **Response:** `PatientDiscount | null`

---

### POST `/discounts`

Create a new patient discount.

- **Roles:** `DOCTOR`
- **Request Body:**
  ```json
  {
    "patientId": "number",
    "percent": "number (0-100)"
  }
  ```
- **Response:** `PatientDiscount`

---

### PUT `/discounts/:id`

Update a patient discount.

- **Roles:** `DOCTOR`
- **Request Body:**
  ```json
  {
    "percent": "number (0-100)"
  }
  ```
- **Response:** Updated `PatientDiscount`

---

### DELETE `/discounts/:id`

Delete a patient discount.

- **Roles:** `DOCTOR`
- **Response:**
  ```json
  {
    "success": true
  }
  ```

---

## 21. Prescriptions

### POST `/prescriptions`

Create a new prescription.

- **Roles:** `DOCTOR`
- **Request Body:**
  ```json
  {
    "appointmentId": "number",
    "animalId": "number",
    "medicines": [
      {
        "name": "string",
        "dosage": "string (optional)",
        "quantity": "number (optional)",
        "frequency": "string (optional)",
        "duration": "string (optional)",
        "instructions": "string (optional)",
        "notes": "string (optional)"
      }
    ]
  }
  ```
- **Response:** `Prescription`

---

### GET `/prescriptions/by-appointment/:appointmentId`

Get prescription for a specific appointment.

- **Roles:** Any authenticated user
- **Response:** `Prescription | null`

---

### GET `/prescriptions/:appointmentId`

Alias for `GET /prescriptions/by-appointment/:appointmentId`.

- **Roles:** Any authenticated user
- **Response:** `Prescription | null`

---

### GET `/prescriptions/by-animal/:animalId`

Get all prescriptions for a specific animal.

- **Roles:** Any authenticated user
- **Response:** `Prescription[]`

---

### GET `/prescriptions/animal/:animalId`

Alias for `GET /prescriptions/by-animal/:animalId`.

- **Roles:** Any authenticated user
- **Response:** `Prescription[]`

---

### PUT `/prescriptions/:id`

Update an existing prescription.

- **Roles:** `DOCTOR`
- **Request Body:**
  ```json
  {
    "medicines": [
      {
        "name": "string",
        "dosage": "string (optional)",
        "quantity": "number (optional)",
        "frequency": "string (optional)",
        "duration": "string (optional)",
        "instructions": "string (optional)",
        "notes": "string (optional)"
      }
    ]
  }
  ```
- **Response:** Updated `Prescription`

---

### POST `/prescriptions/:id/attachment`

Upload an attachment for a prescription.

- **Roles:** `DOCTOR`
- **Request:** `multipart/form-data` with `file` field
- **Response:** Updated `Prescription`

---

### POST `/prescriptions/:id/send`

Send a prescription to the patient.

- **Roles:** `DOCTOR`
- **Response:** Updated `Prescription`

---

## 22. Calendar

### GET `/calendar/doctor/:doctorId`

Get monthly calendar data for a doctor.

- **Roles:** Any authenticated user
- **Query Params:**
  - `month` (required) — month number
  - `year` (required) — year number
- **Response:**
  ```json
  {
    "days": [
      {
        "date": "string",
        "appointments": [],
        "blockTimes": []
      }
    ]
  }
  ```

---

### GET `/calendar/doctor/:doctorId/week`

Get weekly calendar data for a doctor.

- **Roles:** Any authenticated user
- **Query Params:**
  - `date` (required) — format YYYY-MM-DD
- **Response:** Same structure as monthly calendar

---

### GET `/calendar/appointments`

Get appointments calendar view.

- **Roles:** Any authenticated user
- **Query Params:**
  - `date` (required) — filter by date
  - `view` (required) — `day`, `week`, or `month`
- **Response:**
  ```json
  {
    "appointments": [
      {
        "date": "string",
        "items": []
      }
    ]
  }
  ```

---

### GET `/calendar/badges`

Get calendar badge counts.

- **Roles:** Any authenticated user
- **Query Params:**
  - `month` (required) — month number
  - `year` (required) — year number
- **Response:**
  ```json
  {
    "badges": {
      "YYYY-MM-DD": "number"
    },
    "totalAppointments": "number",
    "openDays": "number",
    "blockedDays": "number"
  }
  ```

---

## 23. Block Times (Time-Off)

### GET `/doctors/:id/block-times`

Get all block time entries for a doctor.

- **Roles:** Any authenticated user
- **Response:** `DoctorTimeOff[]`

---

### POST `/doctors/:id/block-times`

Create a block time entry for a doctor.

- **Roles:** `DOCTOR`
- **Request Body:**
  ```json
  {
    "startDate": "string",
    "endDate": "string",
    "reason": "TimeOffReason",
    "note": "string (optional)",
    "force": "boolean (optional)"
  }
  ```
- **Response:** `CreateTimeOffResult` (201 Created or 409 Conflict)

---

### DELETE `/doctors/:id/block-times/:blockId`

Delete a block time entry.

- **Roles:** `DOCTOR`
- **Response:**
  ```json
  {
    "success": true
  }
  ```

---

### GET `/doctors/:id/block-times/calculate-fee`

Calculate cancellation fee for an appointment.

- **Roles:** Any authenticated user
- **Query Params:**
  - `appointmentId` (required) — appointment ID
- **Response:**
  ```json
  {
    "cancellationFee": "number",
    "refundAmount": "number"
  }
  ```

---

## 24. Subscriptions

### GET `/subscriptions/plans`

Get all available subscription plans.

- **Roles:** Public
- **Response:** `SubscriptionPlan[]`

---

### GET `/subscriptions/my`

Get the authenticated user's current subscription.

- **Roles:** Any authenticated user
- **Response:** `UserSubscription | null`

---

### POST `/subscriptions/subscribe`

Subscribe to a plan.

- **Roles:** Any authenticated user
- **Request Body:**
  ```json
  {
    "planId": "number",
    "paymentMethodId": "number"
  }
  ```
- **Response:** `UserSubscription`

---

### POST `/subscriptions/cancel`

Cancel the current subscription.

- **Roles:** Any authenticated user
- **Response:** `UserSubscription`

---

### GET `/subscriptions/admin/all`

Get all subscriptions (admin view).

- **Roles:** `ADMIN`
- **Response:** `UserSubscription[]`

---

### GET `/admin/subscriptions`

Get all subscriptions (admin view, alternative route).

- **Roles:** `ADMIN`
- **Response:** `UserSubscription[]`

---

## 25. FAQs

### GET `/faqs`

Get all FAQs.

- **Roles:** Public
- **Query Params:**
  - `category` (optional) — filter by category
- **Response:** `Faq[]`

---

### GET `/faqs/:id`

Get a specific FAQ by ID.

- **Roles:** Public
- **Response:** `Faq`

---

### POST `/admin/faqs`

Create a new FAQ.

- **Roles:** `ADMIN`
- **Request Body:**
  ```json
  {
    "question": "string",
    "answer": "string",
    "category": "string (optional)",
    "order": "number (optional)"
  }
  ```
- **Response:** Created `Faq`

---

### PUT `/admin/faqs/:id`

Update an existing FAQ.

- **Roles:** `ADMIN`
- **Request Body:** Same as POST, all fields optional
- **Response:** Updated `Faq`

---

### DELETE `/admin/faqs/:id`

Delete an FAQ.

- **Roles:** `ADMIN`
- **Response:**
  ```json
  {
    "success": true
  }
  ```

---

## 26. Support Tickets

### POST `/support/tickets`

Create a new support ticket.

- **Roles:** Any authenticated user
- **Request Body:**
  ```json
  {
    "subject": "string (max 200 characters)",
    "message": "string (optional)"
  }
  ```
- **Response:** `SupportTicket`

---

### GET `/support/tickets`

Get all support tickets for the authenticated user.

- **Roles:** Any authenticated user
- **Response:** `SupportTicket[]`

---

### GET `/support/tickets/:id`

Get a specific support ticket by ID.

- **Roles:** Any authenticated user
- **Response:** `SupportTicket`

---

### POST `/support/tickets/:id/reply`

Reply to a support ticket.

- **Roles:** Any authenticated user
- **Request Body:**
  ```json
  {
    "message": "string"
  }
  ```
- **Response:** `SupportTicketReply`

---

### GET `/admin/support/tickets`

Get all support tickets (admin view).

- **Roles:** `ADMIN`
- **Response:** `SupportTicket[]`

---

### PATCH `/admin/support/tickets/:id`

Update support ticket status.

- **Roles:** `ADMIN`
- **Request Body:**
  ```json
  {
    "status": "'open' | 'in-progress' | 'closed'"
  }
  ```
- **Response:** Updated `SupportTicket`

---

## 27. Fields

### GET `/fields`

Get all fields for the authenticated user.

- **Roles:** Any authenticated user
- **Response:** `Field[]`

---

### POST `/fields`

Create a new field.

- **Roles:** Any authenticated user
- **Request Body:**
  ```json
  {
    "name": "string (max 100 characters)",
    "sizeAcres": "number",
    "cropType": "string (optional)",
    "location": "string (optional)"
  }
  ```
- **Response:** Created `Field`

---

### PUT `/fields/:id`

Update an existing field.

- **Roles:** Any authenticated user
- **Request Body:** Same as POST, all fields optional
- **Response:** Updated `Field`

---

### DELETE `/fields/:id`

Delete a field.

- **Roles:** Any authenticated user
- **Response:**
  ```json
  {
    "success": true
  }
  ```

---

## 28. Market Rates

### GET `/market-rates`

Get all market rates.

- **Roles:** Public
- **Response:** `MarketRate[]`

---

### GET `/market-rates/history`

Get market rate history.

- **Roles:** Public
- **Query Params:**
  - `commodity` (optional) — filter by commodity
- **Response:** `MarketRate[]`

---

### POST `/admin/market-rates`

Create a new market rate entry.

- **Roles:** `ADMIN`
- **Request Body:**
  ```json
  {
    "commodity": "string (max 100 characters)",
    "price": "number",
    "unit": "string",
    "date": "string",
    "region": "string (optional)"
  }
  ```
- **Response:** Created `MarketRate`

---

## 29. Badges

### GET `/badges/available`

Get all available badges.

- **Roles:** Public
- **Response:** `Badge[]`

---

### GET `/badges/me`

Get badges earned by the authenticated user.

- **Roles:** Any authenticated user
- **Response:** `Badge[]` (with `earnedAt` timestamp)

---

## 30. Delivery

### GET `/delivery/track/:trackingNumber`

Track a delivery by tracking number.

- **Roles:** Any authenticated user
- **Response:** `Delivery`

---

### GET `/delivery/order/:orderId`

Get delivery info for a specific order.

- **Roles:** Any authenticated user
- **Response:** `Delivery`

---

### POST `/delivery/order/:orderId`

Create a delivery for an order.

- **Roles:** `ADMIN`
- **Request Body:**
  ```json
  {
    "courierName": "string"
  }
  ```
- **Response:** Created `Delivery`

---

### PUT `/delivery/order/:orderId`

Update delivery status.

- **Roles:** `ADMIN`
- **Request Body:**
  ```json
  {
    "status": "DeliveryStatus",
    "location": "string (optional)",
    "description": "string (optional)",
    "deliveryProofUrl": "string (optional)",
    "deliveryNotes": "string (optional)"
  }
  ```
- **Response:** Updated `Delivery`

---

## 31. Chat

### GET `/chat/conversations`

Get all conversations for the authenticated user.

- **Roles:** Any authenticated user
- **Response:** `Conversation[]`

---

### GET `/chat/messages`

Get chat messages.

- **Roles:** Any authenticated user
- **Query Params:**
  - `conversationId` (optional) — filter by conversation
- **Response:** `ChatMessageClientView[]`

---

### POST `/chat/message`

Send a text message.

- **Roles:** Any authenticated user
- **Request Body:**
  ```json
  {
    "text": "string",
    "conversationId": "number (optional)"
  }
  ```
- **Response:** `ChatMessageClientView`

---

### POST `/chat/message/attachment`

Send an attachment message.

- **Roles:** Any authenticated user
- **Request:** `multipart/form-data` with `file` field
- **Query Params:**
  - `conversationId` (optional) — conversation ID
  - `caption` (optional) — message caption
- **Response:** `ChatMessageClientView`

---

### PATCH `/chat/messages/:id/read`

Mark a message as read.

- **Roles:** Any authenticated user
- **Response:** Updated message

---

### GET `/chat/appointments`

Get appointments for chat (doctor view).

- **Roles:** `DOCTOR`
- **Query Params:**
  - `page` (optional) — page number
  - `limit` (optional) — items per page
- **Response:**
  ```json
  {
    "data": ["Appointment"],
    "page": "number",
    "limit": "number",
    "total": "number"
  }
  ```

---

## 32. Reviews

### POST `/reviews`

Create a new review.

- **Roles:** Any authenticated user
- **Request Body:**
  ```json
  {
    "targetType": "PRODUCT | LIVESTOCK | DOCTOR | CLINIC | SERVICE",
    "targetId": "number",
    "rating": "number (1-5)",
    "text": "string",
    "images": "string[] (optional)",
    "videos": "string[] (optional)"
  }
  ```
- **Response:** `Review`

---

### GET `/reviews/:targetType/:targetId`

Get all reviews for a target.

- **Roles:** Public
- **Response:** `Review[]`

---

### POST `/reviews/:id/helpful`

Mark a review as helpful.

- **Roles:** Any authenticated user
- **Response:** Updated `Review`

---

### POST `/reviews/:id/report`

Report a review.

- **Roles:** Any authenticated user
- **Response:** Updated `Review`

---

### GET `/reviews/reported`

Get all reported reviews.

- **Roles:** `ADMIN`
- **Response:** `Review[]`

---

### PATCH `/reviews/:id/moderate`

Moderate a review (approve/reject).

- **Roles:** `ADMIN`
- **Request Body:**
  ```json
  {
    "isApproved": "boolean"
  }
  ```
- **Response:** Updated `Review`

---

### POST `/reviews/:id/reply`

Reply to a review.

- **Roles:** `DOCTOR`, `ADMIN`
- **Request Body:**
  ```json
  {
    "replyText": "string"
  }
  ```
- **Response:** Updated `Review`

---

## 33. Referrals

### GET `/referrals/me`

Get the authenticated user's referral info.

- **Roles:** Any authenticated user
- **Response:**
  ```json
  {
    "referral": "Referral",
    "shareLink": "string"
  }
  ```

---

### POST `/referrals/claim`

Claim a referral code (rate limited: 30/min).

- **Roles:** Any authenticated user
- **Request Body:**
  ```json
  {
    "code": "string"
  }
  ```
- **Response:** `Referral`

---

## 34. AI Diagnosis

### POST `/ai-diagnosis/upload-image`

Upload an image for AI diagnosis.

- **Roles:** Any authenticated user
- **Request:** `multipart/form-data` with `file` field
- **Response:**
  ```json
  {
    "url": "string"
  }
  ```

---

### POST `/ai-diagnosis/analyze`

Analyze symptoms and images with AI.

- **Roles:** Any authenticated user
- **Request Body:**
  ```json
  {
    "images": ["string (URL)"],
    "symptoms": ["string (non-empty array)"]
  }
  ```
- **Response:** `AiDiagnosis` (status: PENDING)

---

### GET `/ai-diagnosis/history`

Get AI diagnosis history for the authenticated user.

- **Roles:** Any authenticated user
- **Response:** `AiDiagnosis[]`

---

### GET `/ai-diagnosis/:id`

Get a specific AI diagnosis by ID.

- **Roles:** Any authenticated user
- **Response:** `AiDiagnosis`

---

## 35. Medical Records

### POST `/medical-records/upload`

Upload a medical record attachment.

- **Roles:** Any authenticated user
- **Request:** `multipart/form-data` with `file` field
- **Query Params:**
  - `patientId` (optional) — patient ID
  - `appointmentId` (optional) — appointment ID
- **Response:** `Attachment` (status: UPLOADED)

---

### GET `/medical-records`

Get medical record attachments.

- **Roles:** Any authenticated user
- **Query Params:**
  - `patientId` (optional, required for doctors) — filter by patient
- **Response:** `Attachment[]`

---

### GET `/medical-records/:id`

Get a specific medical record attachment.

- **Roles:** Any authenticated user
- **Response:** `Attachment`

---

## 36. Medical Events

### GET `/animals/:id/medical-events`

Get medical events for a specific animal.

- **Roles:** Any authenticated user
- **Query Params:**
  - `type` (optional) — `LAB_TEST`, `VACCINATION`, or `CONSULTATION`
  - `page` (optional) — page number
  - `limit` (optional) — items per page
- **Response:** `PaginatedResult<MedicalEvent>`

---

### GET `/medical-events/:id`

Get a specific medical event by ID.

- **Roles:** Any authenticated user
- **Response:** `MedicalEvent`

---

### POST `/animals/:id/medical-events`

Create a new medical event for an animal.

- **Roles:** `DOCTOR`
- **Request Body:**
  ```json
  {
    "appointmentId": "number (optional)",
    "type": "string",
    "data": "object",
    "nextFollowUpAt": "string (optional)"
  }
  ```
- **Response:** Created `MedicalEvent`

---

### PATCH `/medical-events/:eventId`

Update a medical event.

- **Roles:** `DOCTOR`
- **Request Body:**
  ```json
  {
    "status": "string (optional)",
    "data": "object (optional)"
  }
  ```
- **Response:** Updated `MedicalEvent`

---

### DELETE `/medical-events/:id`

Delete a medical event.

- **Roles:** `DOCTOR`
- **Response:**
  ```json
  {
    "success": true
  }
  ```

---

## 37. Lab Tests

### GET `/lab-tests/animal/:animalId`

Get lab tests for a specific animal.

- **Roles:** Any authenticated user
- **Response:** `MedicalEvent[]`

---

### POST `/lab-tests`

Create a new lab test.

- **Roles:** `DOCTOR`
- **Request Body:**
  ```json
  {
    "animalId": "number",
    "appointmentId": "number (optional)",
    "data": "object"
  }
  ```
- **Response:** Created `MedicalEvent`

---

### PUT `/lab-tests/:id`

Update a lab test.

- **Roles:** `DOCTOR`
- **Request Body:**
  ```json
  {
    "status": "string (optional)",
    "data": "object (optional)"
  }
  ```
- **Response:** Updated `MedicalEvent`

---

## 38. Vaccinations

### GET `/vaccinations/animal/:animalId`

Get vaccinations for a specific animal.

- **Roles:** Any authenticated user
- **Response:** `MedicalEvent[]`

---

### POST `/vaccinations`

Create a new vaccination record.

- **Roles:** `DOCTOR`
- **Request Body:**
  ```json
  {
    "animalId": "number",
    "appointmentId": "number (optional)",
    "data": "object"
  }
  ```
- **Response:** Created `MedicalEvent`

---

### PUT `/vaccinations/:id`

Update a vaccination record.

- **Roles:** `DOCTOR`
- **Request Body:**
  ```json
  {
    "status": "string (optional)",
    "data": "object (optional)"
  }
  ```
- **Response:** Updated `MedicalEvent`

---

### DELETE `/vaccinations/:id`

Delete a vaccination record.

- **Roles:** `DOCTOR`
- **Response:**
  ```json
  {
    "success": true
  }
  ```

---

## 39. Consultations

### GET `/consultations/animal/:animalId`

Get consultations for a specific animal.

- **Roles:** Any authenticated user
- **Response:** `MedicalEvent[]`

---

### GET `/consultations/:id`

Get a specific consultation by ID.

- **Roles:** Any authenticated user
- **Response:** `MedicalEvent`

---

### PUT `/consultations/:id`

Update a consultation.

- **Roles:** `DOCTOR`
- **Request Body:**
  ```json
  {
    "status": "string (optional)",
    "data": "object (optional)"
  }
  ```
- **Response:** Updated `MedicalEvent`

---

### POST `/consultations/:id/end`

End a consultation.

- **Roles:** `DOCTOR`
- **Response:** Updated `MedicalEvent`

---

## 40. Alerts

### GET `/alerts`

Get all alerts for the authenticated user.

- **Roles:** Any authenticated user
- **Query Params:**
  - `severity` (optional) — filter by severity level
- **Response:** `Alert[]`

---

### POST `/alerts/:id/action`

Take action on an alert.

- **Roles:** Any authenticated user
- **Request Body:**
  ```json
  {
    "actionChoice": "AlertActionType"
  }
  ```
- **Response:**
  ```json
  {
    "success": true
  }
  ```

---

## 41. Notifications

### GET `/notifications`

Get all notifications for the authenticated user.

- **Roles:** Any authenticated user
- **Response:** `Notification[]`

---

### GET `/notifications/user`

Alias for `GET /notifications`.

- **Roles:** Any authenticated user
- **Response:** `Notification[]`

---

### GET `/notifications/unread-count`

Get count of unread notifications.

- **Roles:** Any authenticated user
- **Response:**
  ```json
  {
    "count": "number"
  }
  ```

---

### GET `/notifications/:id`

Get a specific notification by ID.

- **Roles:** Any authenticated user
- **Response:** `Notification`

---

### PATCH `/notifications/:id/read`

Mark a notification as read.

- **Roles:** Any authenticated user
- **Response:** Updated `Notification`

---

### PATCH `/notifications/read-all`

Mark all notifications as read.

- **Roles:** Any authenticated user
- **Response:**
  ```json
  {
    "success": true
  }
  ```

---

### POST `/notifications/push-token`

Register a push notification token.

- **Roles:** Any authenticated user
- **Request Body:**
  ```json
  {
    "token": "string",
    "deviceId": "string (optional)"
  }
  ```
- **Response:**
  ```json
  {
    "success": true
  }
  ```

---

### DELETE `/notifications/push-token`

Remove a push notification token.

- **Roles:** Any authenticated user
- **Request Body:**
  ```json
  {
    "token": "string"
  }
  ```
- **Response:**
  ```json
  {
    "success": true
  }
  ```

---

### GET `/notifications/preferences`

Get notification preferences for the authenticated user.

- **Roles:** Any authenticated user
- **Response:** `NotificationPreference` with fields:
  - `appointmentReminders` — boolean
  - `chatMessages` — boolean
  - `promotionalOffers` — boolean
  - `systemUpdates` — boolean
  - `weatherAlerts` — boolean
  - `taskReminders` — boolean
  - `followUpReminders` — boolean
  - `hygieneReminders` — boolean
  - `prescriptionUpdates` — boolean
  - `labResults` — boolean
  - `vaccinationReminders` — boolean

---

### PUT `/notifications/preferences`

Update notification preferences.

- **Roles:** Any authenticated user
- **Request Body:**
  ```json
  {
    "appointmentReminders": "boolean (optional)",
    "chatMessages": "boolean (optional)",
    "promotionalOffers": "boolean (optional)",
    "systemUpdates": "boolean (optional)",
    "weatherAlerts": "boolean (optional)",
    "taskReminders": "boolean (optional)",
    "followUpReminders": "boolean (optional)",
    "hygieneReminders": "boolean (optional)",
    "prescriptionUpdates": "boolean (optional)",
    "labResults": "boolean (optional)",
    "vaccinationReminders": "boolean (optional)"
  }
  ```
- **Response:** Updated `NotificationPreference`

---

## 42. Tasks (rate limited: 30/min)

### GET `/tasks`

Get tasks for a specific date.

- **Roles:** Any authenticated user
- **Query Params:**
  - `date` (required) — format YYYY-MM-DD
  - `category` (optional) — `field`, `animal`, `appointment`, or `other`
  - `priority` (optional) — `low`, `medium`, or `high`
- **Response:** `Task[]`

---

### POST `/tasks`

Create a new task.

- **Roles:** Any authenticated user
- **Request Body:**
  ```json
  {
    "title": "string",
    "detail": "string (optional)",
    "scheduledTime": "string (ISO date)",
    "category": "string (optional)",
    "priority": "'low' | 'medium' | 'high' (optional)",
    "dueDate": "string (optional)"
  }
  ```
- **Response:** Created `Task`

---

### PATCH `/tasks/:id/toggle`

Toggle task completion status.

- **Roles:** Any authenticated user
- **Response:** Updated `Task`

---

### DELETE `/tasks/:id`

Delete a task.

- **Roles:** Any authenticated user
- **Response:**
  ```json
  {
    "success": true
  }
  ```

---

## 43. Search

### GET `/search`

Search across products, livestock, clinics, and doctors.

- **Roles:** Public
- **Query Params:**
  - `q` (required) — search query
- **Response:**
  ```json
  {
    "products": ["Product"],
    "livestock": ["Livestock"],
    "clinics": ["Clinic"],
    "doctors": ["Doctor"]
  }
  ```

---

## 44. Weather

### GET `/weather`

Get current weather information.

- **Roles:** Public
- **Query Params:**
  - `lat` (optional) — latitude
  - `long` (optional) — longitude
  - `district` (optional) — district name
- **Response:**
  ```json
  {
    "location": "string",
    "temperature": "number",
    "highTemp": "number",
    "lowTemp": "number",
    "humidityPercentage": "number",
    "precipitationMl": "number",
    "pressureHpa": "number",
    "windMps": "number",
    "sunriseTime": "string",
    "sunsetTime": "string",
    "isCached": "boolean"
  }
  ```

---

## 45. Health

### GET `/health`

Check API health status.

- **Roles:** Public
- **Response (200 OK):**
  ```json
  {
    "status": "healthy",
    "timestamp": "string",
    "details": {
      "database": {
        "status": "UP"
      }
    }
  }
  ```
- **Response (503 Service Unavailable):**
  ```json
  {
    "status": "unhealthy",
    "timestamp": "string",
    "details": {
      "database": {
        "status": "DOWN"
      }
    }
  }
  ```

---

## 46. Admin Auth (`/admins`)

### POST `/admins/login`

Login as admin (rate limited: 10/min).

- **Request Body:**
  ```json
  {
    "email": "string",
    "password": "string"
  }
  ```
- **Response:**
  ```json
  {
    "admin": "Admin",
    "accessToken": "string",
    "refreshToken": "string"
  }
  ```

---

### POST `/admins/register`

Register a new admin (rate limited: 5/min).

- **Request Body:**
  ```json
  {
    "name": "string (optional)",
    "email": "string",
    "password": "string (8-100 characters)",
    "role": "AdminRole (optional)",
    "designation": "AdminDesignation",
    "avatar": "string (optional)",
    "status": "string (optional)"
  }
  ```
- **Response:** Created `Admin`

---

### POST `/admins/send-otp`

Send OTP for admin verification (rate limited: 5/min).

- **Request Body:**
  ```json
  {
    "email": "string",
    "purpose": "'verify' | 'reset' (optional)"
  }
  ```
- **Response:**
  ```json
  {
    "success": true
  }
  ```

---

### POST `/admins/verify-otp`

Verify admin OTP (rate limited: 10/min).

- **Request Body:**
  ```json
  {
    "email": "string",
    "code": "string",
    "purpose": "'verify' | 'reset' (optional)"
  }
  ```
- **Response:**
  ```json
  {
    "success": true
  }
  ```

---

### POST `/admins/forgot-password`

Request admin password reset (rate limited: 5/min).

- **Request Body:**
  ```json
  {
    "email": "string"
  }
  ```
- **Response:**
  ```json
  {
    "success": true
  }
  ```

---

### POST `/admins/reset-password`

Reset admin password (rate limited: 5/min).

- **Request Body:**
  ```json
  {
    "resetToken": "string",
    "newPassword": "string (8-100 characters)"
  }
  ```
- **Response:**
  ```json
  {
    "success": true
  }
  ```

---

### POST `/admins/refresh`

Refresh admin access token.

- **Request Body:**
  ```json
  {
    "refreshToken": "string"
  }
  ```
- **Response:**
  ```json
  {
    "accessToken": "string",
    "refreshToken": "string"
  }
  ```

---

### POST `/admins/logout`

Logout admin.

- **Request Body:**
  ```json
  {
    "refreshToken": "string"
  }
  ```
- **Response:**
  ```json
  {
    "success": true
  }
  ```

---

### GET `/admins/profile`

Get authenticated admin's profile.

- **Roles:** Admin JWT
- **Response:** `Admin`

---

### PATCH `/admins/profile`

Update authenticated admin's profile.

- **Roles:** Admin JWT
- **Request Body:**
  ```json
  {
    "name": "string (optional)",
    "designation": "string (optional)",
    "password": "string (optional)"
  }
  ```
- **Response:** Updated `Admin`

---

## 47. Admin CRUD (`/admins`) — Roles: SUPER_ADMIN

### GET `/admins`

Get all admins.

- **Roles:** `SUPER_ADMIN`
- **Query Params:**
  - `page` (optional) — page number
  - `limit` (optional) — items per page
  - `search` (optional) — search term
- **Response:** `PaginatedResult<Admin>`

---

### POST `/admins`

Create a new admin.

- **Roles:** `SUPER_ADMIN`
- **Request Body:**
  ```json
  {
    "name": "string (optional)",
    "email": "string",
    "password": "string (8-100 characters)",
    "role": "AdminRole (optional)",
    "designation": "AdminDesignation",
    "avatar": "string (optional)",
    "status": "string (optional)"
  }
  ```
- **Response:** Created `Admin`

---

### GET `/admins/:id`

Get a specific admin by ID.

- **Roles:** `SUPER_ADMIN`
- **Response:** `Admin`

---

### PUT `/admins/:id`

Update an existing admin.

- **Roles:** `SUPER_ADMIN`
- **Request Body:**
  ```json
  {
    "name": "string (optional)",
    "email": "string (optional)",
    "role": "AdminRole (optional)",
    "designation": "AdminDesignation (optional)",
    "avatar": "string (optional)",
    "status": "string (optional)"
  }
  ```
- **Response:** Updated `Admin`

---

### DELETE `/admins/:id`

Delete an admin.

- **Roles:** `SUPER_ADMIN`
- **Response:**
  ```json
  {
    "success": "boolean"
  }
  ```

---

### PATCH `/admins/:id/deactivate`

Toggle admin active status.

- **Roles:** `SUPER_ADMIN`
- **Response:** Updated `Admin` (toggled status)

---

## 48. Admin Users (`/admin/users`)

### GET `/admin/users`

Get all users.

- **Roles:** `ADMIN`
- **Query Params:**
  - `page` (optional) — page number
  - `limit` (optional) — items per page
  - `search` (optional) — search term
- **Response:** `PaginatedResult<User>`

---

### PATCH `/admin/users/:id/role`

Update a user's role.

- **Roles:** `ADMIN`
- **Request Body:**
  ```json
  {
    "role": "USER | DOCTOR | CLINIC | ADMIN"
  }
  ```
- **Response:** Updated `User`

---

### PUT `/admin/users/:id`

Update a user's profile.

- **Roles:** `ADMIN`
- **Request Body:**
  ```json
  {
    "name": "string (optional)",
    "email": "string (optional)",
    "phone": "string (optional)",
    "role": "string (optional)",
    "profilePhoto": "string (optional)",
    "verified": "boolean (optional)"
  }
  ```
- **Response:** Updated `User`

---

### DELETE `/admin/users/:id`

Delete a user.

- **Roles:** `ADMIN`
- **Response:**
  ```json
  {
    "success": true
  }
  ```

---

## 49. Admin Orders (`/admin/orders`)

### GET `/admin/orders`

Get all orders.

- **Roles:** `ADMIN`
- **Query Params:**
  - `page` (optional) — page number
  - `limit` (optional) — items per page
  - `status` (optional) — filter by status
- **Response:** `Order[]`

---

### PATCH `/admin/orders/:id/status`

Update order status.

- **Roles:** `ADMIN`
- **Request Body:**
  ```json
  {
    "status": "PENDING | SHIPPED | DELIVERED | CANCELLED"
  }
  ```
- **Response:** Updated `Order`

---

## 50. Admin Alerts (`/admin/alerts`)

### POST `/admin/alerts`

Create a new alert.

- **Roles:** `ADMIN`
- **Request Body:**
  ```json
  {
    "title": "string",
    "location": "string",
    "crop": "string",
    "severity": "LOW | MEDIUM | HIGH | CRITICAL",
    "actionType": "AlertActionType"
  }
  ```
- **Response:** Created `Alert`

---

### DELETE `/admin/alerts/:id`

Delete an alert.

- **Roles:** `ADMIN`
- **Response:**
  ```json
  {
    "success": true
  }
  ```

---

## 51. Admin Notifications (`/admin/notifications`)

### GET `/admin/notifications`

Get all notifications (admin view).

- **Roles:** `ADMIN`
- **Query Params:**
  - `page` (optional) — page number
  - `limit` (optional) — items per page
  - `type` (optional) — filter by `NotificationType`
  - `userId` (optional) — filter by user ID
- **Response:** `PaginatedResult<Notification>`

---

### POST `/admin/notifications/send`

Send notifications to specific users.

- **Roles:** `ADMIN`
- **Request Body:**
  ```json
  {
    "userIds": ["number"],
    "title": "string",
    "body": "string",
    "type": "NotificationType (optional)",
    "referenceType": "string (optional)",
    "referenceId": "number (optional)"
  }
  ```
- **Response:**
  ```json
  {
    "count": "number"
  }
  ```

---

### POST `/admin/notifications/broadcast`

Broadcast notifications to all users or a specific role.

- **Roles:** `ADMIN`
- **Request Body:**
  ```json
  {
    "title": "string",
    "body": "string",
    "type": "NotificationType (optional)",
    "role": "USER | DOCTOR | CLINIC | ADMIN (optional)"
  }
  ```
- **Response:**
  ```json
  {
    "queued": true
  }
  ```

---

## 52. Admin Referrals (`/admin/referrals`)

### GET `/admin/referrals/pending`

Get all pending referrals.

- **Roles:** `ADMIN`
- **Response:** `Referral[]`

---

### POST `/admin/referrals/:id/approve`

Approve a pending referral.

- **Roles:** `ADMIN`
- **Request Body:**
  ```json
  {
    "amount": "number (>= 0.01)"
  }
  ```
- **Response:** `Referral`

---

## 53. Admin Discounts (`/admin/discounts`)

### POST `/admin/discounts`

Create a new discount code.

- **Roles:** `ADMIN`
- **Request Body:**
  ```json
  {
    "code": "string (alphanumeric, max 10 characters)",
    "percent": "number (1-100)",
    "validFrom": "string (optional)",
    "validTo": "string (optional)",
    "usageLimit": "number (optional)",
    "isActive": "boolean (optional)"
  }
  ```
- **Response:** `Discount`

---

### PATCH `/admin/discounts/:id`

Update an existing discount code.

- **Roles:** `ADMIN`
- **Request Body:** Same as POST, all fields optional
- **Response:** Updated `Discount`

---

### DELETE `/admin/discounts/:id`

Delete a discount code.

- **Roles:** `ADMIN`
- **Response:**
  ```json
  {
    "success": true
  }
  ```

---

## 54. WebSocket: ChatGateway

**Transport:** Socket.IO
**CORS:** `*`
**Auth:** JWT in `handshake.auth.token`

### Client Events

| Event | Payload | Description |
|-------|---------|-------------|
| `joinConversation` | `{ conversationId }` | Join a conversation room |
| `sendMessage` | `{ conversationId, text }` | Save and broadcast message |
| `typing` | `{ conversationId, isTyping }` | Typing indicator |
| `markRead` | `{ messageId }` | Mark message as read |

### Server Events Emitted

| Event | Room | Payload |
|-------|------|---------|
| `messageReceived` | conversation room | `ChatMessageClientView` |
| `messageStatusUpdate` | conversation room | `{ id, status }` |
| `typingIndicator` | conversation room | `{ userId, isTyping }` |
| `conversationUpdated` | `user:{userId}` rooms | message payload |

---

## 55. Swagger

Full interactive API documentation available at `/api/docs` when the server is running.
