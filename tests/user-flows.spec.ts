import { test, expect } from '@playwright/test';
import {
  loginWithEmailPassword,
  logoutFromApp,
  requireE2eEnv,
} from './helpers/auth';

test.beforeAll(() => {
  requireE2eEnv();
});

test.describe('User flows', () => {
  test.describe.configure({ mode: 'serial' });

  test('login page loads', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    await expect(page.locator('#login-email')).toBeVisible();
    await expect(page.locator('#login-password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Continue with Google' })).toBeVisible();
  });

  test('email and password login works', async ({ page }) => {
    await loginWithEmailPassword(page);

    await expect(page.getByText('Signed in as')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
  });

  test('dashboard loads after login', async ({ page }) => {
    await loginWithEmailPassword(page);

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole('heading', { name: 'AI Meeting Assistant' })).toBeVisible();
    await expect(page.getByText('Upload Recording')).toBeVisible();
  });

  test('past meetings section is visible', async ({ page }) => {
    await loginWithEmailPassword(page);

    await expect(page.getByText('Past Meetings')).toBeVisible();
    await expect(page.getByRole('searchbox', { name: 'Search recordings' })).toBeVisible();
  });

  test('settings page loads', async ({ page }) => {
    await loginWithEmailPassword(page);

    const settingsLink = page.getByRole('link', { name: 'Settings' });
    await expect(
      settingsLink,
      'Settings nav link requires an ADMIN test user. Use an ADMIN account or skip this test.',
    ).toBeVisible();

    await settingsLink.click();
    await expect(page).toHaveURL(/\/settings/);
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
    await expect(page.getByText('Jira credentials')).toBeVisible();
  });

  test('logout works', async ({ page }) => {
    await loginWithEmailPassword(page);

    await logoutFromApp(page);

    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    await expect(page.locator('#login-email')).toBeVisible();
  });
});
