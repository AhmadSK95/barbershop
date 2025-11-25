# Backend Testing Guide

Comprehensive test suite for the Barbershop Booking API using Jest and Supertest.

## Setup

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Create Test Database
Create a separate test database to avoid interfering with development data:

```sql
CREATE DATABASE barbershop_test;
GRANT ALL PRIVILEGES ON DATABASE barbershop_test TO barbershop_user;
```

### 3. Configure Test Environment
Edit `backend/.env.test` with your test database credentials:
```bash
DB_NAME=barbershop_test
DB_USER=barbershop_user
DB_PASSWORD=your_password
```

### 4. Run Database Migration for Test DB
```bash
# Temporarily set NODE_ENV to test
NODE_ENV=test npm run migrate
```

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Run Tests with Coverage Report
```bash
npm run test:coverage
```

### Run Specific Test File
```bash
npm test -- __tests__/auth.test.js
```

### Run Tests Matching Pattern
```bash
npm test -- --testNamePattern="login"
```

## Test Structure

```
backend/
├── __tests__/
│   ├── helpers/
│   │   └── testSetup.js       # Database setup and helper functions
│   ├── auth.test.js            # Authentication tests
│   ├── bookings.test.js        # Booking CRUD tests
│   └── users.test.js           # User management tests
├── .env.test                   # Test environment configuration
└── TESTING.md                  # This file
```

## Test Files Overview

### `auth.test.js` - Authentication Tests
Tests for user authentication and authorization:
- ✅ User registration (success and validation)
- ✅ User login (success and error cases)
- ✅ Token refresh
- ✅ Logout
- ✅ Password reset flow

**Test Coverage:**
- Valid registration with all required fields
- Duplicate email rejection
- Weak password rejection
- Invalid email format rejection
- Missing required fields rejection
- Successful login with correct credentials
- Failed login with incorrect password
- Failed login with non-existent email
- Token refresh with valid/invalid tokens
- Logout with valid token
- Password reset request

### `bookings.test.js` - Booking Tests
Tests for booking CRUD operations:
- ✅ Create booking (authenticated users)
- ✅ Get user's bookings
- ✅ Update booking status
- ✅ Cancel booking
- ✅ Reschedule booking
- ✅ Get available time slots
- ✅ Barber assignment

**Test Coverage:**
- Create booking with valid data
- Create booking with missing fields
- Create booking for past date (should fail)
- Get bookings for authenticated user
- Get bookings without authentication (should fail)
- Cancel booking (user and admin)
- Reschedule booking within policy window
- Reschedule booking outside policy window (should fail)
- Get available time slots for specific date
- Random barber assignment

### Helper Functions (`testSetup.js`)

**Database Management:**
- `setupTestDatabase()` - Creates test users, services, barbers
- `cleanupTestDatabase()` - Clears all test data
- `closeDatabase()` - Closes database connection
- `getPool()` - Returns database pool instance

**Test Data Helpers:**
- `getUserByEmail(email)` - Get user by email
- `getBarberUser()` - Get test barber user
- `createTestBooking(userId, barberId, serviceId)` - Create test booking
- `getServiceByName(name)` - Get service by name

## Test Users

Test database is seeded with these users:

### Admin User
```javascript
{
  email: 'admin@barbershop.com',
  password: 'Admin@123456',
  role: 'admin'
}
```

### Regular User
```javascript
{
  email: 'user@test.com',
  password: 'User@123456',
  role: 'user'
}
```

### Barber User
```javascript
{
  email: 'barber@test.com',
  password: 'Barber@123456',
  role: 'barber'
}
```

### Test Services
- Premium Haircut ($35, 30 min)
- Hot Towel Shave ($30, 25 min)
- Beard Trim ($20, 15 min)

## Writing New Tests

### Basic Test Template
```javascript
const request = require('supertest');
const app = require('../src/app');
const { setupTestDatabase, cleanupTestDatabase, closeDatabase } = require('./helpers/testSetup');

beforeAll(async () => {
  await setupTestDatabase();
});

afterAll(async () => {
  await cleanupTestDatabase();
  await closeDatabase();
});

describe('Feature Tests', () => {
  describe('POST /api/endpoint', () => {
    it('should do something successfully', async () => {
      const res = await request(app)
        .post('/api/endpoint')
        .send({ data: 'value' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
```

### Authenticated Request Template
```javascript
it('should access protected route with valid token', async () => {
  // Login first to get token
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({
      email: 'user@test.com',
      password: 'User@123456'
    });

  const token = loginRes.body.data.token;

  // Use token in protected request
  const res = await request(app)
    .get('/api/protected/endpoint')
    .set('Authorization', `Bearer ${token}`);

  expect(res.status).toBe(200);
});
```

## Best Practices

### 1. **Isolate Tests**
Each test should be independent and not rely on other tests.

### 2. **Use beforeEach/afterEach for Cleanup**
```javascript
beforeEach(async () => {
  // Setup test-specific data
});

afterEach(async () => {
  // Cleanup test-specific data
});
```

### 3. **Test Both Success and Failure Cases**
Always test:
- Happy path (valid data, authorized user)
- Error cases (invalid data, unauthorized access)
- Edge cases (boundary conditions)

### 4. **Use Descriptive Test Names**
```javascript
// Good
it('should reject registration with password less than 8 characters')

// Bad
it('password validation')
```

### 5. **Avoid Hardcoded IDs**
Use helper functions to get dynamic IDs:
```javascript
const user = await getUserByEmail('user@test.com');
const booking = await createTestBooking(user.id, barberId, serviceId);
```

### 6. **Mock External Services**
Mock email sending, SMS, payment gateways in tests:
```javascript
jest.mock('../src/utils/email', () => ({
  sendEmail: jest.fn()
}));
```

## Coverage Goals

Aim for:
- **Functions:** 80%+
- **Lines:** 75%+
- **Branches:** 70%+

Critical areas requiring 90%+ coverage:
- Authentication
- Authorization
- Payment processing
- Data validation

## Continuous Integration

### GitHub Actions Example
```yaml
name: Backend Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: barbershop_test
          POSTGRES_USER: barbershop_user
          POSTGRES_PASSWORD: test_password
        ports:
          - 5432:5432
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        working-directory: ./backend
        run: npm install
      
      - name: Run tests
        working-directory: ./backend
        run: npm test
        env:
          NODE_ENV: test
          DB_HOST: localhost
          DB_PORT: 5432
          DB_NAME: barbershop_test
          DB_USER: barbershop_user
          DB_PASSWORD: test_password
```

## Debugging Tests

### Enable Verbose Output
```bash
npm test -- --verbose
```

### Run Single Test
```bash
npm test -- --testNamePattern="should login successfully"
```

### Debug with Node Inspector
```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

Then open `chrome://inspect` in Chrome.

### Check Database State During Tests
Add console.logs or queries in tests:
```javascript
it('should create booking', async () => {
  // ... test code
  
  const { rows } = await getPool().query('SELECT * FROM bookings');
  console.log('Current bookings:', rows);
});
```

## Common Issues

### Issue: Tests hang and don't exit
**Solution:** Ensure database connections are closed in `afterAll`:
```javascript
afterAll(async () => {
  await closeDatabase();
});
```

### Issue: Tests fail with "Connection refused"
**Solution:** Verify PostgreSQL is running and test database exists:
```bash
psql -U barbershop_user -d barbershop_test
```

### Issue: Tests interfere with each other
**Solution:** Use `beforeEach` to reset state or use transactions:
```javascript
beforeEach(async () => {
  await getPool().query('BEGIN');
});

afterEach(async () => {
  await getPool().query('ROLLBACK');
});
```

### Issue: Environment variables not loaded
**Solution:** Ensure `.env.test` exists and `NODE_ENV=test` is set:
```bash
NODE_ENV=test npm test
```

## Next Steps

### Additional Test Files to Create
1. `users.test.js` - User management and profile updates
2. `admin.test.js` - Admin-specific operations
3. `barber.test.js` - Barber dashboard and schedule
4. `ratings.test.js` - Rating and review system
5. `config.test.js` - Configuration and settings
6. `integration.test.js` - End-to-end flow tests

### Performance Testing
Consider adding:
- Load testing with `artillery` or `k6`
- Benchmark tests for critical endpoints
- Database query performance tests

### Security Testing
- SQL injection tests
- XSS attack tests
- CSRF protection tests
- Rate limiting tests
- JWT token expiry tests

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://testingjavascript.com/)
- [Node.js Testing Guide](https://nodejs.org/en/docs/guides/testing/)
