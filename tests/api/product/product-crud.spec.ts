import { test, expect, APIResponse } from '@playwright/test';
import { validateSchema } from '../../helpers/schema';
import { TEST_USERS, SAMPLE_DATA, uniqueName } from '../../helpers/test-data';
import * as allure from 'allure-js-commons';

test.describe.serial('Product CRUD Flow', () => {
  let response: APIResponse;
  let adminToken: string;
  let cashierToken: string;
  let categoryId: string;
  let createdProductId: string;
  let createdProductName: string;
  let createdProductSku: string;
  let discountedProductId: string;
  const createdProductIds: string[] = [];

  // ── Setup: Login admin + create category dependency ─────────
  test.beforeAll(async ({ request }) => {
    // 1. Login admin
    const loginRes = await request.post('/auth/login', {
      data: {
        username: TEST_USERS.ADMIN.username,
        password: TEST_USERS.ADMIN.password,
      },
    });
    expect(loginRes.status()).toBe(200);
    const loginBody = await loginRes.json();
    adminToken = loginBody.data.accessToken;

    // 2. Create category sebagai dependency product
    const catRes = await request.post('/category', {
      data: {
        name: SAMPLE_DATA.category.name(),
        imageUrl: null,
        imageFileId: null,
      },
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(catRes.status()).toBe(200);
    const catBody = await catRes.json();
    categoryId = catBody.data._id;
  });

  // ── Teardown: Cleanup products & category ───────────────────
  test.afterAll(async ({ request }) => {
    // Cleanup products
    for (const id of createdProductIds) {
      await request.delete(`/product/${id}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      }).catch(() => {});
    }
    // Cleanup category
    if (categoryId) {
      await request.delete(`/category/${categoryId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      }).catch(() => {});
    }
  });

  // ── PRD-01: Create Product - Validation Error (Empty Body) ──
  test('PRD-01: Create Product - Validation Error (Empty Body)', { tag: ['@regression'] }, async ({ request }) => {
    allure.epic('Product');
    allure.feature('Create Product');
    allure.story('PRD-01: Validation Error (Empty Body)');
    allure.label('severity', 'critical');

    await test.step('1. Send POST /product with empty body', async () => {
      response = await request.post('/product', {
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
      expect(body.errors).toHaveProperty('basePrice');
      expect(body.errors).toHaveProperty('costPrice');
      expect(body.errors).toHaveProperty('stock');
      expect(body.errors).toHaveProperty('category');
    });
  });

  // ── PRD-02: Create Product - basePrice < costPrice ──────────
  test('PRD-02: Create Product - Business Rule (basePrice < costPrice)', { tag: ['@regression'] }, async ({ request }) => {
    allure.epic('Product');
    allure.feature('Create Product');
    allure.story('PRD-02: Business Rule (basePrice < costPrice)');
    allure.label('severity', 'critical');

    await test.step('1. Send POST /product with basePrice < costPrice', async () => {
      response = await request.post('/product', {
        data: {
          name: uniqueName('InvalidPrice'),
          sku: uniqueName('SKU_INVALID'),
          category: categoryId,
          basePrice: 10000,
          costPrice: 50000,
          stock: 10,
          minStock: 5,
        },
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    });

    await test.step('2. Verify response status code 400', async () => {
      expect(response.status()).toBe(400);
    });

    await test.step('3. Verify error message about price', async () => {
      const body = await response.json();
      validateSchema(body.meta, 'meta');
      expect(body.meta.message).toContain('tidak boleh lebih rendah');
    });
  });

  // ── PRD-03: Create Product - Success ────────────────────────
  test('PRD-03: Create Product - Success', { tag: ['@smoke', '@regression'] }, async ({ request }) => {
    allure.epic('Product');
    allure.feature('Create Product');
    allure.story('PRD-03: Create Product - Success');
    allure.label('severity', 'critical');

    const productData = SAMPLE_DATA.product(categoryId);
    createdProductName = productData.name;
    createdProductSku = productData.sku;

    await test.step('1. Send POST /product with valid data', async () => {
      response = await request.post('/product', {
        data: productData,
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    });

    await test.step('2. Verify response status code 200', async () => {
      expect(response.status()).toBe(200);
    });

    await test.step('3. Verify response body & schema', async () => {
      const body = await response.json();
      validateSchema(body.meta, 'meta');
      validateSchema(body.data, 'product');
      expect(body.meta.message).toContain('Produk berhasil ditambahkan');
      expect(body.data.name).toBe(createdProductName);
      expect(body.data.sku).toBe(createdProductSku);
      expect(body.data.basePrice).toBe(50000);
      expect(body.data.price).toBe(50000); // no discount → price = basePrice
      createdProductId = body.data._id;
      createdProductIds.push(createdProductId);
    });
  });

  // ── PRD-04: Create Product - Duplicate Name ─────────────────
  test('PRD-04: Create Product - Duplicate Name', { tag: ['@regression'] }, async ({ request }) => {
    allure.epic('Product');
    allure.feature('Create Product');
    allure.story('PRD-04: Duplicate Name');
    allure.label('severity', 'critical');

    await test.step('1. Send POST /product with duplicate name', async () => {
      response = await request.post('/product', {
        data: {
          name: createdProductName,
          sku: uniqueName('SKU_DUP'),
          category: categoryId,
          basePrice: 50000,
          costPrice: 30000,
          stock: 10,
          minStock: 5,
        },
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    });

    await test.step('2. Verify response is error (duplicate)', async () => {
      expect([409, 500]).toContain(response.status());
      const body = await response.json();
      validateSchema(body.meta, 'meta');
    });
  });

  // ── PRD-05: Create Product - With Discount (Price Calc) ─────
  test('PRD-05: Create Product - With Discount (Price Calculation)', { tag: ['@regression'] }, async ({ request }) => {
    allure.epic('Product');
    allure.feature('Create Product');
    allure.story('PRD-05: Price Calculation with Discount');
    allure.label('severity', 'critical');

    const basePrice = 100000;
    const discount = 20; // 20%
    const expectedPrice = basePrice - (basePrice * discount / 100); // 80000

    await test.step('1. Send POST /product with 20% discount', async () => {
      response = await request.post('/product', {
        data: {
          name: uniqueName('DiscountProduct'),
          sku: uniqueName('SKU_DISC'),
          category: categoryId,
          basePrice,
          costPrice: 50000,
          discount,
          stock: 50,
          minStock: 5,
        },
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    });

    await test.step('2. Verify response status code 200', async () => {
      expect(response.status()).toBe(200);
    });

    await test.step('3. Verify price is calculated correctly', async () => {
      const body = await response.json();
      validateSchema(body.meta, 'meta');
      validateSchema(body.data, 'product');
      expect(body.data.basePrice).toBe(basePrice);
      expect(body.data.discount).toBe(discount);
      expect(body.data.price).toBe(expectedPrice);
      discountedProductId = body.data._id;
      createdProductIds.push(discountedProductId);
    });
  });

  // ── PRD-06: Find All Products ───────────────────────────────
  test('PRD-06: Find All Products', { tag: ['@smoke', '@regression'] }, async ({ request }) => {
    allure.epic('Product');
    allure.feature('Find All Products');
    allure.story('PRD-06: Find All Products');
    allure.label('severity', 'critical');

    await test.step('1. Send GET /product', async () => {
      response = await request.get('/product', {
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

      // Verify category is populated
      const firstItem = body.data[0];
      expect(firstItem.category).toHaveProperty('name');
    });
  });

  // ── PRD-07: Find All Products - Search by Name ──────────────
  test('PRD-07: Find All Products - Search by Name', { tag: ['@regression'] }, async ({ request }) => {
    allure.epic('Product');
    allure.feature('Find All Products');
    allure.story('PRD-07: Search by Name');
    allure.label('severity', 'normal');

    await test.step('1. Send GET /product with search query', async () => {
      response = await request.get(`/product?search=${createdProductName}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    });

    await test.step('2. Verify response status code 200', async () => {
      expect(response.status()).toBe(200);
    });

    await test.step('3. Verify search results contain matching product', async () => {
      const body = await response.json();
      validateSchema(body.meta, 'meta');
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(1);

      const found = body.data.some(
        (product: any) => product.name === createdProductName
      );
      expect(found).toBe(true);
    });
  });

  // ── PRD-08: Find All Products - Filter by Category ──────────
  test('PRD-08: Find All Products - Filter by Category', { tag: ['@regression'] }, async ({ request }) => {
    allure.epic('Product');
    allure.feature('Find All Products');
    allure.story('PRD-08: Filter by Category');
    allure.label('severity', 'normal');

    await test.step('1. Send GET /product with category filter', async () => {
      response = await request.get(`/product?category=${categoryId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    });

    await test.step('2. Verify response status code 200', async () => {
      expect(response.status()).toBe(200);
    });

    await test.step('3. Verify all results belong to the category', async () => {
      const body = await response.json();
      validateSchema(body.meta, 'meta');
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(1);

      // All products should belong to our category
      for (const product of body.data) {
        expect(product.category._id).toBe(categoryId);
      }
    });
  });

  // ── PRD-09: Find One Product ────────────────────────────────
  test('PRD-09: Find One Product', { tag: ['@smoke', '@regression'] }, async ({ request }) => {
    allure.epic('Product');
    allure.feature('Find One Product');
    allure.story('PRD-09: Find One Product');
    allure.label('severity', 'critical');

    await test.step('1. Send GET /product/:id', async () => {
      response = await request.get(`/product/${createdProductId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    });

    await test.step('2. Verify response status code 200', async () => {
      expect(response.status()).toBe(200);
    });

    await test.step('3. Verify response body with populated category', async () => {
      const body = await response.json();
      validateSchema(body.meta, 'meta');
      validateSchema(body.data, 'product');
      expect(body.data._id).toBe(createdProductId);
      expect(body.data.name).toBe(createdProductName);
      expect(body.data.category).toHaveProperty('name');
    });
  });

  // ── PRD-10: Find One Product - Not Found ────────────────────
  test('PRD-10: Find One Product - Not Found', { tag: ['@regression'] }, async ({ request }) => {
    allure.epic('Product');
    allure.feature('Find One Product');
    allure.story('PRD-10: Not Found');
    allure.label('severity', 'normal');

    const fakeId = '000000000000000000000000';

    await test.step('1. Send GET /product/:fakeId', async () => {
      response = await request.get(`/product/${fakeId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    });

    await test.step('2. Verify response is 404', async () => {
      expect(response.status()).toBe(404);
      const body = await response.json();
      validateSchema(body.meta, 'meta');
      expect(body.meta.message).toContain('tidak ditemukan');
    });
  });

  // ── PRD-11: Find Product by SKU ─────────────────────────────
  test('PRD-11: Find Product by SKU', { tag: ['@smoke', '@regression'] }, async ({ request }) => {
    allure.epic('Product');
    allure.feature('Find by SKU');
    allure.story('PRD-11: Find Product by SKU');
    allure.label('severity', 'critical');

    await test.step('1. Send GET /product/sku/:sku', async () => {
      response = await request.get(`/product/sku/${createdProductSku}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    });

    await test.step('2. Verify response status code 200', async () => {
      expect(response.status()).toBe(200);
    });

    await test.step('3. Verify correct product returned', async () => {
      const body = await response.json();
      validateSchema(body.meta, 'meta');
      validateSchema(body.data, 'product');
      expect(body.data.sku).toBe(createdProductSku);
      expect(body.data._id).toBe(createdProductId);
    });
  });

  // ── PRD-12: Find Product by SKU - Not Found ─────────────────
  test('PRD-12: Find Product by SKU - Not Found', { tag: ['@regression'] }, async ({ request }) => {
    allure.epic('Product');
    allure.feature('Find by SKU');
    allure.story('PRD-12: SKU Not Found');
    allure.label('severity', 'normal');

    await test.step('1. Send GET /product/sku/FAKE_SKU_999', async () => {
      response = await request.get('/product/sku/FAKE_SKU_999', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    });

    await test.step('2. Verify response is 404', async () => {
      expect(response.status()).toBe(404);
      const body = await response.json();
      validateSchema(body.meta, 'meta');
      expect(body.meta.message).toContain('tidak ditemukan');
    });
  });

  // ── PRD-13: Update Product - Success ────────────────────────
  test('PRD-13: Update Product - Success', { tag: ['@smoke', '@regression'] }, async ({ request }) => {
    allure.epic('Product');
    allure.feature('Update Product');
    allure.story('PRD-13: Update Product - Success');
    allure.label('severity', 'critical');

    const updatedName = uniqueName('UpdatedProduct');

    await test.step('1. Send PUT /product/:id with updated name', async () => {
      response = await request.put(`/product/${createdProductId}`, {
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
      expect(body.meta.message).toContain('Produk berhasil diperbarui');
      expect(body.data.name).toBe(updatedName);
      expect(body.data._id).toBe(createdProductId);

      createdProductName = updatedName;
    });
  });

  // ── PRD-14: Update Product - Not Found ──────────────────────
  test('PRD-14: Update Product - Not Found', { tag: ['@regression'] }, async ({ request }) => {
    allure.epic('Product');
    allure.feature('Update Product');
    allure.story('PRD-14: Not Found');
    allure.label('severity', 'normal');

    const fakeId = '000000000000000000000000';

    await test.step('1. Send PUT /product/:fakeId', async () => {
      response = await request.put(`/product/${fakeId}`, {
        data: { name: 'Ghost Product' },
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    });

    await test.step('2. Verify response is 404', async () => {
      expect(response.status()).toBe(404);
      const body = await response.json();
      validateSchema(body.meta, 'meta');
      expect(body.meta.message).toContain('tidak ditemukan');
    });
  });

  // ── PRD-15: Delete Product (Soft Delete) - Success ──────────
  test('PRD-15: Delete Product (Soft Delete) - Success', { tag: ['@smoke', '@regression'] }, async ({ request }) => {
    allure.epic('Product');
    allure.feature('Delete Product');
    allure.story('PRD-15: Soft Delete - Success');
    allure.label('severity', 'critical');

    await test.step('1. Send DELETE /product/:id', async () => {
      response = await request.delete(`/product/${createdProductId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    });

    await test.step('2. Verify response status code 200', async () => {
      expect(response.status()).toBe(200);
    });

    await test.step('3. Verify soft delete response', async () => {
      const body = await response.json();
      validateSchema(body.meta, 'meta');
      expect(body.meta.message).toContain('Produk berhasil dinonaktifkan');
    });
  });

  // ── PRD-16: Cashier Can Read but Cannot Create Product ──────
  test('PRD-16: Cashier Can Read but Cannot Create Product', { tag: ['@regression'] }, async ({ request }) => {
    allure.epic('Product');
    allure.feature('Authorization');
    allure.story('PRD-16: Cashier Authorization');
    allure.label('severity', 'critical');

    await test.step('1. Login as cashier', async () => {
      const loginRes = await request.post('/auth/login', {
        data: {
          username: TEST_USERS.CASHIER.username,
          password: TEST_USERS.CASHIER.password,
        },
      });
      expect(loginRes.status()).toBe(200);
      const loginBody = await loginRes.json();
      cashierToken = loginBody.data.accessToken;
      expect(cashierToken).toBeTruthy();
    });

    await test.step('2. Cashier CAN read products (GET /product)', async () => {
      response = await request.get('/product', {
        headers: { Authorization: `Bearer ${cashierToken}` },
      });
      expect(response.status()).toBe(200);
      const body = await response.json();
      validateSchema(body.meta, 'meta');
      expect(Array.isArray(body.data)).toBe(true);
    });

    await test.step('3. Cashier CANNOT create product (POST /product)', async () => {
      response = await request.post('/product', {
        data: SAMPLE_DATA.product(categoryId),
        headers: { Authorization: `Bearer ${cashierToken}` },
      });
      expect(response.status()).toBe(500);
      const body = await response.json();
      validateSchema(body.meta, 'meta');
      expect(body.meta.message).toContain('Forbidden');
    });
  });
});
