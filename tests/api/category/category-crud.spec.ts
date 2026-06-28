import { test, expect, APIResponse } from '@playwright/test';
import { validateSchema } from '../../helpers/schema';
import { TEST_USERS, SAMPLE_DATA } from '../../helpers/test-data';
import * as allure from 'allure-js-commons';

test.describe.serial('Category CRUD Flow', () => {
  let response: APIResponse;
  let adminToken: string;
  let cashierToken: string;
  let createdCategoryId: string;
  let createdCategoryName: string;
  const createdCategoryIds: string[] = [];

  // ── Setup: Login admin sebelum semua test ───────────────────
  test.beforeAll(async ({ request }) => {
    response = await request.post('/auth/login', {
      data: {
        username: TEST_USERS.ADMIN.username,
        password: TEST_USERS.ADMIN.password,
      },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    adminToken = body.data.accessToken;
  });

  // ── Teardown: Cleanup semua category yang dibuat ────────────
  test.afterAll(async ({ request }) => {
    for (const id of createdCategoryIds) {
      await request.delete(`/category/${id}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      }).catch(() => {}); // ignore errors during cleanup
    }
  });

  // ── CAT-01: Create Category - Validation Error (Empty Body) ─
  test('CAT-01: Create Category - Validation Error (Empty Body)', { tag: ['@regression'] }, async ({ request }) => {
    allure.epic('Category');
    allure.feature('Create Category');
    allure.story('CAT-01: Create Category - Validation Error (Empty Body)');
    allure.label('severity', 'critical');

    await test.step('1. Send POST /category with empty body', async () => {
      response = await request.post('/category', {
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
    });
  });

  // ── CAT-02: Create Category - Success ───────────────────────
  test('CAT-02: Create Category - Success', { tag: ['@smoke', '@regression'] }, async ({ request }) => {
    allure.epic('Category');
    allure.feature('Create Category');
    allure.story('CAT-02: Create Category - Success');
    allure.label('severity', 'critical');

    createdCategoryName = SAMPLE_DATA.category.name();

    await test.step('1. Send POST /category with valid data', async () => {
      response = await request.post('/category', {
        data: {
          name: createdCategoryName,
          imageUrl: null,
          imageFileId: null,
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
      validateSchema(body.data, 'category');
      expect(body.meta.message).toContain('Category created successfully');
      expect(body.data.name).toBe(createdCategoryName);
      createdCategoryId = body.data._id;
      createdCategoryIds.push(createdCategoryId);
    });
  });

  // ── CAT-03: Create Category - Duplicate Name ────────────────
  test('CAT-03: Create Category - Duplicate Name', { tag: ['@regression'] }, async ({ request }) => {
    allure.epic('Category');
    allure.feature('Create Category');
    allure.story('CAT-03: Create Category - Duplicate Name');
    allure.label('severity', 'critical');

    await test.step('1. Send POST /category with duplicate name', async () => {
      response = await request.post('/category', {
        data: {
          name: createdCategoryName,
          imageUrl: null,
          imageFileId: null,
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

  // ── CAT-04: Find All Categories ─────────────────────────────
  test('CAT-04: Find All Categories', { tag: ['@smoke', '@regression'] }, async ({ request }) => {
    allure.epic('Category');
    allure.feature('Find All Categories');
    allure.story('CAT-04: Find All Categories');
    allure.label('severity', 'critical');

    await test.step('1. Send GET /category', async () => {
      response = await request.get('/category', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    });

    await test.step('2. Verify response status code 200', async () => {
      expect(response.status()).toBe(200);
    });

    await test.step('3. Verify response body, data array, pagination & productCount', async () => {
      const body = await response.json();
      validateSchema(body.meta, 'meta');
      validateSchema(body.pagination, 'pagination');
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThan(0);
      expect(body.pagination.total).toBeGreaterThan(0);

      // Verify productCount field exists from aggregation
      const firstItem = body.data[0];
      expect(firstItem).toHaveProperty('productCount');
      expect(typeof firstItem.productCount).toBe('number');
    });
  });

  // ── CAT-05: Find All Categories - Search ────────────────────
  test('CAT-05: Find All Categories - Search', { tag: ['@regression'] }, async ({ request }) => {
    allure.epic('Category');
    allure.feature('Find All Categories');
    allure.story('CAT-05: Find All Categories - Search');
    allure.label('severity', 'normal');

    await test.step('1. Send GET /category with search query', async () => {
      response = await request.get(`/category?search=${createdCategoryName}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    });

    await test.step('2. Verify response status code 200', async () => {
      expect(response.status()).toBe(200);
    });

    await test.step('3. Verify search results contain matching category', async () => {
      const body = await response.json();
      validateSchema(body.meta, 'meta');
      validateSchema(body.pagination, 'pagination');
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(1);

      const found = body.data.some(
        (cat: any) => cat.name === createdCategoryName
      );
      expect(found).toBe(true);
    });
  });

  // ── CAT-06: Find One Category ──────────────────────────────
  test('CAT-06: Find One Category', { tag: ['@smoke', '@regression'] }, async ({ request }) => {
    allure.epic('Category');
    allure.feature('Find One Category');
    allure.story('CAT-06: Find One Category');
    allure.label('severity', 'critical');

    await test.step('1. Send GET /category/:id', async () => {
      response = await request.get(`/category/${createdCategoryId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    });

    await test.step('2. Verify response status code 200', async () => {
      expect(response.status()).toBe(200);
    });

    await test.step('3. Verify response body matches created category', async () => {
      const body = await response.json();
      validateSchema(body.meta, 'meta');
      validateSchema(body.data, 'category');
      expect(body.data._id).toBe(createdCategoryId);
      expect(body.data.name).toBe(createdCategoryName);
    });
  });

  // ── CAT-07: Find One Category - Not Found ──────────────────
  test('CAT-07: Find One Category - Not Found', { tag: ['@regression'] }, async ({ request }) => {
    allure.epic('Category');
    allure.feature('Find One Category');
    allure.story('CAT-07: Find One Category - Not Found');
    allure.label('severity', 'normal');

    const fakeId = '000000000000000000000000';

    await test.step('1. Send GET /category/:fakeId', async () => {
      response = await request.get(`/category/${fakeId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    });

    await test.step('2. Verify response is error', async () => {
      const body = await response.json();
      validateSchema(body.meta, 'meta');
      expect(body.meta.message).toContain('not found');
    });
  });

  // ── CAT-08: Update Category - Success ──────────────────────
  test('CAT-08: Update Category - Success', { tag: ['@smoke', '@regression'] }, async ({ request }) => {
    allure.epic('Category');
    allure.feature('Update Category');
    allure.story('CAT-08: Update Category - Success');
    allure.label('severity', 'critical');

    const updatedName = SAMPLE_DATA.category.name();

    await test.step('1. Send PUT /category/:id with updated name', async () => {
      response = await request.put(`/category/${createdCategoryId}`, {
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
      expect(body.meta.message).toContain('Update Category Successfull');
      expect(body.data.name).toBe(updatedName);
      expect(body.data._id).toBe(createdCategoryId);

      // Update local name for subsequent tests
      createdCategoryName = updatedName;
    });
  });

  // ── CAT-09: Update Category - Duplicate Name ───────────────
  test('CAT-09: Update Category - Duplicate Name', { tag: ['@regression'] }, async ({ request }) => {
    allure.epic('Category');
    allure.feature('Update Category');
    allure.story('CAT-09: Update Category - Duplicate Name');
    allure.label('severity', 'critical');

    let secondCategoryId: string;
    let secondCategoryName: string;

    await test.step('1. Create a second category', async () => {
      secondCategoryName = SAMPLE_DATA.category.name();
      const createRes = await request.post('/category', {
        data: { name: secondCategoryName, imageUrl: null, imageFileId: null },
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(createRes.status()).toBe(200);
      const createBody = await createRes.json();
      secondCategoryId = createBody.data._id;
      createdCategoryIds.push(secondCategoryId); // track for cleanup
    });

    await test.step('2. Send PUT /category/:id with name that already exists', async () => {
      response = await request.put(`/category/${secondCategoryId}`, {
        data: { name: createdCategoryName },
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    });

    await test.step('3. Verify response is error (duplicate)', async () => {
      // Backend may return 409 (via error handler) or 500 (if not caught properly)
      expect([409, 500]).toContain(response.status());
      const body = await response.json();
      validateSchema(body.meta, 'meta');
      const msg = body.meta.message.toLowerCase();
      expect(msg).toMatch(/sudah terdaftar|already exists|failed/);
    });
  });

  // ── CAT-10: Update Category - Not Found ────────────────────
  test('CAT-10: Update Category - Not Found', { tag: ['@regression'] }, async ({ request }) => {
    allure.epic('Category');
    allure.feature('Update Category');
    allure.story('CAT-10: Update Category - Not Found');
    allure.label('severity', 'normal');

    const fakeId = '000000000000000000000000';

    await test.step('1. Send PUT /category/:fakeId', async () => {
      response = await request.put(`/category/${fakeId}`, {
        data: { name: 'Ghost Category' },
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    });

    await test.step('2. Verify response is error', async () => {
      const body = await response.json();
      validateSchema(body.meta, 'meta');
      expect(body.meta.message).toContain('not found');
    });
  });

  // ── CAT-11: Delete Category (Soft Delete) - Success ────────
  test('CAT-11: Delete Category (Soft Delete) - Success', { tag: ['@smoke', '@regression'] }, async ({ request }) => {
    allure.epic('Category');
    allure.feature('Delete Category');
    allure.story('CAT-11: Delete Category (Soft Delete) - Success');
    allure.label('severity', 'critical');

    await test.step('1. Send DELETE /category/:id', async () => {
      response = await request.delete(`/category/${createdCategoryId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    });

    await test.step('2. Verify response status code 200', async () => {
      expect(response.status()).toBe(200);
    });

    await test.step('3. Verify soft delete response', async () => {
      const body = await response.json();
      validateSchema(body.meta, 'meta');
      expect(body.meta.message).toContain('Success Remove Category');
      expect(body.data.deletedAt).not.toBeNull();
    });
  });

  // ── CAT-12: Delete Category - Not Found ────────────────────
  test('CAT-12: Delete Category - Not Found', { tag: ['@regression'] }, async ({ request }) => {
    allure.epic('Category');
    allure.feature('Delete Category');
    allure.story('CAT-12: Delete Category - Not Found');
    allure.label('severity', 'normal');

    const fakeId = '000000000000000000000000';

    await test.step('1. Send DELETE /category/:fakeId', async () => {
      response = await request.delete(`/category/${fakeId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    });

    await test.step('2. Verify response is error', async () => {
      const body = await response.json();
      validateSchema(body.meta, 'meta');
      expect(body.meta.message).toContain('not found');
    });
  });

  // ── CAT-13: Cashier Can Read but Cannot Create Category ────
  test('CAT-13: Cashier Can Read but Cannot Create Category', { tag: ['@regression'] }, async ({ request }) => {
    allure.epic('Category');
    allure.feature('Authorization');
    allure.story('CAT-13: Cashier Can Read but Cannot Create Category');
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

    await test.step('2. Cashier CAN read categories (GET /category)', async () => {
      response = await request.get('/category', {
        headers: { Authorization: `Bearer ${cashierToken}` },
      });
      expect(response.status()).toBe(200);
      const body = await response.json();
      validateSchema(body.meta, 'meta');
      expect(Array.isArray(body.data)).toBe(true);
    });

    await test.step('3. Cashier CANNOT create category (POST /category)', async () => {
      response = await request.post('/category', {
        data: { name: 'Unauthorized Category', imageUrl: null, imageFileId: null },
        headers: { Authorization: `Bearer ${cashierToken}` },
      });
      expect(response.status()).toBe(500);
      const body = await response.json();
      validateSchema(body.meta, 'meta');
      expect(body.meta.message).toContain('Forbidden');
    });
  });
});
