import { test, expect, APIResponse } from '@playwright/test';
import { validateSchema } from '../../helpers/schema';
import { TEST_USERS, SAMPLE_DATA, uniqueName } from '../../helpers/test-data';
import * as allure from 'allure-js-commons';

test.describe('User CRUD Flow', () => {
  let response: APIResponse;
  let adminToken: string;
  let cashierToken: string;
  let createdUserId: string;
  let createdUsername: string;

  // ── USR-01: Admin Login (Setup) ──────────────────────────────
  test('USR-01: Admin Login (Setup)', { tag: ['@smoke', '@regression'] }, async ({ request }) => {
    allure.epic('User');
    allure.feature('Setup');
    allure.story('USR-01: Admin Login (Setup)');
    allure.label('severity', 'blocker');

    await test.step('1. Send POST /auth/login request', async () => {
      response = await request.post('/auth/login', {
        data: {
          username: TEST_USERS.ADMIN.username,
          password: TEST_USERS.ADMIN.password,
        },
      });
    });

    await test.step('2. Verify response status code', async () => {
      expect(response.status()).toBe(200);
    });

    await test.step('3. Extract admin token', async () => {
      const body = await response.json();
      validateSchema(body.meta, 'meta');
      validateSchema(body.data, 'login');
      adminToken = body.data.accessToken;
      expect(adminToken).toBeTruthy();
    });
  });

  // ── USR-02: Create User - Validation Error (Empty Body) ─────
  test('USR-02: Create User - Validation Error (Empty Body)', { tag: ['@regression'] }, async ({ request }) => {
    allure.epic('User');
    allure.feature('Create User');
    allure.story('USR-02: Create User - Validation Error (Empty Body)');
    allure.label('severity', 'critical');

    await test.step('1. Send POST /user with empty body', async () => {
      response = await request.post('/user', {
        data: {},
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    });

    await test.step('2. Verify response status code 400', async () => {
      expect(response.status()).toBe(400);
    });

    await test.step('3. Verify validation errors', async () => {
      const body = await response.json();
      validateSchema(body.meta, 'meta');
      expect(body.meta.message).toContain('Validasi gagal.');
      expect(body.errors).toHaveProperty('name');
      expect(body.errors).toHaveProperty('username');
      expect(body.errors).toHaveProperty('password');
    });
  });

  // ── USR-03: Create User - Success ───────────────────────────
  test('USR-03: Create User - Success', { tag: ['@smoke', '@regression'] }, async ({ request }) => {
    allure.epic('User');
    allure.feature('Create User');
    allure.story('USR-03: Create User - Success');
    allure.label('severity', 'critical');

    createdUsername = SAMPLE_DATA.user.username();

    await test.step('1. Send POST /user with valid data', async () => {
      response = await request.post('/user', {
        data: {
          name: SAMPLE_DATA.user.name(),
          username: createdUsername,
          password: SAMPLE_DATA.user.password,
          role: SAMPLE_DATA.user.role,
        },
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    });

    await test.step('2. Verify response status code 200', async () => {
      expect(response.status()).toBe(200);
    });

    await test.step('3. Verify response body & schema', async () => {
      const body = await response.json();
      validateSchema(body.meta, 'meta');
      validateSchema(body.data, 'user');
      expect(body.meta.message).toContain('User created successfully');
      expect(body.data.username).toBe(createdUsername);
      expect(body.data.role).toBe('kasir');
      createdUserId = body.data._id;
    });
  });

  // ── USR-04: Create User - Duplicate Username ────────────────
  test('USR-04: Create User - Duplicate Username', { tag: ['@regression'] }, async ({ request }) => {
    allure.epic('User');
    allure.feature('Create User');
    allure.story('USR-04: Create User - Duplicate Username');
    allure.label('severity', 'critical');

    await test.step('1. Send POST /user with duplicate username', async () => {
      response = await request.post('/user', {
        data: {
          name: 'Duplicate User',
          username: createdUsername,
          password: 'password123',
          role: 'kasir',
        },
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    });

    await test.step('2. Verify response status code 409 (Conflict)', async () => {
      expect(response.status()).toBe(409);
    });

    await test.step('3. Verify error message', async () => {
      const body = await response.json();
      validateSchema(body.meta, 'meta');
      expect(body.meta.message).toContain('sudah terdaftar');
    });
  });

  // ── USR-05: Find All Users ──────────────────────────────────
  test('USR-05: Find All Users', { tag: ['@smoke', '@regression'] }, async ({ request }) => {
    allure.epic('User');
    allure.feature('Find All Users');
    allure.story('USR-05: Find All Users');
    allure.label('severity', 'critical');

    await test.step('1. Send GET /user', async () => {
      response = await request.get('/user', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    });

    await test.step('2. Verify response status code 200', async () => {
      expect(response.status()).toBe(200);
    });

    await test.step('3. Verify response body, data array & pagination', async () => {
      const body = await response.json();
      validateSchema(body.meta, 'meta');
      validateSchema(body.pagination, 'pagination');
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThan(0);
      expect(body.pagination.total).toBeGreaterThan(0);
    });
  });

  // ── USR-06: Find All Users - Search ─────────────────────────
  test('USR-06: Find All Users - Search', { tag: ['@regression'] }, async ({ request }) => {
    allure.epic('User');
    allure.feature('Find All Users');
    allure.story('USR-06: Find All Users - Search');
    allure.label('severity', 'normal');

    await test.step('1. Send GET /user with search query', async () => {
      response = await request.get(`/user?search=${createdUsername}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    });

    await test.step('2. Verify response status code 200', async () => {
      expect(response.status()).toBe(200);
    });

    await test.step('3. Verify search results contain matching user', async () => {
      const body = await response.json();
      validateSchema(body.meta, 'meta');
      validateSchema(body.pagination, 'pagination');
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(1);

      const found = body.data.some(
        (user: any) => user.username === createdUsername
      );
      expect(found).toBe(true);
    });
  });

  // ── USR-07: Find One User ──────────────────────────────────
  test('USR-07: Find One User', { tag: ['@smoke', '@regression'] }, async ({ request }) => {
    allure.epic('User');
    allure.feature('Find One User');
    allure.story('USR-07: Find One User');
    allure.label('severity', 'critical');

    await test.step('1. Send GET /user/:id', async () => {
      response = await request.get(`/user/${createdUserId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    });

    await test.step('2. Verify response status code 200', async () => {
      expect(response.status()).toBe(200);
    });

    await test.step('3. Verify response body matches created user', async () => {
      const body = await response.json();
      validateSchema(body.meta, 'meta');
      validateSchema(body.data, 'user');
      expect(body.data._id).toBe(createdUserId);
      expect(body.data.username).toBe(createdUsername);
    });
  });

  // ── USR-08: Find One User - Not Found ──────────────────────
  test('USR-08: Find One User - Not Found', { tag: ['@regression'] }, async ({ request }) => {
    allure.epic('User');
    allure.feature('Find One User');
    allure.story('USR-08: Find One User - Not Found');
    allure.label('severity', 'normal');

    const fakeId = '000000000000000000000000';

    await test.step('1. Send GET /user/:invalidId', async () => {
      response = await request.get(`/user/${fakeId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    });

    await test.step('2. Verify response status is error', async () => {
      const body = await response.json();
      validateSchema(body.meta, 'meta');
      expect(body.meta.message).toContain('not found');
    });
  });

  // ── USR-09: Update User - Success ──────────────────────────
  test('USR-09: Update User - Success', { tag: ['@smoke', '@regression'] }, async ({ request }) => {
    allure.epic('User');
    allure.feature('Update User');
    allure.story('USR-09: Update User - Success');
    allure.label('severity', 'critical');

    const updatedName = uniqueName('UpdatedKasir');

    await test.step('1. Send PUT /user/:id with updated name', async () => {
      response = await request.put(`/user/${createdUserId}`, {
        data: { name: updatedName },
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    });

    await test.step('2. Verify response status code 200', async () => {
      expect(response.status()).toBe(200);
    });

    await test.step('3. Verify updated data in response', async () => {
      const body = await response.json();
      validateSchema(body.meta, 'meta');
      expect(body.meta.message).toContain('Berhasil memperbarui user');
      expect(body.data.name).toBe(updatedName);
      expect(body.data._id).toBe(createdUserId);
    });
  });

  // ── USR-10: Update User - Not Found ────────────────────────
  test('USR-10: Update User - Not Found', { tag: ['@regression'] }, async ({ request }) => {
    allure.epic('User');
    allure.feature('Update User');
    allure.story('USR-10: Update User - Not Found');
    allure.label('severity', 'normal');

    const fakeId = '000000000000000000000000';

    await test.step('1. Send PUT /user/:invalidId', async () => {
      response = await request.put(`/user/${fakeId}`, {
        data: { name: 'Ghost User' },
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    });

    await test.step('2. Verify response is error', async () => {
      const body = await response.json();
      validateSchema(body.meta, 'meta');
      expect(body.meta.message).toContain('not found');
    });
  });

  // ── USR-11: Delete User (Soft Delete) - Success ────────────
  test('USR-11: Delete User (Soft Delete) - Success', { tag: ['@smoke', '@regression'] }, async ({ request }) => {
    allure.epic('User');
    allure.feature('Delete User');
    allure.story('USR-11: Delete User (Soft Delete) - Success');
    allure.label('severity', 'critical');

    await test.step('1. Send DELETE /user/:id', async () => {
      response = await request.delete(`/user/${createdUserId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    });

    await test.step('2. Verify response status code 200', async () => {
      expect(response.status()).toBe(200);
    });

    await test.step('3. Verify soft delete response', async () => {
      const body = await response.json();
      validateSchema(body.meta, 'meta');
      expect(body.meta.message).toContain('Berhasil menghapus user');
      expect(body.data.deletedAt).not.toBeNull();
    });
  });

  // ── USR-12: Delete User - Not Found ────────────────────────
  test('USR-12: Delete User - Not Found', { tag: ['@regression'] }, async ({ request }) => {
    allure.epic('User');
    allure.feature('Delete User');
    allure.story('USR-12: Delete User - Not Found');
    allure.label('severity', 'normal');

    const fakeId = '000000000000000000000000';

    await test.step('1. Send DELETE /user/:invalidId', async () => {
      response = await request.delete(`/user/${fakeId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    });

    await test.step('2. Verify response is error', async () => {
      const body = await response.json();
      validateSchema(body.meta, 'meta');
      expect(body.meta.message).toContain('not found');
    });
  });

  // ── USR-13: Cashier Cannot Access User Endpoints ───────────
  test('USR-13: Cashier Cannot Access User Endpoints', { tag: ['@regression'] }, async ({ request }) => {
    allure.epic('User');
    allure.feature('Authorization');
    allure.story('USR-13: Cashier Cannot Access User Endpoints');
    allure.label('severity', 'critical');

    await test.step('1. Login as cashier', async () => {
      response = await request.post('/auth/login', {
        data: {
          username: TEST_USERS.CASHIER.username,
          password: TEST_USERS.CASHIER.password,
        },
      });
      expect(response.status()).toBe(200);
      const body = await response.json();
      cashierToken = body.data.accessToken;
      expect(cashierToken).toBeTruthy();
    });

    await test.step('2. Send GET /user as cashier', async () => {
      response = await request.get('/user', {
        headers: { Authorization: `Bearer ${cashierToken}` },
      });
    });

    await test.step('3. Verify forbidden response', async () => {
      expect(response.status()).toBe(500);
      const body = await response.json();
      validateSchema(body.meta, 'meta');
      expect(body.meta.message).toContain('Forbidden');
    });
  });
});
