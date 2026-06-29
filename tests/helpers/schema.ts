type SchemaField = {
  field: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required?: boolean;
};

const SCHEMAS: Record<string, SchemaField[]> = {

  // POST /auth/login → body.data
  login: [
    { field: 'accessToken', type: 'string', required: true },
    { field: 'refreshToken', type: 'string', required: true },
  ],

  // GET /auth/profile → body.data
  profile: [
    { field: '_id', type: 'string', required: true },
    { field: 'username', type: 'string', required: true },
    { field: 'name', type: 'string', required: true },
    { field: 'role', type: 'string', required: true },
  ],

  // POST /user → body.data
  user: [
    { field: '_id', type: 'string', required: true },
    { field: 'name', type: 'string', required: true },
    { field: 'username', type: 'string', required: true },
    { field: 'role', type: 'string', required: true },
  ],

  // POST /category → body.data
  category: [
    { field: '_id', type: 'string', required: true },
    { field: 'name', type: 'string', required: true },
  ],

  // POST /product → body.data
  product: [
    { field: '_id', type: 'string', required: true },
    { field: 'name', type: 'string', required: true },
    { field: 'sku', type: 'string', required: true },
    { field: 'basePrice', type: 'number', required: true },
    { field: 'costPrice', type: 'number', required: true },
    { field: 'price', type: 'number', required: true },
    { field: 'stock', type: 'number', required: true },
  ],

  // POST /transaction → body.data
  transaction: [
    { field: '_id', type: 'string', required: true },
    { field: 'transactionNumber', type: 'string', required: true },
    { field: 'totalAmount', type: 'number', required: true },
    { field: 'payAmount', type: 'number', required: true },
    { field: 'changeAmount', type: 'number', required: true },
    { field: 'items', type: 'array', required: true },
  ],

  // GET /report/sales-summary -> body.data
  salesSummary: [
    { field: 'totalRevenue', type: 'number', required: true },
    { field: 'totalCost', type: 'number', required: true },
    { field: 'netProfit', type: 'number', required: true },
    { field: 'margin', type: 'number', required: true },
    { field: 'revenueTrend', type: 'number', required: true },
    { field: 'totalTransactions', type: 'number', required: true },
    { field: 'dailyStats', type: 'array', required: true },
  ],

  // GET /report/top-products -> body.data elements
  topProduct: [
    { field: '_id', type: 'string', required: true },
    { field: 'name', type: 'string', required: true },
    { field: 'totalQty', type: 'number', required: true },
    { field: 'totalRevenue', type: 'number', required: true },
    { field: 'totalCost', type: 'number', required: true },
    { field: 'profit', type: 'number', required: true },
    { field: 'margin', type: 'number', required: true },
  ],

  // GET /notification -> body.data elements
  notification: [
    { field: '_id', type: 'string', required: true },
    { field: 'title', type: 'string', required: true },
    { field: 'message', type: 'string', required: true },
    { field: 'isRead', type: 'boolean', required: true },
  ],

  // GET /notification/unread-count -> body.data
  unreadCount: [
    { field: 'count', type: 'number', required: true },
  ],

  // Response meta (semua endpoint)
  meta: [
    { field: 'status', type: 'number', required: true },
    { field: 'message', type: 'string', required: true },
  ],

  // Response errors (validasi dinamis)
  errors: [
    { field: 'email', type: 'string', required: false },
    { field: 'confirmPassword', type: 'string', required: false },
    { field: 'username', type: 'string', required: false },
    { field: 'name', type: 'string', required: false },
    { field: 'password', type: 'string', required: false },
  ],

  // Pagination response
  pagination: [
    { field: 'total', type: 'number', required: true },
    { field: 'totalPages', type: 'number', required: true },
    { field: 'currentPage', type: 'number', required: true },
  ],
};

export function validateSchema(data: any, schemaName: string) {
  const schema = SCHEMAS[schemaName];
  if (!schema) {
    throw new Error(`Schema "${schemaName}" tidak ditemukan. Tambahkan di schema.ts`);
  }

  for (const field of schema) {
    if (field.required && !(field.field in data)) {
      throw new Error(`Field "${field.field}" tidak ada di response`);
    }

    if (data[field.field] !== undefined && data[field.field] !== null) {
      if (field.type === 'array') {
        if (!Array.isArray(data[field.field])) {
          throw new Error(`Field "${field.field}" harusnya array, tapi dapat ${typeof data[field.field]}`);
        }
      } else {
        if (typeof data[field.field] !== field.type) {
          throw new Error(`Field "${field.field}" harusnya ${field.type}, tapi dapat ${typeof data[field.field]}`);
        }
      }
    }
  }
}
