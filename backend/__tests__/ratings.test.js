const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/database');
const { 
  setupTestDatabase, 
  cleanupTestDatabase, 
  closeDatabase,
  getUserByEmail,
  getBarberUser,
  getServiceByName,
  createTestBooking
} = require('./helpers/testSetup');

beforeAll(async () => {
  await setupTestDatabase();
});

afterAll(async () => {
  await cleanupTestDatabase();
  await closeDatabase();
});

describe('Rating System Tests', () => {
  let userToken;
  let adminToken;
  let testUser;
  let testBarber;
  let testService;
  let completedBooking;
  let pendingBooking;

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

    // Get test resources
    testBarber = await getBarberUser();
    testService = await getServiceByName('Premium Haircut');

    // Create a completed booking for rating
    completedBooking = await createTestBooking(testUser.id, testBarber.barber_id, testService.id);
    await pool.query('UPDATE bookings SET status = $1 WHERE id = $2', ['completed', completedBooking.id]);

    // Create a pending booking (cannot be rated)
    pendingBooking = await createTestBooking(testUser.id, testBarber.barber_id, testService.id);
  });

  describe('POST /api/bookings/:id/rate', () => {
    it('should submit rating for completed booking', async () => {
      const res = await request(app)
        .post(`/api/bookings/${completedBooking.id}/rate`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          rating: 5,
          review: 'Excellent service!'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.rating.rating).toBe(5);
      expect(res.body.data.rating.review).toBe('Excellent service!');
    });

    it('should reject rating for pending booking', async () => {
      const res = await request(app)
        .post(`/api/bookings/${pendingBooking.id}/rate`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          rating: 5,
          review: 'Great!'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('completed');
    });

    it('should reject rating without authentication', async () => {
      const res = await request(app)
        .post(`/api/bookings/${completedBooking.id}/rate`)
        .send({
          rating: 5,
          review: 'Good'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject invalid rating value', async () => {
      const res = await request(app)
        .post(`/api/bookings/${completedBooking.id}/rate`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          rating: 6, // Rating should be 1-5
          review: 'Test'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject rating with missing required fields', async () => {
      const res = await request(app)
        .post(`/api/bookings/${completedBooking.id}/rate`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          // Missing rating
          review: 'Test'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/bookings/:id/rate', () => {
    let ratedBooking;

    beforeEach(async () => {
      // Create and rate a booking
      ratedBooking = await createTestBooking(testUser.id, testBarber.barber_id, testService.id);
      await pool.query('UPDATE bookings SET status = $1 WHERE id = $2', ['completed', ratedBooking.id]);
      
      await request(app)
        .post(`/api/bookings/${ratedBooking.id}/rate`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          rating: 4,
          review: 'Good service'
        });
    });

    it('should update existing rating', async () => {
      const res = await request(app)
        .put(`/api/bookings/${ratedBooking.id}/rate`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          rating: 5,
          review: 'Actually, excellent service!'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.rating.rating).toBe(5);
      expect(res.body.data.rating.review).toBe('Actually, excellent service!');
    });

    it('should reject update by different user', async () => {
      // Create another user
      const otherUserRes = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'Other',
          lastName: 'User',
          email: `other-${Date.now()}@test.com`,
          password: 'Other@123456',
          phone: '5555555555'
        });

      const otherUserToken = otherUserRes.body.data.accessToken;

      const res = await request(app)
        .put(`/api/bookings/${ratedBooking.id}/rate`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({
          rating: 1,
          review: 'Trying to change someone elses rating'
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/bookings/:id/rating', () => {
    let bookingWithRating;

    beforeAll(async () => {
      // Create a booking with rating
      bookingWithRating = await createTestBooking(testUser.id, testBarber.barber_id, testService.id);
      await pool.query('UPDATE bookings SET status = $1 WHERE id = $2', ['completed', bookingWithRating.id]);
      
      await request(app)
        .post(`/api/bookings/${bookingWithRating.id}/rate`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          rating: 5,
          review: 'Fantastic!'
        });
    });

    it('should get rating for specific booking', async () => {
      const res = await request(app)
        .get(`/api/bookings/${bookingWithRating.id}/rating`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.rating).toHaveProperty('rating');
      expect(res.body.data.rating).toHaveProperty('review');
      expect(res.body.data.rating.rating).toBe(5);
    });

    it('should return null for booking without rating', async () => {
      const res = await request(app)
        .get(`/api/bookings/${pendingBooking.id}/rating`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.rating).toBeNull();
    });
  });

  describe('GET /api/barbers/:id/ratings', () => {
    it('should get all ratings for a barber', async () => {
      const res = await request(app)
        .get(`/api/barbers/${testBarber.barber_id}/ratings`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.ratings)).toBe(true);
    });

    it('should calculate average rating correctly', async () => {
      const res = await request(app)
        .get(`/api/barbers/${testBarber.barber_id}/ratings`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      
      if (res.body.data.ratings.length > 0) {
        expect(res.body.data.averageRating).toBeDefined();
        expect(typeof res.body.data.averageRating).toBe('number');
        expect(res.body.data.averageRating).toBeGreaterThanOrEqual(1);
        expect(res.body.data.averageRating).toBeLessThanOrEqual(5);
      }
    });

    it('should return empty array for barber with no ratings', async () => {
      // Create a new barber without any ratings
      const newBarberRes = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'New',
          lastName: 'Barber',
          email: `newbarber-${Date.now()}@test.com`,
          password: 'Barber@123456',
          phone: '4444444444'
        });

      const newBarber = newBarberRes.body.data.user;
      
      // Create barber profile
      await pool.query(
        'INSERT INTO barbers (user_id, specialty, is_available) VALUES ($1, $2, $3) RETURNING id',
        [newBarber.id, 'Test Specialty', true]
      );

      const barberIdResult = await pool.query(
        'SELECT id FROM barbers WHERE user_id = $1',
        [newBarber.id]
      );
      const newBarberId = barberIdResult.rows[0].id;

      const res = await request(app)
        .get(`/api/barbers/${newBarberId}/ratings`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.ratings)).toBe(true);
      expect(res.body.data.ratings.length).toBe(0);
      expect(res.body.data.averageRating).toBe(0);
    });
  });

  describe('DELETE /api/bookings/:id/rating', () => {
    let bookingToDeleteRating;

    beforeEach(async () => {
      // Create a booking with rating
      bookingToDeleteRating = await createTestBooking(testUser.id, testBarber.barber_id, testService.id);
      await pool.query('UPDATE bookings SET status = $1 WHERE id = $2', ['completed', bookingToDeleteRating.id]);
      
      await request(app)
        .post(`/api/bookings/${bookingToDeleteRating.id}/rate`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          rating: 3,
          review: 'Average'
        });
    });

    it('should allow user to delete their own rating', async () => {
      const res = await request(app)
        .delete(`/api/bookings/${bookingToDeleteRating.id}/rating`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should allow admin to delete any rating', async () => {
      const res = await request(app)
        .delete(`/api/bookings/${bookingToDeleteRating.id}/rating`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject deletion without authentication', async () => {
      const res = await request(app)
        .delete(`/api/bookings/${bookingToDeleteRating.id}/rating`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
