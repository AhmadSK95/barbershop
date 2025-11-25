const request = require('supertest');
const app = require('../src/app');
const { 
  setupTestDatabase, 
  cleanupTestDatabase, 
  closeDatabase,
  getUserByEmail
} = require('./helpers/testSetup');

beforeAll(async () => {
  await setupTestDatabase();
});

afterAll(async () => {
  await cleanupTestDatabase();
  await closeDatabase();
});

describe('User Management Tests', () => {
  let userToken;
  let adminToken;
  let testUser;

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
  });

  describe('GET /api/users/profile', () => {
    it('should get authenticated user profile', async () => {
      const res = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toHaveProperty('email');
      expect(res.body.data.user).toHaveProperty('first_name');
      expect(res.body.data.user.email).toBe('user@test.com');
    });

    it('should reject request without authentication', async () => {
      const res = await request(app)
        .get('/api/users/profile');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/users/profile', () => {
    it('should update user profile', async () => {
      const res = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          firstName: 'Updated',
          lastName: 'User',
          phone: '1234567890'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.first_name).toBe('Updated');
      expect(res.body.data.user.last_name).toBe('User');
    });

    it('should reject invalid phone number', async () => {
      const res = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          firstName: 'Test',
          lastName: 'User',
          phone: '123' // Too short
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject invalid name format', async () => {
      const res = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          firstName: 'Test123', // Contains numbers
          lastName: 'User',
          phone: '1234567890'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/users/change-password', () => {
    it('should change password with correct old password', async () => {
      const res = await request(app)
        .put('/api/users/change-password')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          currentPassword: 'User@123456',
          newPassword: 'NewPassword@123'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Change back to original password
      await request(app)
        .put('/api/users/change-password')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          currentPassword: 'NewPassword@123',
          newPassword: 'User@123456'
        });
    });

    it('should reject incorrect current password', async () => {
      const res = await request(app)
        .put('/api/users/change-password')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          currentPassword: 'WrongPassword@123',
          newPassword: 'NewPassword@123'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject weak new password', async () => {
      const res = await request(app)
        .put('/api/users/change-password')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          currentPassword: 'User@123456',
          newPassword: 'weak'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Password must be');
    });
  });

  describe('Admin User Management', () => {
    describe('GET /api/users', () => {
      it('should allow admin to get all users', async () => {
        const res = await request(app)
          .get('/api/users')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data.users)).toBe(true);
        expect(res.body.data.users.length).toBeGreaterThan(0);
      });

      it('should reject regular user from getting all users', async () => {
        const res = await request(app)
          .get('/api/users')
          .set('Authorization', `Bearer ${userToken}`);

        expect(res.status).toBe(403);
        expect(res.body.success).toBe(false);
      });
    });

    describe('GET /api/users/:id', () => {
      it('should allow admin to get specific user', async () => {
        const res = await request(app)
          .get(`/api/users/${testUser.id}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.user.id).toBe(testUser.id);
      });

      it('should reject regular user from getting other users', async () => {
        // Get admin user to test
        const adminUser = await getUserByEmail('admin@barbershop.com');
        
        const res = await request(app)
          .get(`/api/users/${adminUser.id}`)
          .set('Authorization', `Bearer ${userToken}`);

        expect(res.status).toBe(403);
        expect(res.body.success).toBe(false);
      });
    });

    describe('PUT /api/users/:id/role', () => {
      it('should allow admin to update user role', async () => {
        const res = await request(app)
          .put(`/api/users/${testUser.id}/role`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ role: 'barber' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.user.role).toBe('barber');

        // Change back to user role
        await request(app)
          .put(`/api/users/${testUser.id}/role`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ role: 'user' });
      });

      it('should reject invalid role', async () => {
        const res = await request(app)
          .put(`/api/users/${testUser.id}/role`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ role: 'invalid_role' });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
      });

      it('should reject regular user from updating roles', async () => {
        const res = await request(app)
          .put(`/api/users/${testUser.id}/role`)
          .set('Authorization', `Bearer ${userToken}`)
          .send({ role: 'admin' });

        expect(res.status).toBe(403);
        expect(res.body.success).toBe(false);
      });
    });

    describe('DELETE /api/users/:id', () => {
      let userToDelete;

      beforeEach(async () => {
        // Create a test user to delete
        const res = await request(app)
          .post('/api/auth/register')
          .send({
            firstName: 'Delete',
            lastName: 'Test',
            email: `delete-${Date.now()}@test.com`,
            password: 'Delete@123456',
            phone: '9876543210'
          });
        userToDelete = res.body.data.user;
      });

      it('should allow admin to delete user', async () => {
        const res = await request(app)
          .delete(`/api/users/${userToDelete.id}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });

      it('should reject regular user from deleting users', async () => {
        const res = await request(app)
          .delete(`/api/users/${userToDelete.id}`)
          .set('Authorization', `Bearer ${userToken}`);

        expect(res.status).toBe(403);
        expect(res.body.success).toBe(false);
      });

      it('should reject deleting non-existent user', async () => {
        const res = await request(app)
          .delete('/api/users/99999')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(404);
        expect(res.body.success).toBe(false);
      });
    });
  });
});
