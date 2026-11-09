import { test, expect, type Route } from '@playwright/test';

// The Supabase recover endpoint is stubbed so these tests never send real email.
const RECOVER = '**/auth/v1/recover**';

test.describe('admin login: forgot password', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/login');
  });

  test('asks for the email first when the field is empty', async ({ page }) => {
    let called = false;
    await page.route(RECOVER, (route) => { called = true; return route.fulfill({ json: {} }); });

    await page.getByRole('button', { name: 'Forgot password?' }).click();

    await expect(page.locator('#errorMessage')).toContainText('Enter your email above');
    await expect(page.locator('#email')).toBeFocused();
    expect(called).toBe(false);
  });

  test('rejects an invalid email without calling Supabase', async ({ page }) => {
    let called = false;
    await page.route(RECOVER, (route) => { called = true; return route.fulfill({ json: {} }); });

    await page.fill('#email', 'not-an-email');
    await page.getByRole('button', { name: 'Forgot password?' }).click();

    await expect(page.locator('#errorMessage')).toBeVisible();
    expect(called).toBe(false);
  });

  test('sends the reset request and confirms it', async ({ page, baseURL }) => {
    let request: { url: string; body: any } | undefined;
    await page.route(RECOVER, (route: Route) => {
      request = { url: route.request().url(), body: route.request().postDataJSON() };
      return route.fulfill({ json: {} });
    });

    await page.fill('#email', 'alaa@example.com');
    await page.getByRole('button', { name: 'Forgot password?' }).click();

    await expect(page.locator('#infoMessage')).toContainText('reset link is on its way');
    await expect(page.locator('#errorMessage')).toBeHidden();
    expect(request?.body.email).toBe('alaa@example.com');
    const redirect = new URL(request!.url).searchParams.get('redirect_to');
    expect(redirect).toBe(`${baseURL}/admin/set-password`);
  });

  test('shows the Supabase error, e.g. rate limiting', async ({ page }) => {
    await page.route(RECOVER, (route) =>
      route.fulfill({
        status: 429,
        json: { code: 429, error_code: 'over_email_send_rate_limit', msg: 'email rate limit exceeded' },
      }),
    );

    await page.fill('#email', 'alaa@example.com');
    await page.getByRole('button', { name: 'Forgot password?' }).click();

    await expect(page.locator('#errorMessage')).toContainText('rate limit');
    await expect(page.locator('#infoMessage')).toBeHidden();
    await expect(page.getByRole('button', { name: 'Forgot password?' })).toBeEnabled();
  });

  test('does not submit the login form', async ({ page }) => {
    let signInCalled = false;
    await page.route('**/auth/v1/token**', (route) => { signInCalled = true; return route.abort(); });
    await page.route(RECOVER, (route) => route.fulfill({ json: {} }));

    await page.fill('#email', 'alaa@example.com');
    await page.getByRole('button', { name: 'Forgot password?' }).click();

    await expect(page.locator('#infoMessage')).toBeVisible();
    expect(signInCalled).toBe(false);
    await expect(page).toHaveURL(/\/admin\/login$/);
  });
});
