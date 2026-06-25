import { test, expect, APIResponse } from '@playwright/test';
import { validateSchema } from '../../helpers/schema';
import { TEST_USERS } from '../../helpers/test-data';
import * as allure from "allure-js-commons";

test.describe('Auth Flow: Login', () => {
  let response: APIResponse;
  let token: string;

// test case 01: login invalid (username or password wrong)
    test('AUTH-01: Login Invalid', { tag: ['@regression'] }, async ({request}) => {
      allure.epic('Auth')
      allure.feature('Login')
      allure.story('AUTH-01: Login Invalid')
      allure.label('severity', 'critical')
      await test.step('1. Send POST /auth/login request', async () => {
      response = await request.post('/auth/login', {
            data: {
                username: TEST_USERS.ADMIN.username,
                password: 'wrong123'
            }
        })
    })
    await test.step('2. Verify response status code', async () => {
        expect(response.status()).toBe(401)
    })
    await test.step('3. Verify response body', async () => {
        const body = await response.json()
        validateSchema(body.meta, 'meta')
        expect(body.meta.message).toContain('Invalid username or password');
        expect(body.errors).toBeNull()
    })
    })

// test case 02: login with empty credential
    test('AUTH-02: Login with Empty Credential', { tag: ['@regression'] }, async ({request}) => {
      allure.epic('Auth')
      allure.feature('Login')
      allure.story('AUTH-02: Login with Empty Credential')
      allure.label('severity', 'critical')
      await test.step('1. Send POST /auth/login request', async () => {
        response = await request.post('/auth/login', {
            data: {
                username: '',
                password: ''
            }
        })
      })
      await test.step('2. Verify response status code', async () => {
        expect(response.status()).toBe(400)
      })
      await test.step('3. Verify response body', async () => {
        const body = await response.json()
        validateSchema(body.meta, 'meta')
        expect(body.meta.message).toContain('Validasi gagal.');
        expect(body.errors).toHaveProperty ('username')
        expect(body.errors).toHaveProperty('password')
      })
    })

// test case 03: admin login successfully
  test('AUTH-03: Admin Login Successfully', { tag: ['@smoke', '@regression'] }, async ({ request }) => {
    allure.epic('Auth')
    allure.feature('Login')
    allure.story('AUTH-03: Admin Login Successfully')
    allure.label('severity', 'critical')
    await test.step('1. Send POST /auth/login request', async () => {
    response = await request.post('/auth/login', {
      data: {
        username: TEST_USERS.ADMIN.username,
        password: TEST_USERS.ADMIN.password,
      },
    });
  })
  await test.step('2. Verify response status code', async () => {
    expect(response.status()).toBe(200);
  })
  await test.step('3. Verify response body', async () => {
    const body = await response.json();
    validateSchema(body.meta, 'meta');
    validateSchema(body.data, 'login');

    token = body.data.accessToken;
    })
  });

// test case 04: cashier login successfully
  test('AUTH-04: Cashier Login Successfully', { tag: ['@smoke', '@regression'] }, async ({ request }) => {
    allure.epic('Auth')
    allure.feature('Login')
    allure.story('AUTH-04: Cashier Login Successfully')
    allure.label('severity', 'critical')
    await test.step('1. Send POST /auth/login request', async () => {
    response = await request.post('/auth/login', {
      data: {
        username: TEST_USERS.CASHIER.username,
        password: TEST_USERS.CASHIER.password,
      },
    });
  })
  await test.step('2. Verify response status code', async () => {
    expect(response.status()).toBe(200);
  })
  await test.step('3. Verify response body', async () => {
    const body = await response.json();
    validateSchema(body.meta, 'meta');
    validateSchema(body.data, 'login');

    token = body.data.accessToken;
    })
  });
});
