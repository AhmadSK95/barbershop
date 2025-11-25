const request = require('supertest');
const app = require('../src/app'); // We'll need to export app from server.js
const { 
  setupTestDatabase, 
  cleanupTestDatabase, 
  closeDatabase,
  getUserByEmail 
} = require('./helpers/testSetup');

// Setup and teardown
beforeAll(async () => {
  await setupTestDatabase();
});

afterAll(async () => {
  await cleanupTestDatabase();
  await closeDatabase();
});

describe('Auth API Tests', () => {
  
  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@test.com',
          password: 'NewUser@123',
          firstName: 'New',
          lastName: 'User',
          phone: '5559876543'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Registration successful');
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data.user).toHaveProperty('email', 'newuser@test.com');
      expect(res.body.data.user).toHaveProperty('role', 'user');
      expect(res.body.data.user).not.toHaveProperty('password');
    });

    it('should reject registration with existing email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'user@test.com', // Already exists from setup
          password: 'Password@123',
          firstName: 'Duplicate',
          lastName: 'User'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already registered');
    });

    it('should reject registration with weak password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'weakpass@test.com',
          password: 'weak',
          firstName: 'Weak',
          lastName: 'Password'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject registration with invalid email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'notanemail',
          password: 'Password@123',
          firstName: 'Invalid',
          lastName: 'Email'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject registration with missing required fields', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'incomplete@test.com',
          password: 'Password@123'
          // Missing firstName and lastName
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with correct credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user@test.com',
          password: 'User@123456'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data).toHaveProperty('refreshToken');
      expect(res.body.data.user).toHaveProperty('email', 'user@test.com');
      expect(res.body.data.user).not.toHaveProperty('password');
    });

    it('should reject login with incorrect password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user@test.com',
          password: 'WrongPassword@123'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid credentials');
    });

    it('should reject login with non-existent email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'Password@123'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid credentials');
    });

    it('should reject login with missing credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user@test.com'
          // Missing password
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully with valid token', async () => {
      // First login to get token
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user@test.com',
          password: 'User@123456'
        });

      const token = loginRes.body.data.token;
      const refreshToken = loginRes.body.data.refreshToken;

      // Then logout
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Logged out successfully');
    });

    it('should reject logout without token', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken: 'dummy-token' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh access token with valid refresh token', async () => {
      // First login to get refresh token
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user@test.com',
          password: 'User@123456'
        });

      const refreshToken = loginRes.body.data.refreshToken;

      // Wait a bit to ensure new token is different
      await new Promise(resolve => setTimeout(resolve, 100));

      // Refresh token
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data).toHaveProperty('refreshToken');
    });

    it('should reject refresh with invalid token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-refresh-token' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should reject refresh without token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Password Reset Flow', () => {
    it('should request password reset successfully', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: 'user@test.com'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('reset link');
    });

    it('should handle password reset for non-existent email gracefully', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: 'nonexistent@test.com'
        });

      // Should still return 200 to prevent email enumeration
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

});
