import { test, expect, APIResponse } from '@playwright/test';
import { validateSchema } from '../../helpers/schema';
import { TEST_USERS, SAMPLE_DATA, uniqueName } from '../../helpers/test-data';
import * as allure from 'allure-js-commons';

test.describe.serial('Report Flow', () => {
  let response: APIResponse;
  let adminToken: string;
  let cashierToken: string;
  let cashierId: string;
  let categoryId: string;
  let productId: string;
  let transactionId: string;

  const productBasePrice = 50000;
  const productCostPrice = 30000;
  const buyQuantity = 2;

  // ── Setup: Login, Create Category, Product, & Transaction ──
  test.beforeAll(async ({ request }) => {
    // 1. Login Admin
    const adminLogin = await request.post('/auth/login', {
      data: {
        username: TEST_USERS.ADMIN.username,
        password: TEST_USERS.ADMIN.password,
      },
    });
    expect(adminLogin.status()).toBe(200);
    adminToken = (await adminLogin.json()).data.accessToken;

    // 2. Login Kasir (sekaligus ambil ID kasir dari endpoint profile)
    const cashierLogin = await request.post('/auth/login', {
      data: {
        username: TEST_USERS.CASHIER.username,
        password: TEST_USERS.CASHIER.password,
      },
    });
    expect(cashierLogin.status()).toBe(200);
    cashierToken = (await cashierLogin.json()).data.accessToken;

    const cashierProfile = await request.get('/auth/profile', {
      headers: { Authorization: `Bearer ${cashierToken}` },
    });
    cashierId = (await cashierProfile.json()).data._id;

    // 3. Admin creates Category
    const catRes = await request.post('/category', {
      data: { name: SAMPLE_DATA.category.name(), imageUrl: null, imageFileId: null },
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    categoryId = (await catRes.json()).data._id;

    // 4. Admin creates Product
    const prodRes = await request.post('/product', {
      data: {
        ...SAMPLE_DATA.product(categoryId),
        basePrice: productBasePrice,
        costPrice: productCostPrice,
        price: productBasePrice, // No discount
      },
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    productId = (await prodRes.json()).data._id;

    // 5. Kasir creates Transaction (membeli 2 item)
    const trxRes = await request.post('/transaction', {
      data: {
        items: [{ productId, quantity: buyQuantity }],
        payAmount: productBasePrice * buyQuantity,
      },
      headers: { Authorization: `Bearer ${cashierToken}` },
    });
    expect(trxRes.status()).toBe(200);
    transactionId = (await trxRes.json()).data._id;
  });

  // ── Teardown: Cleanup Product & Category ────────────────────
  test.afterAll(async ({ request }) => {
    // Note: Transaction will be cleaned up by global teardown
    if (productId) {
      await request.delete(`/product/${productId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      }).catch(() => {});
    }
    if (categoryId) {
      await request.delete(`/category/${categoryId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      }).catch(() => {});
    }
  });

  // ── RPT-01: Get Sales Summary (Admin) ───────────────────────
  test('RPT-01: Get Sales Summary (Admin)', { tag: ['@smoke', '@regression'] }, async ({ request }) => {
    allure.epic('Report');
    allure.feature('Sales Summary');
    allure.story('RPT-01: Admin Gets Sales Summary');
    allure.label('severity', 'critical');

    await test.step('1. Send GET /report/sales-summary as admin', async () => {
      response = await request.get('/report/sales-summary', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    });

    await test.step('2. Verify response status code 200', async () => {
      expect(response.status()).toBe(200);
    });

    await test.step('3. Verify calculations', async () => {
      const body = await response.json();
      validateSchema(body.meta, 'meta');
      validateSchema(body.data, 'salesSummary');
      
      const expectedRevenue = productBasePrice * buyQuantity; // 100,000
      const expectedCost = productCostPrice * buyQuantity;    // 60,000
      const expectedProfit = expectedRevenue - expectedCost;  // 40,000
      
      expect(body.data.totalRevenue).toBeGreaterThanOrEqual(expectedRevenue);
      expect(body.data.netProfit).toBeGreaterThanOrEqual(expectedProfit);
      expect(body.data.totalTransactions).toBeGreaterThanOrEqual(1);
    });
  });

  // ── RPT-02: Get Sales Summary with Date Filter ──────────────
  test('RPT-02: Get Sales Summary with Date Filter', { tag: ['@regression'] }, async ({ request }) => {
    allure.epic('Report');
    allure.feature('Sales Summary');
    allure.story('RPT-02: Date Filter');
    allure.label('severity', 'normal');

    // Create a date range for today
    const today = new Date().toISOString().split('T')[0];

    await test.step('1. Send GET /report/sales-summary with startDate and endDate', async () => {
      response = await request.get(`/report/sales-summary?startDate=${today}&endDate=${today}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    });

    await test.step('2. Verify response status code 200', async () => {
      expect(response.status()).toBe(200);
      const body = await response.json();
      validateSchema(body.meta, 'meta');
      expect(body.data.totalTransactions).toBeGreaterThanOrEqual(1); // Should still find our transaction today
    });
  });

  // ── RPT-03: Get Sales Summary filtered by Cashier ───────────
  test('RPT-03: Get Sales Summary filtered by Cashier', { tag: ['@regression'] }, async ({ request }) => {
    allure.epic('Report');
    allure.feature('Sales Summary');
    allure.story('RPT-03: Filter by Cashier');
    allure.label('severity', 'normal');

    await test.step('1. Send GET /report/sales-summary with cashierId', async () => {
      response = await request.get(`/report/sales-summary?cashierId=${cashierId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    });

    await test.step('2. Verify response status code 200', async () => {
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.data.totalTransactions).toBeGreaterThanOrEqual(1);
    });
  });

  // ── RPT-04: Get Sales Summary (Kasir) ───────────────────────
  test('RPT-04: Get Sales Summary (Kasir)', { tag: ['@regression'] }, async ({ request }) => {
    allure.epic('Report');
    allure.feature('Sales Summary');
    allure.story('RPT-04: Kasir Access');
    allure.label('severity', 'normal');

    await test.step('1. Send GET /report/sales-summary as kasir', async () => {
      response = await request.get('/report/sales-summary', {
        headers: { Authorization: `Bearer ${cashierToken}` },
      });
    });

    await test.step('2. Verify response is success (Kasir is allowed)', async () => {
      expect(response.status()).toBe(200);
      const body = await response.json();
      validateSchema(body.data, 'salesSummary');
    });
  });

  // ── RPT-05: Get Top Selling Products (Admin) ────────────────
  test('RPT-05: Get Top Selling Products (Admin)', { tag: ['@smoke', '@regression'] }, async ({ request }) => {
    allure.epic('Report');
    allure.feature('Top Products');
    allure.story('RPT-05: Admin Access');
    allure.label('severity', 'critical');

    await test.step('1. Send GET /report/top-products', async () => {
      response = await request.get('/report/top-products', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    });

    await test.step('2. Verify response status code 200', async () => {
      expect(response.status()).toBe(200);
    });

    await test.step('3. Verify top product schema and calculations', async () => {
      const body = await response.json();
      validateSchema(body.meta, 'meta');
      validateSchema(body.pagination, 'pagination');
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(1);

      // Verify the schema for each item in the array
      for (const item of body.data) {
        validateSchema(item, 'topProduct');
      }

      // Check if our newly created product is in the list
      const ourProduct = body.data.find((p: any) => p._id === productId);
      expect(ourProduct).toBeDefined();
      expect(ourProduct.totalQty).toBeGreaterThanOrEqual(buyQuantity);
    });
  });

  // ── RPT-06: Get Top Selling Products - Search & Sort ────────
  test('RPT-06: Get Top Selling Products - Search & Sort', { tag: ['@regression'] }, async ({ request }) => {
    allure.epic('Report');
    allure.feature('Top Products');
    allure.story('RPT-06: Search & Sort');
    allure.label('severity', 'normal');

    await test.step('1. Send GET /report/top-products with search and sort', async () => {
      response = await request.get(`/report/top-products?sortBy=totalRevenue&order=desc`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    });

    await test.step('2. Verify response is success', async () => {
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(Array.isArray(body.data)).toBe(true);
      
      // Verify sorting is descending by checking if first item revenue is >= second item
      if (body.data.length > 1) {
        expect(body.data[0].totalRevenue).toBeGreaterThanOrEqual(body.data[1].totalRevenue);
      }
    });
  });

  // ── RPT-07: Get Top Selling Products - Kasir Forbidden ──────
  test('RPT-07: Get Top Selling Products - Kasir Forbidden', { tag: ['@regression'] }, async ({ request }) => {
    allure.epic('Report');
    allure.feature('Authorization');
    allure.story('RPT-07: Kasir Cannot Access Top Products');
    allure.label('severity', 'critical');

    await test.step('1. Send GET /report/top-products as kasir', async () => {
      response = await request.get('/report/top-products', {
        headers: { Authorization: `Bearer ${cashierToken}` },
      });
    });

    await test.step('2. Verify response is 500 Forbidden', async () => {
      expect(response.status()).toBe(500);
      const body = await response.json();
      expect(body.meta.message).toContain('Forbidden');
    });
  });

  // ── RPT-08: Get Top Selling Products - Date Filter ──────────
  test('RPT-08: Get Top Selling Products - Date Filter', { tag: ['@regression'] }, async ({ request }) => {
    allure.epic('Report');
    allure.feature('Top Products');
    allure.story('RPT-08: Date Filter');
    allure.label('severity', 'normal');

    const today = new Date().toISOString().split('T')[0];

    await test.step('1. Send GET /report/top-products with date filter', async () => {
      response = await request.get(`/report/top-products?startDate=${today}&endDate=${today}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    });

    await test.step('2. Verify response is success', async () => {
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(Array.isArray(body.data)).toBe(true);
      
      // Should find our product sold today
      const ourProduct = body.data.find((p: any) => p._id === productId);
      expect(ourProduct).toBeDefined();
    });
  });
});
