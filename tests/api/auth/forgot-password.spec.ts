import test, { APIResponse, expect } from "@playwright/test";
import * as allure from "allure-js-commons";


test.describe('Auth flow: Forgot & Reset Password', () => {
    let response: APIResponse

    test('AUTH-15: Forgot password with valid email', {tag: ['@regression']}, async ({request}) => {
        allure.epic("Auth");
        allure.feature("Forgot Password");
        allure.story("AUTH-15: Forgot password - email valid");
        allure.label("severity", "critical");

        await test.step('1. Send POST /auth/forgot-password', async () => {
            response = await request.post('/auth/forgot-password', {
                data: { email: 'admin@test.com' } 
            });
        });

        await test.step('2. Verify status 200', async () => {
            expect(response.status()).toBe(200);
        });

        await test.step('3. Verify security message', async () => {
            const body = await response.json();
            expect(body.meta.message).toContain('instruksi pemulihan kata sandi');
        });
    })

    test('AUTH-16: Forgot password with email empty', {tag: ['@regression']}, async ({request}) => {
        allure.epic("Auth");
        allure.feature("Forgot Password");
        allure.story("AUTH-16: Forgot password - email empty");
        allure.label("severity", "normal");

        await test.step('1. Send POST /auth/forgot-password', async () => {
            response = await request.post('/auth/forgot-password', {
                data: { email: '' } 
            });
        });

        await test.step('2. Verify status 400', async () => {
            expect(response.status()).toBe(400);
        });

        await test.step('3. Verify error message', async () => {
            const body = await response.json();
            expect(body.errors.email).toBe('Email is required');
        });
    })

    test('AUTH-17: Forgot password with email invalid format', {tag: ['@regression']}, async ({request}) => {
        allure.epic("Auth");
        allure.feature("Forgot Password");
        allure.story("AUTH-17: Forgot password - email invalid format");
        allure.label("severity", "normal");

        await test.step('1. Send POST /auth/forgot-password', async () => {
            response = await request.post('/auth/forgot-password', {
                data: { email: 'invalid-email.com' } 
            });
        });

        await test.step('2. Verify status 400', async () => {
            expect(response.status()).toBe(400);
        });

        await test.step('3. Verify error message', async () => {
            const body = await response.json();
            expect(body.errors.email).toBe('Invalid email format');
        });
    })
    
    test('AUTH-18: Forgot password with email not registered', {tag: ['@regression']}, async ({request}) => {
        allure.epic("Auth");
        allure.feature("Forgot Password");
        allure.story("AUTH-18: Forgot password - email not registered");
        allure.label("severity", "normal");

        await test.step('1. Send POST with unregistered email', async () => {
            response = await request.post('/auth/forgot-password', {
                data: { email: `notexist_${Date.now()}@example.com` }
            });
        });

        await test.step('2. Verify return 200', async () => {
            expect(response.status()).toBe(200);
        });

        await test.step('3. Verify return same message with email valid', async () => {
            const body = await response.json();
            expect(body.meta.message).toContain('instruksi pemulihan kata sandi');
        });
    })
    
    test('AUTH-19: Reset password - token invalid', {tag: ['@regression']}, async ({request}) => {
        allure.epic('Auth')
        allure.feature('Forgot Password')
        allure.story('AUTH-19: Reset password - token invalid')
        allure.label('severity', 'normal')

        await test.step('1. Send POST /auth/reset-password', async () => {
            response = await request.post('/auth/reset-password', {
                data: {
                    token: 'ini-token-asal-asalan-yang-tidak-valid',
                    newPassword: 'NewPassword123',
                    confirmPassword: 'NewPassword123'
                }
            });
        });

        await test.step('2. Verify status 400', async () => {
            expect(response.status()).toBe(400);
        });

        await test.step('3. Verify error message', async () => {
            const body = await response.json();
            expect(body.message).toContain('tidak valid atau telah kedaluwarsa');
        });
    })

    test('AUTH-20: Reset password - token empty', {tag: ['@regression']}, async ({request}) => {
        allure.epic('Auth')
        allure.feature('Forgot Password')
        allure.story('AUTH-20: Reset password - token empty')
        allure.label('severity', 'critical')

         await test.step('1. Send POST /auth/reset-password', async () => {
            response = await request.post('/auth/reset-password', {
                data: {
                    token: '',
                    newPassword: 'NewPassword123',
                    confirmPassword: 'NewPassword123'
                }
            });
        });

        await test.step('2. Verify status 400', async () => {
            expect(response.status()).toBe(400);
        });
    })

    test('AUTH-21: Reset password - password is too short', {tag: ['@regression']}, async ({request}) => {
        allure.epic('Auth')
        allure.feature('Forgot Password')
        allure.story('AUTH-21: Reset password - password is too short')
        allure.label('severity', 'normal')

        await test.step('1. Send POST /auth/reset-password', async () => {
            response = await request.post('/auth/reset-password', {
                data: {
                    token: 'ini-token-asal-asalan-yang-tidak-valid',
                    newPassword: '123',
                    confirmPassword: '123'
                }
            });
        });

        await test.step('2. Verify status 400', async () => {
            expect(response.status()).toBe(400);
        });
    })

})

    