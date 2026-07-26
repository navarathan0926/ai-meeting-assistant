import { expect, Page } from '@playwright/test';

const REQUIRED_ENV = [
  'PLAYWRIGHT_BASE_URL',
  'E2E_TEST_EMAIL',
  'E2E_TEST_PASSWORD',
] as const;

export function requireE2eEnv(): void {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]?.trim());

  if (missing.length > 0) {
    throw new Error(
      `Missing E2E environment variables: ${missing.join(', ')}. ` +
        'Copy e2e.env.example to .env.e2e for local runs, or configure GitHub secrets for CI.',
    );
  }
}

export function getE2eCredentials(): { email: string; password: string } {
  requireE2eEnv();

  return {
    email: process.env.E2E_TEST_EMAIL!.trim(),
    password: process.env.E2E_TEST_PASSWORD!.trim(),
  };
}

export async function loginWithEmailPassword(page: Page): Promise<void> {
  const { email, password } = getE2eCredentials();

  await page.goto('/login');
  await page.locator('#login-email').fill(email);
  await page.locator('#login-password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

export async function logoutFromApp(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/login/);
}
