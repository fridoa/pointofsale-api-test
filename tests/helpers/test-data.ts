/**
 * Centralized test data
 * Username & password harus match dengan user di database test (db_pos_test)
 */

export const TEST_USERS = {
  ADMIN: {
    username: 'admin',
    password: 'password123',
  },
  CASHIER: {
    username: 'kasir',
    password: 'password123',
  },
};

/**
 * Generate nama unik dengan timestamp supaya tidak duplikat
 * Contoh: uniqueName('TestCategory') → 'TestCategory_1719216000000'
 */
export function uniqueName(prefix: string): string {
  return `${prefix}_${Date.now()}`;
}

/**
 * Sample data untuk create operations
 * Menggunakan function agar setiap panggilan menghasilkan data unik
 */
export const SAMPLE_DATA = {
  category: {
    name: () => uniqueName('TestCategory'),
    imageUrl: null,
    imageFileId: null,
  },

  product: (categoryId: string) => ({
    name: uniqueName('TestProduct'),
    sku: uniqueName('SKU'),
    category: categoryId,
    basePrice: 50000,
    costPrice: 30000,
    price: 50000,
    discount: 0,
    stock: 100,
    minStock: 10,
    unit: 'pcs',
    description: 'Produk test dari Playwright',
    imageUrl: null,
    imageFileId: null,
  }),

  user: {
    name: () => uniqueName('TestKasir'),
    username: () => uniqueName('kasir_test'),
    email: () => `test_${Date.now()}@mail.com`,
    password: 'password123',
    role: 'kasir',
  },

  transaction: (productId: string) => ({
    items: [
      {
        productId,
        quantity: 1,
      },
    ],
    payAmount: 100000,
  }),
};
