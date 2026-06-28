import { test, expect, APIResponse } from '@playwright/test';
import { validateSchema } from '../../helpers/schema';
import { TEST_USERS, SAMPLE_DATA, uniqueName } from '../../helpers/test-data';
import * as allure from 'allure-js-commons';

test.describe.serial('Transaction Flow', () => {
  let response: APIResponse;
  let adminToken: string;
  let cashierToken: string;
  let categoryId: string;
  let productId: string;
  let productPrice: number;
  let createdTransactionId: string;
  let createdTransactionNumber: string;
  const initialStock = 100;

  // ── Setup: Login admin + kasir, create category + product ───
  test.beforeAll(async ({ request }) => {
    // 1. Login admin
    const adminLogin = await request.post('/auth/login', {
      data: {
        username: TEST_USERS.ADMIN.username,
        password: TEST_USERS.ADMIN.password,
      },
    });
    expect(adminLogin.status()).toBe(200);
    adminToken = (await adminLogin.json()).data.accessToken;

    // 2. Login kasir
    const cashierLogin = await request.post('/auth/login', {
      data: {
        username: TEST_USERS.CASHIER.username,
        password: TEST_USERS.CASHIER.password,
      },
    });
    expect(cashierLogin.status()).toBe(200);
    cashierToken = (await cashierLogin.json()).data.accessToken;

    // 3. Admin creates category
    const catRes = await request.post('/category', {
      data: {
        name: SAMPLE_DATA.category.name(),
        imageUrl: null,
        imageFileId: null,
      },
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(catRes.status()).toBe(200);
    categoryId = (await catRes.json()).data._id;

    // 4. Admin creates product (stock: 100, price: 50000)
    const productData = SAMPLE_DATA.product(categoryId);
    const prodRes = await request.post('/product', {
      data: productData,
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(prodRes.status()).toBe(200);
    const prodBody = await prodRes.json();
    productId = prodBody.data._id;
    productPrice = prodBody.data.price;
  });

  // ── Teardown: Cleanup product & category ────────────────────
  test.afterAll(async ({ request }) => {
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

  // ── TRX-01: Create Transaction - Validation Error ───────────
  test('TRX-01: Create Transaction - Validation Error (Empty Body)', { tag: ['@regression'] }, async ({ request }) => {
    allure.epic('Transaction');
    allure.feature('Create Transaction');
    allure.story('TRX-01: Validation Error (Empty Body)');
    allure.label('severity', 'critical');

    await test.step('1. Send POST /transaction with empty body', async () => {
      response = await request.post('/transaction', {
        data: {},
        headers: { Authorization: `Bearer ${cashierToken}` },
      });
    });

    await test.step('2. Verify response status code 400', async () => {
      expect(response.status()).toBe(400);
    });

    await test.step('3. Verify validation errors', async () => {
      const body = await response.json();
      validateSchema(body.meta, 'meta');
      expect(body.meta.message).toContain('Validasi gagal.');
      expect(body.errors).toHaveProperty('items');
      expect(body.errors).toHaveProperty('payAmount');
    });
  });

  // ── TRX-02: Create Transaction - Insufficient Payment ──────
  test('TRX-02: Create Transaction - Insufficient Payment', { tag: ['@regression'] }, async ({ request }) => {
    allure.epic('Transaction');
    allure.feature('Create Transaction');
    allure.story('TRX-02: Insufficient Payment');
    allure.label('severity', 'critical');

    await test.step('1. Send POST /transaction with payAmount < totalAmount', async () => {
      response = await request.post('/transaction', {
        data: {
          items: [{ productId, quantity: 1 }],
          payAmount: 1000, // way less than product price (50000)
        },
        headers: { Authorization: `Bearer ${cashierToken}` },
      });
    });

    await test.step('2. Verify response is error', async () => {
      expect(response.status()).toBe(500);
    });

    await test.step('3. Verify error message', async () => {
      const body = await response.json();
      validateSchema(body.meta, 'meta');
      expect(body.meta.message).toContain('tidak mencukupi');
    });
  });

  // ── TRX-03: Create Transaction - Success ────────────────────
  test('TRX-03: Create Transaction - Success', { tag: ['@smoke', '@regression'] }, async ({ request }) => {
    allure.epic('Transaction');
    allure.feature('Create Transaction');
    allure.story('TRX-03: Create Transaction - Success');
    allure.label('severity', 'critical');

    const quantity = 2;
    const payAmount = 200000;

    await test.step('1. Send POST /transaction with valid data', async () => {
      response = await request.post('/transaction', {
        data: {
          items: [{ productId, quantity }],
          payAmount,
        },
        headers: { Authorization: `Bearer ${cashierToken}` },
      });
    });

    await test.step('2. Verify response status code 200', async () => {
      expect(response.status()).toBe(200);
    });

    await test.step('3. Verify response body & schema', async () => {
      const body = await response.json();
      validateSchema(body.meta, 'meta');
      validateSchema(body.data, 'transaction');
      expect(body.meta.message).toContain('Transaksi berhasil');

      // Verify transaction details
      expect(body.data.transactionNumber).toMatch(/^TRX-/);
      expect(body.data.totalAmount).toBe(productPrice * quantity);
      expect(body.data.payAmount).toBe(payAmount);
      expect(body.data.changeAmount).toBe(payAmount - (productPrice * quantity));
      expect(body.data.items).toHaveLength(1);
      expect(body.data.items[0].quantity).toBe(quantity);

      createdTransactionId = body.data._id;
      createdTransactionNumber = body.data.transactionNumber;
    });
  });

  // ── TRX-04: Create Transaction - Insufficient Stock ─────────
  test('TRX-04: Create Transaction - Insufficient Stock', { tag: ['@regression'] }, async ({ request }) => {
    allure.epic('Transaction');
    allure.feature('Create Transaction');
    allure.story('TRX-04: Insufficient Stock');
    allure.label('severity', 'critical');

    await test.step('1. Send POST /transaction with quantity > stock', async () => {
      response = await request.post('/transaction', {
        data: {
          items: [{ productId, quantity: 99999 }],
          payAmount: 999999999,
        },
        headers: { Authorization: `Bearer ${cashierToken}` },
      });
    });

    await test.step('2. Verify response is error', async () => {
      expect(response.status()).toBe(500);
    });

    await test.step('3. Verify error message', async () => {
      const body = await response.json();
      validateSchema(body.meta, 'meta');
      expect(body.meta.message).toContain('tidak ditemukan atau stok tidak mencukupi');
    });
  });

  // ── TRX-05: Find All Transactions (Admin) ──────────────────
  test('TRX-05: Find All Transactions (Admin)', { tag: ['@smoke', '@regression'] }, async ({ request }) => {
    allure.epic('Transaction');
    allure.feature('Find All Transactions');
    allure.story('TRX-05: Admin Sees All');
    allure.label('severity', 'critical');

    await test.step('1. Send GET /transaction as admin', async () => {
      response = await request.get('/transaction', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    });

    await test.step('2. Verify response status code 200', async () => {
      expect(response.status()).toBe(200);
    });

    await test.step('3. Verify response body & pagination', async () => {
      const body = await response.json();
      validateSchema(body.meta, 'meta');
      validateSchema(body.pagination, 'pagination');
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThan(0);
      expect(body.pagination.total).toBeGreaterThan(0);
    });
  });

  // ── TRX-06: Find All Transactions (Kasir - Own Only) ────────
  test('TRX-06: Find All Transactions (Kasir - Own Only)', { tag: ['@regression'] }, async ({ request }) => {
    allure.epic('Transaction');
    allure.feature('Find All Transactions');
    allure.story('TRX-06: Kasir Sees Own Only');
    allure.label('severity', 'critical');

    await test.step('1. Send GET /transaction as kasir', async () => {
      response = await request.get('/transaction', {
        headers: { Authorization: `Bearer ${cashierToken}` },
      });
    });

    await test.step('2. Verify response status code 200', async () => {
      expect(response.status()).toBe(200);
    });

    await test.step('3. Verify kasir only sees own transactions', async () => {
      const body = await response.json();
      validateSchema(body.meta, 'meta');
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(1);

      // All transactions should belong to this kasir
      for (const trx of body.data) {
        if (trx.cashierId && typeof trx.cashierId === 'object') {
          expect(trx.cashierId.role).toBe('kasir');
          expect(trx.cashierId.username).toBe(TEST_USERS.CASHIER.username);
        }
      }
    });
  });

  // ── TRX-07: Find All Transactions - Search by TRX Number ────
  test('TRX-07: Find All Transactions - Search by TRX Number', { tag: ['@regression'] }, async ({ request }) => {
    allure.epic('Transaction');
    allure.feature('Find All Transactions');
    allure.story('TRX-07: Search by Transaction Number');
    allure.label('severity', 'normal');

    await test.step('1. Send GET /transaction with search', async () => {
      response = await request.get(`/transaction?search=${createdTransactionNumber}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    });

    await test.step('2. Verify response status code 200', async () => {
      expect(response.status()).toBe(200);
    });

    await test.step('3. Verify search results', async () => {
      const body = await response.json();
      validateSchema(body.meta, 'meta');
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(1);

      const found = body.data.some(
        (trx: any) => trx.transactionNumber === createdTransactionNumber
      );
      expect(found).toBe(true);
    });
  });

  // ── TRX-08: Find One Transaction (Admin) ────────────────────
  test('TRX-08: Find One Transaction (Admin)', { tag: ['@smoke', '@regression'] }, async ({ request }) => {
    allure.epic('Transaction');
    allure.feature('Find One Transaction');
    allure.story('TRX-08: Admin Find One');
    allure.label('severity', 'critical');

    await test.step('1. Send GET /transaction/:id as admin', async () => {
      response = await request.get(`/transaction/${createdTransactionId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    });

    await test.step('2. Verify response status code 200', async () => {
      expect(response.status()).toBe(200);
    });

    await test.step('3. Verify response with populated cashierId', async () => {
      const body = await response.json();
      validateSchema(body.meta, 'meta');
      validateSchema(body.data, 'transaction');
      expect(body.data._id).toBe(createdTransactionId);
      expect(body.data.transactionNumber).toBe(createdTransactionNumber);

      // Verify cashierId is populated
      expect(body.data.cashierId).toHaveProperty('name');
      expect(body.data.cashierId).toHaveProperty('username');
      expect(body.data.cashierId).toHaveProperty('role');
    });
  });

  // ── TRX-09: Find One Transaction (Kasir - Own) ─────────────
  test('TRX-09: Find One Transaction (Kasir - Own)', { tag: ['@regression'] }, async ({ request }) => {
    allure.epic('Transaction');
    allure.feature('Find One Transaction');
    allure.story('TRX-09: Kasir Find Own Transaction');
    allure.label('severity', 'critical');

    await test.step('1. Send GET /transaction/:id as kasir (own transaction)', async () => {
      response = await request.get(`/transaction/${createdTransactionId}`, {
        headers: { Authorization: `Bearer ${cashierToken}` },
      });
    });

    await test.step('2. Verify response status code 200', async () => {
      expect(response.status()).toBe(200);
    });

    await test.step('3. Verify response body', async () => {
      const body = await response.json();
      validateSchema(body.meta, 'meta');
      validateSchema(body.data, 'transaction');
      expect(body.data._id).toBe(createdTransactionId);
    });
  });

  // ── TRX-10: Find One Transaction - Not Found ───────────────
  test('TRX-10: Find One Transaction - Not Found', { tag: ['@regression'] }, async ({ request }) => {
    allure.epic('Transaction');
    allure.feature('Find One Transaction');
    allure.story('TRX-10: Not Found');
    allure.label('severity', 'normal');

    const fakeId = '000000000000000000000000';

    await test.step('1. Send GET /transaction/:fakeId', async () => {
      response = await request.get(`/transaction/${fakeId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    });

    await test.step('2. Verify response is error', async () => {
      const body = await response.json();
      validateSchema(body.meta, 'meta');
      expect(body.meta.message).toContain('not found');
    });
  });

  // ── TRX-11: Admin Cannot Create Transaction ────────────────
  test('TRX-11: Admin Cannot Create Transaction', { tag: ['@regression'] }, async ({ request }) => {
    allure.epic('Transaction');
    allure.feature('Authorization');
    allure.story('TRX-11: Admin Cannot Create Transaction');
    allure.label('severity', 'critical');

    await test.step('1. Send POST /transaction as admin', async () => {
      response = await request.post('/transaction', {
        data: {
          items: [{ productId, quantity: 1 }],
          payAmount: 100000,
        },
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    });

    await test.step('2. Verify forbidden response', async () => {
      expect(response.status()).toBe(500);
      const body = await response.json();
      validateSchema(body.meta, 'meta');
      expect(body.meta.message).toContain('Forbidden');
    });
  });

  // ── TRX-12: Verify Stock Reduced After Transaction ──────────
  test('TRX-12: Verify Stock Reduced After Transaction', { tag: ['@regression'] }, async ({ request }) => {
    allure.epic('Transaction');
    allure.feature('Stock Management');
    allure.story('TRX-12: Stock Reduced');
    allure.label('severity', 'critical');

    await test.step('1. Send GET /product/:id to check current stock', async () => {
      response = await request.get(`/product/${productId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    });

    await test.step('2. Verify response status code 200', async () => {
      expect(response.status()).toBe(200);
    });

    await test.step('3. Verify stock has been reduced', async () => {
      const body = await response.json();
      // Initial stock was 100, TRX-03 bought 2 items
      expect(body.data.stock).toBe(initialStock - 2);
    });
  });
});
