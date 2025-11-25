const request = require('supertest');
const app = require('../src/app');
const { 
  setupTestDatabase, 
  cleanupTestDatabase, 
  closeDatabase,
  getUserByEmail,
  getBarberUser,
  getServiceByName,
  createTestBooking
} = require('./helpers/testSetup');

// Setup and teardown
beforeAll(async () => {
  await setupTestDatabase();
});

afterAll(async () => {
  await cleanupTestDatabase();
  await closeDatabase();
});

describe('Booking API Tests', () => {
  let userToken;
  let adminToken;
  let barberToken;
  let testUser;
  let testBarber;
  let testService;

  beforeAll(async () => {
    // Login as regular user
    const userLoginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'user@test.com',
        password: 'User@123456'
      });
    userToken = userLoginRes.body.data.accessToken;
    testUser = await getUserByEmail('user@test.com');

    // Login as admin
    const adminLoginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@barbershop.com',
        password: 'Admin@123456'
      });
    adminToken = adminLoginRes.body.data.accessToken;

    // Login as barber
    const barberLoginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'barber@test.com',
        password: 'Barber@123456'
      });
    barberToken = barberLoginRes.body.data.accessToken;
    testBarber = await getBarberUser();

    // Get test service
    testService = await getServiceByName('Premium Haircut');
  });

  describe('POST /api/bookings', () => {
    it('should create a booking with valid data', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);
      const dateStr = futureDate.toISOString().split('T')[0];

      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          serviceIds: [testService.id],
          barberId: testBarber.barber_id,
          bookingDate: dateStr,
          bookingTime: '14:00:00',
          notes: 'Test booking'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.booking).toHaveProperty('id');
      expect(res.body.data.booking.status).toBe('pending');
    });

    it('should create booking with random barber when barberId is null', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 6);
      const dateStr = futureDate.toISOString().split('T')[0];

      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          serviceIds: [testService.id],
          barberId: null,
          bookingDate: dateStr,
          bookingTime: '15:00:00'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('assignedBarber');
    });

    it('should reject booking without authentication', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);
      const dateStr = futureDate.toISOString().split('T')[0];

      const res = await request(app)
        .post('/api/bookings')
        .send({
          serviceIds: [testService.id],
          barberId: testBarber.barber_id,
          bookingDate: dateStr,
          bookingTime: '14:00:00'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject booking for past date', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      const dateStr = pastDate.toISOString().split('T')[0];

      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          serviceIds: [testService.id],
          barberId: testBarber.barber_id,
          bookingDate: dateStr,
          bookingTime: '14:00:00'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject booking with missing required fields', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          serviceIds: [testService.id]
          // Missing bookingDate and bookingTime
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/bookings/my-bookings', () => {
    let createdBookingId;

    beforeAll(async () => {
      // Create a test booking
      const booking = await createTestBooking(testUser.id, testBarber.barber_id, testService.id);
      createdBookingId = booking.id;
    });

    it('should get user\'s own bookings', async () => {
      const res = await request(app)
        .get('/api/bookings/my-bookings')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.bookings)).toBe(true);
      expect(res.body.data.bookings.length).toBeGreaterThan(0);
    });

    it('should reject request without authentication', async () => {
      const res = await request(app)
        .get('/api/bookings/my-bookings');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/bookings/:id/cancel', () => {
    let bookingToCancel;

    beforeEach(async () => {
      // Create a fresh booking for cancellation
      bookingToCancel = await createTestBooking(testUser.id, testBarber.barber_id, testService.id);
    });

    it('should allow user to cancel their own booking', async () => {
      const res = await request(app)
        .post(`/api/bookings/${bookingToCancel.id}/cancel`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('cancelled');
    });

    it('should allow admin to cancel any booking', async () => {
      const res = await request(app)
        .post(`/api/bookings/${bookingToCancel.id}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject cancellation without authentication', async () => {
      const res = await request(app)
        .post(`/api/bookings/${bookingToCancel.id}/cancel`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject cancellation of non-existent booking', async () => {
      const res = await request(app)
        .post('/api/bookings/99999/cancel')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/bookings/:id/status', () => {
    let bookingToUpdate;

    beforeEach(async () => {
      bookingToUpdate = await createTestBooking(testUser.id, testBarber.barber_id, testService.id);
    });

    it('should allow admin to update booking status', async () => {
      const res = await request(app)
        .put(`/api/bookings/${bookingToUpdate.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'confirmed' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.booking.status).toBe('confirmed');
    });

    it('should reject status update by regular user', async () => {
      const res = await request(app)
        .put(`/api/bookings/${bookingToUpdate.id}/status`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ status: 'confirmed' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should reject invalid status values', async () => {
      const res = await request(app)
        .put(`/api/bookings/${bookingToUpdate.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'invalid_status' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/bookings/:id/reschedule', () => {
    let bookingToReschedule;

    beforeEach(async () => {
      bookingToReschedule = await createTestBooking(testUser.id, testBarber.barber_id, testService.id);
    });

    it('should allow user to reschedule their booking', async () => {
      const newDate = new Date();
      newDate.setDate(newDate.getDate() + 10);
      const dateStr = newDate.toISOString().split('T')[0];

      const res = await request(app)
        .post(`/api/bookings/${bookingToReschedule.id}/reschedule`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          newDate: dateStr,
          newTime: '16:00:00'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.booking.booking_date).toBe(dateStr);
    });

    it('should reject rescheduling to past date', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      const dateStr = pastDate.toISOString().split('T')[0];

      const res = await request(app)
        .post(`/api/bookings/${bookingToReschedule.id}/reschedule`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          newDate: dateStr,
          newTime: '16:00:00'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/bookings/all', () => {
    it('should allow admin to get all bookings', async () => {
      const res = await request(app)
        .get('/api/bookings/all')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.bookings)).toBe(true);
    });

    it('should reject regular user from getting all bookings', async () => {
      const res = await request(app)
        .get('/api/bookings/all')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/bookings/available-barbers', () => {
    it('should return available barbers for given date and time', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const dateStr = futureDate.toISOString().split('T')[0];

      const res = await request(app)
        .get('/api/bookings/available-barbers')
        .query({
          date: dateStr,
          time: '14:00:00'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.barbers)).toBe(true);
    });

    it('should require date and time parameters', async () => {
      const res = await request(app)
        .get('/api/bookings/available-barbers');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });
});
