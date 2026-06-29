import { test, expect, APIResponse } from '@playwright/test';
import { validateSchema } from '../../helpers/schema';
import { TEST_USERS, SAMPLE_DATA, uniqueName } from '../../helpers/test-data';
import * as allure from 'allure-js-commons';

test.describe.serial('Notification Flow', () => {
  let response: APIResponse;
  let adminToken: string;
  let cashierToken: string;
  let categoryId: string;
  let productId: string;
  let notificationId: string;

  const productBasePrice = 50000;
  const initialStock = 10;
  const minStock = 5;
  const buyQuantity = 6; // Sisa stok jadi 4 (di bawah minStock), memicu notifikasi

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

    // 2. Login Kasir
    const cashierLogin = await request.post('/auth/login', {
      data: {
        username: TEST_USERS.CASHIER.username,
        password: TEST_USERS.CASHIER.password,
      },
    });
    expect(cashierLogin.status()).toBe(200);
    cashierToken = (await cashierLogin.json()).data.accessToken;

    // 3. Admin creates Category
    const catRes = await request.post('/category', {
      data: { name: SAMPLE_DATA.category.name(), imageUrl: null, imageFileId: null },
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    categoryId = (await catRes.json()).data._id;

    // 4. Admin creates Product with low minStock threshold
    const prodRes = await request.post('/product', {
      data: {
        ...SAMPLE_DATA.product(categoryId),
        basePrice: productBasePrice,
        costPrice: 30000,
        price: productBasePrice,
        stock: initialStock,
        minStock: minStock,
        name: uniqueName('NotifProduct'),
      },
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    productId = (await prodRes.json()).data._id;

    // 5. Kasir creates Transaction to trigger low stock
    const trxRes = await request.post('/transaction', {
      data: {
        items: [{ productId, quantity: buyQuantity }],
        payAmount: productBasePrice * buyQuantity,
      },
      headers: { Authorization: `Bearer ${cashierToken}` },
    });
    expect(trxRes.status()).toBe(200);

    // Jeda sejenak untuk memastikan notifikasi tersimpan di database
    await new Promise((resolve) => setTimeout(resolve, 500));
  });

  // ── Teardown: Cleanup Product & Category ────────────────────
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

  // ── NTF-01: Get Notifications ───────────────────────────────
  test('NTF-01: Get Notifications', { tag: ['@smoke', '@regression'] }, async ({ request }) => {
    allure.epic('Notification');
    allure.feature('Get Notifications');
    allure.story('NTF-01: Read All Notifications');
    allure.label('severity', 'critical');

    await test.step('1. Send GET /notification as admin', async () => {
      response = await request.get('/notification', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    });

    await test.step('2. Verify response status code 200', async () => {
      expect(response.status()).toBe(200);
    });

    await test.step('3. Verify notification schema and presence', async () => {
      const body = await response.json();
      validateSchema(body.meta, 'meta');
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThan(0);

      for (const item of body.data) {
        validateSchema(item, 'notification');
      }

      // Pastikan notifikasi low stock berhasil dibuat
      const lowStockNotif = body.data.find((n: any) => n.title.includes('Stok') && !n.isRead);
      expect(lowStockNotif).toBeDefined();
      
      if (lowStockNotif) {
        notificationId = lowStockNotif._id;
      }
    });
  });

  // ── NTF-02: Get Unread Count ────────────────────────────────
  test('NTF-02: Get Unread Count', { tag: ['@smoke', '@regression'] }, async ({ request }) => {
    allure.epic('Notification');
    allure.feature('Get Notifications');
    allure.story('NTF-02: Unread Count');
    allure.label('severity', 'normal');

    await test.step('1. Send GET /notification/unread-count as admin', async () => {
      response = await request.get('/notification/unread-count', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    });

    await test.step('2. Verify response status code 200', async () => {
      expect(response.status()).toBe(200);
    });

    await test.step('3. Verify unread count > 0', async () => {
      const body = await response.json();
      validateSchema(body.meta, 'meta');
      validateSchema(body.data, 'unreadCount');
      expect(body.data.count).toBeGreaterThan(0);
    });
  });

  // ── NTF-03: Mark Notification as Read ───────────────────────
  test('NTF-03: Mark Notification as Read', { tag: ['@smoke', '@regression'] }, async ({ request }) => {
    allure.epic('Notification');
    allure.feature('Mark Read');
    allure.story('NTF-03: Mark Single Notification as Read');
    allure.label('severity', 'critical');

    test.skip(!notificationId, 'No notification ID found to mark as read');

    await test.step('1. Send PATCH /notification/:id/mark-as-read', async () => {
      response = await request.patch(`/notification/${notificationId}/mark-as-read`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    });

    await test.step('2. Verify response status code 200', async () => {
      expect(response.status()).toBe(200);
    });

    await test.step('3. Verify success message', async () => {
      const body = await response.json();
      validateSchema(body.meta, 'meta');
      expect(body.meta.message).toContain('Notifikasi ditandai sudah dibaca');
    });

    await test.step('4. Verify isRead is now true via GET', async () => {
      const getRes = await request.get('/notification', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const getBody = await getRes.json();
      const updatedNotif = getBody.data.find((n: any) => n._id === notificationId);
      expect(updatedNotif.isRead).toBe(true);
    });
  });

  // ── NTF-04: Mark All Notifications as Read ──────────────────
  test('NTF-04: Mark All Notifications as Read', { tag: ['@regression'] }, async ({ request }) => {
    allure.epic('Notification');
    allure.feature('Mark Read');
    allure.story('NTF-04: Mark All as Read');
    allure.label('severity', 'critical');

    await test.step('1. Send PATCH /notification/mark-all-read', async () => {
      response = await request.patch('/notification/mark-all-read', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    });

    await test.step('2. Verify response status code 200', async () => {
      expect(response.status()).toBe(200);
    });

    await test.step('3. Verify success message', async () => {
      const body = await response.json();
      validateSchema(body.meta, 'meta');
      expect(body.meta.message).toContain('Semua notifikasi');
    });
  });

  // ── NTF-05: Verify Unread Count after Mark All ──────────────
  test('NTF-05: Verify Unread Count after Mark All', { tag: ['@regression'] }, async ({ request }) => {
    allure.epic('Notification');
    allure.feature('Get Notifications');
    allure.story('NTF-05: Verify Unread Count is 0');
    allure.label('severity', 'normal');

    await test.step('1. Send GET /notification/unread-count', async () => {
      response = await request.get('/notification/unread-count', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    });

    await test.step('2. Verify response status code 200', async () => {
      expect(response.status()).toBe(200);
    });

    await test.step('3. Verify unread count is exactly 0', async () => {
      const body = await response.json();
      validateSchema(body.meta, 'meta');
      validateSchema(body.data, 'unreadCount');
      expect(body.data.count).toBe(0);
    });
  });

  // ── NTF-06: Mark as Read - Not Found ────────────────────────
  test('NTF-06: Mark as Read - Not Found', { tag: ['@regression'] }, async ({ request }) => {
    allure.epic('Notification');
    allure.feature('Mark Read');
    allure.story('NTF-06: Mark Read - Not Found');
    allure.label('severity', 'normal');

    const fakeId = '000000000000000000000000';

    await test.step('1. Send PATCH /notification/:fakeId/mark-as-read', async () => {
      response = await request.patch(`/notification/${fakeId}/mark-as-read`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    });

    await test.step('2. Verify response is error', async () => {
      const body = await response.json();
      validateSchema(body.meta, 'meta');
      expect(body.meta.message).toContain('tidak ditemukan');
    });
  });
});
