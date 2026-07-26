import { Page } from '@playwright/test';

function isAuthConfigRequest(url: URL): boolean {
  return url.pathname.endsWith('/auth/config');
}

export async function mockPublicSignupConfig(
  page: Page,
  allowPublicSignup: boolean,
): Promise<void> {
  await page.route(isAuthConfigRequest, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: { allowPublicSignup },
        statusCode: 200,
        timestamp: new Date().toISOString(),
      }),
    });
  });
}
