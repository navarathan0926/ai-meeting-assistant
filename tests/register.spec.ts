import { test, expect } from '@playwright/test';
import { requireE2eEnv } from './helpers/auth';
import { mockPublicSignupConfig } from './helpers/auth-config';

test.beforeAll(() => {
  requireE2eEnv();
});

test.describe('Register page', () => {
  test('loads when public signup is enabled', async ({ page }) => {
    await mockPublicSignupConfig(page, true);
    await page.goto('/register', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: 'Create account' })).toBeVisible();
    await expect(page.locator('#reg-name')).toBeVisible();
    await expect(page.locator('#reg-email')).toBeVisible();
    await expect(page.locator('#reg-password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Account' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Continue with Google' })).toBeVisible();
  });

  test('redirects to login when public signup is disabled', async ({ page }) => {
    await mockPublicSignupConfig(page, false);

    await Promise.all([
      page.waitForURL(/\/login/),
      page.goto('/register'),
    ]);

    await expect(
      page.getByText('Public registration is disabled. Contact your organization admin for access.'),
    ).toBeVisible();
  });
});
