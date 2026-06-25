import test, { APIResponse, expect } from "@playwright/test";
import { TEST_USERS } from "../../helpers/test-data";
import * as allure from "allure-js-commons";

test.describe('Auth flow: Token & Session', () => {
    let accessToken: string;
    let refreshToken: string;
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
        refreshToken = body.data.refreshToken
    })

    test('AUTH-05: Refresh token valid', {tag: ['@smoke', '@regression']}, async ({request}) => {
        allure.epic('Auth')
        allure.feature('Token')
        allure.story('AUTH-05: Refresh token valid')
        allure.label('severity', 'critical')
        await test.step('1. Send POST /auth/refresh-token request', async () => {
            response = await request.post('/auth/refresh-token', {
                data: {
                    refreshToken: refreshToken
                }
            })
        })
        await test.step('2. Verify response status code', async () => {
            expect(response.status()).toBe(200)
        })
        await test.step('3. Verify response body', async () => {
            const body = await response.json()
            expect(body.data).toHaveProperty('accessToken'); 
        })
    })

    test('AUTH-06: Refresh token empty', {tag: ['@regression']}, async ({request}) => {
        allure.epic('Auth')
        allure.feature('Token')
        allure.story('AUTH-06: Refresh token empty')
        allure.label('severity', 'high')
        await test.step('1. Send POST /auth/refresh-token request', async () => {
            response = await request.post('/auth/refresh-token', {
                data: {
                    refreshToken: ''
                }
            })
        })
        await test.step('2. Verify response status code', async () => {
            expect(response.status()).not.toBe(200)
        })
        await test.step('3. Verify response body', async () => {
            const body = await response.json()
            expect(body.meta.message).toContain('Refresh token is required');
        })
    })

    test('AUTH-07: Logout valid', {tag: ['@regression']}, async ({request}) => {
        allure.epic('Auth')
        allure.feature('Token')
        allure.story('AUTH-07: Logout valid')
        allure.label('severity', 'critical')
        await test.step('1. Send POST /auth/logout request', async () => {
            response = await request.post('/auth/logout', {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                }
            })
        })
        await test.step('2. Verify response status code', async () => {
            expect(response.status()).toBe(200)
        })
        await test.step('3. Verify response body', async () => {
            const body = await response.json()
            expect(body.meta.message).toContain('Logout successful'); 
        })
    })

    test('AUTH-08: Access endpoint after logout', {tag: ['@regression']}, async ({request}) => {
        allure.epic('Auth')
        allure.feature('Token')
        allure.story('AUTH-08: Access endpoint after logout')
        allure.label('severity', 'high')
        await test.step('1. Send GET /auth/me request', async () => {
            response = await request.get('/auth/me', {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                }
            })
        })
        await test.step('2. Verify response status code', async () => {
            expect(response.status()).toBe(404)
        })
    })

})