import test, { APIResponse, expect } from "@playwright/test";
import { TEST_USERS, uniqueName } from "../../helpers/test-data";
import * as allure from "allure-js-commons";
import { validateSchema } from "../../helpers/schema";

test.describe('Auth flow: Profile', () => {
    let accessToken: string;
    let response: APIResponse;

    test.beforeAll(async ({request}) => {

        response = await request.post('/auth/login', {
            data: {
                username: TEST_USERS.ADMIN.username,
                password: TEST_USERS.ADMIN.password,
            }
        })

        const body = await response.json()

        accessToken = body.data.accessToken
    })

    test('AUTH-09: Get profile valid', { tag: ['@regression'] }, async ({request}) => {
        allure.epic("Auth")
        allure.feature("Profile")
        allure.story("AUTH-09: Get profile valid")
        allure.label("severity", "critical")
        await test.step('1. Send GET /auth/profile request', async () => {
            response = await request.get('/auth/profile', {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
        });
        await test.step('2. Verify response status code', async () => {
            expect(response.status()).toBe(200);
        });
        await test.step('3. Verify response body', async () => {
            const body = await response.json();
            validateSchema(body.meta, 'meta');
            validateSchema(body.data, 'profile');
            expect(body.data.username).toBe(TEST_USERS.ADMIN.username);
        });
    })

    test('AUTH-10: Get profile without token', {tag: ['@regression']}, async ({request}) => {
        allure.epic("Auth")
        allure.feature("Profile")
        allure.story("AUTH-10: Get profile without token")
        allure.label("severity", "normal")
        await test.step('1. Send GET /auth/profile request', async () => {
            response = await request.get('/auth/profile')
        })
        await test.step('2. Verify response status code', async () => {
            expect(response.status()).toBe(401);
        })
        await test.step('3. Verify response body', async () => {
            const body = await response.json()
            validateSchema(body.meta, 'meta');
            expect(body.meta.message).toBe('Unauthorized access');
        })
    })

    test('AUTH-11: Update profile valid', {tag: ['@regression']}, async ({request}) => {
        allure.epic("Auth")
        allure.feature("Profile")
        allure.story("AUTH-11: Update profile valid")
        allure.label("severity", "normal")

        const newName = uniqueName('AdminUpdate')
        await test.step('1. Send PATCH /auth/update-profile request', async () => {
            response = await request.patch('/auth/update-profile', {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
                data: {
                    name: newName,
                    username: TEST_USERS.ADMIN.username,
                }
            })
        })

        await test.step('2. Verify response status code', async () => {
            expect(response.status()).toBe(200);
        })
        await test.step('3. Verify response body', async () => {
            const body = await response.json();
            validateSchema(body.meta, 'meta');
            validateSchema(body.data, 'profile');
            expect(body.data.name).toBe(newName);
        })
    })

    test('AUTH-12: Update profile invalid', {tag: ['@regression']}, async ({request}) => {
        allure.epic("Auth")
        allure.feature("Profile")
        allure.story("AUTH-12: Update profile invalid")
        allure.label("severity", "normal")

        await test.step('1. Send PATCH /auth/update-profile request', async () => {
            response = await request.patch('/auth/update-profile', {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
                data: {
                    email: 'invalid-email-format.com',
                    username: TEST_USERS.ADMIN.username,
                    name: 'AdminUpdate',
                }
            })
        })

        await test.step('2. Verify response status code', async () => {
            expect(response.status()).toBe(400);
        })

        await test.step('3. Verify response body', async () => {
            const body = await response.json();
            validateSchema(body.meta, 'meta');
            validateSchema(body.errors, 'errors');
            expect(body.errors.email).toBe('Invalid email format');
        })
    })

    test('AUTH-13: Change password - old password wrong', {tag: ['@regression']}, async ({request}) => {
        allure.epic("Auth")
        allure.feature("Profile")
        allure.story("AUTH-13: Change password - old password wrong")
        allure.label("severity", "normal")

        const newPassword = TEST_USERS.ADMIN.password

        await test.step('1. Send PUT /auth/change-password request', async () => {
            response = await request.put('/auth/change-password', {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
                data: {
                    oldPassword: 'wrong-password',
                    newPassword: newPassword,
                    confirmPassword: newPassword,
                }
            })
        })

        await test.step('2. Verify response status code', async () => {
            expect(response.status()).toBe(401);
        })

        await test.step('3. Verify response body', async () => {
            const body = await response.json();
            validateSchema(body.meta, 'meta');
            expect(body.meta.message).toBe('Kata sandi lama salah');
        })
    })

    test('AUTH-14: Change password - confirmation not match', {tag: ['@regression']}, async ({request}) => {
        allure.epic("Auth")
        allure.feature("Profile")
        allure.story("AUTH-14: Change password - confirmation not match")
        allure.label("severity", "normal")

        const newPassword = TEST_USERS.ADMIN.password

        await test.step('1. Send PUT /auth/change-password request', async () => {
            response = await request.put('/auth/change-password', {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
                data: {
                    oldPassword: TEST_USERS.ADMIN.password,
                    newPassword: newPassword,
                    confirmPassword: 'wrong-password',
                }
            })
        })

        await test.step('2. Verify response status code', async () => {
            expect(response.status()).toBe(400);
        })

        await test.step('3. Verify response body', async () => {
            const body = await response.json();
            validateSchema(body.meta, 'meta');
            validateSchema(body.errors, 'errors');
            expect(body.errors.confirmPassword).toBe('Passwords must match');
        })
    })
})