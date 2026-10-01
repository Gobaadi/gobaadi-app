import { test, expect } from '@playwright/test';
import { ApiClient } from '../helpers/api-client';

test.describe('Doctors & Appointments API Tests', () => {
  let doctorClient: ApiClient;
  let userClient: ApiClient;

  test.beforeEach(({ request }) => {
    doctorClient = new ApiClient(request);
    userClient = new ApiClient(request);
  });

  test('Doctor lifecycle: registration, availability, slots listing, booking & cancellation', async () => {
    // 1. Register and verify doctor
    const doctorSession = await doctorClient.registerAndVerifyUser('doctor');
    
    // Get doctor profile id
    const docProfileRes = await doctorClient.get('/doctors/me');
    expect(docProfileRes.status()).toBe(200);
    const doctorProfile = await docProfileRes.json();
    const doctorId = doctorProfile.id;

    // 2. Set doctor availability (e.g., Monday 09:00 - 17:00, slot 30m, buffer 10m)
    const setAvailRes = await doctorClient.post(`/doctors/${doctorId}/availability`, {
      entries: [
        {
          dayOfWeek: 1, // Monday
          startTime: '09:00',
          endTime: '12:00',
          slotDurationMinutes: 30,
          bufferMinutes: 10,
        }
      ]
    });
    expect(setAvailRes.status()).toBe(201);

    // 3. Register user/patient
    const userSession = await userClient.registerAndVerifyUser('user');

    // 4. Retrieve available slots for next Monday (e.g. 2026-08-17 is a Monday)
    const mondayDate = '2026-08-17';
    const slotsRes = await userClient.get(`/doctors/${doctorId}/slots?date=${mondayDate}`);
    expect(slotsRes.status()).toBe(200);
    const slots = await slotsRes.json() as string[];
    expect(slots.length).toBeGreaterThan(0);

    // Slots should be e.g. "09:00", "09:40", "10:20" due to 30m duration + 10m buffer
    const firstSlot = slots[0];

    // 5. Book the slot
    const bookRes = await userClient.post('/doctors/book', {
      doctorId: doctorId.toString(),
      date: mondayDate,
      time: firstSlot,
    });
    expect(bookRes.status()).toBe(201);
    const appointment = await bookRes.json();
    expect(appointment.id).toBeDefined();
    expect(appointment.status).toBe('CONFIRMED');

    // 6. Verify duplicate booking on same slot fails
    const doubleBookRes = await userClient.post('/doctors/book', {
      doctorId: doctorId.toString(),
      date: mondayDate,
      time: firstSlot,
    });
    expect(doubleBookRes.status()).toBe(409); // Conflict

    // 7. Verify bookings list
    const userBookings = await userClient.get('/doctors/bookings/all');
    expect(userBookings.status()).toBe(200);
    const userBookingsJson = await userBookings.json();
    expect(userBookingsJson.some((b: any) => b.id === appointment.id)).toBe(true);

    const docBookings = await doctorClient.get('/doctors/bookings/all');
    expect(docBookings.status()).toBe(200);
    const docBookingsJson = await docBookings.json();
    expect(docBookingsJson.some((b: any) => b.id === appointment.id)).toBe(true);

    // 8. Cancel appointment (reason is required by the API)
    const cancelRes = await userClient.patch(`/doctors/bookings/${appointment.id}/cancel`, {
      reason: 'Test cancellation',
    });
    expect(cancelRes.status()).toBe(200);
    const cancelledApp = await cancelRes.json();
    expect(cancelledApp.status).toBe('CANCELLED');
  });
});
