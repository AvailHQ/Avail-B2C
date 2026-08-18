import { expect, test, type Page } from '@playwright/test';

/**
 * Success-page states (UI-01–07).
 *
 * The reservation lookup is controlled by intercepting the Convex HTTP query
 * rather than by adding a test seam to the component, so these run offline and
 * never depend on real Stripe or Convex state.
 */

const SESSION = 'cs_test_playwright';

type Lookup = Record<string, unknown>;

/** Serve a fixed reservation lookup result to the page. */
async function mockLookup(page: Page, value: Lookup) {
  await page.route('**/api/query', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'success', value }),
    });
  });
}

/** Make the lookup fail, as if Convex were unreachable. */
async function failLookup(page: Page, onRequest?: () => void) {
  await page.route('**/api/query', async (route) => {
    onRequest?.();
    await route.fulfill({ status: 500, contentType: 'application/json', body: '{}' });
  });
}

const paidValue = {
  found: true,
  status: 'paid',
  name: 'Robin Fields',
  email: 'robin@example.com',
  confirmationEmailSent: true,
};

test.describe('success page states', () => {
  test('UI-01: paid with sent email shows full confirmation', async ({ page }) => {
    await mockLookup(page, paidValue);
    await page.goto(`/success?session_id=${SESSION}`);

    await expect(page.getByRole('heading', { name: /You’re in, Robin\./ })).toBeVisible();
    await expect(page.getByText(/£3 Founding Waitlist reservation is confirmed/)).toBeVisible();
    await expect(page.getByText(/We’ve sent a confirmation to/)).toBeVisible();
    await expect(page.getByText('robin@example.com')).toBeVisible();
  });

  test('UI-02: paid but email not yet sent avoids claiming delivery', async ({ page }) => {
    await mockLookup(page, { ...paidValue, confirmationEmailSent: false });
    await page.goto(`/success?session_id=${SESSION}`);

    await expect(page.getByRole('heading', { name: /You’re in/ })).toBeVisible();
    // Must not claim an email was already sent.
    await expect(page.getByText(/We’ve sent a confirmation to/)).toHaveCount(0);
    await expect(page.getByText(/We’ll email you when your confirmation is ready/)).toBeVisible();
  });

  test('UI-03: a missing session_id never claims the payment is confirmed', async ({ page }) => {
    await mockLookup(page, paidValue); // even if the backend would say paid
    await page.goto('/success');

    await expect(page.getByRole('heading', { name: /we’re checking your reservation/i })).toBeVisible();
    await expect(page.getByText(/reservation is confirmed/)).toHaveCount(0);
  });

  test('UI-04: an unknown or forged session id ends in the unverified state', async ({ page }) => {
    await mockLookup(page, { found: false });
    await page.goto('/success?session_id=cs_test_forged');

    // Polling is bounded, so this must settle rather than spin forever.
    await expect(
      page.getByRole('heading', { name: /we’re checking your reservation/i }),
    ).toBeVisible({ timeout: 25_000 });
    await expect(page.getByText(/reservation is confirmed/)).toHaveCount(0);
  });

  test('UI-05: an unavailable backend degrades without an uncaught error', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('pageerror', (error) => consoleErrors.push(String(error)));

    await failLookup(page);
    await page.goto(`/success?session_id=${SESSION}`);

    await expect(
      page.getByRole('heading', { name: /we’re checking your reservation/i }),
    ).toBeVisible({ timeout: 25_000 });
    expect(consoleErrors).toEqual([]);
  });

  test('UI-05b: a transient lookup failure is retried, not treated as final', async ({ page }) => {
    // A blip on the first call must not strand a paying customer on the
    // unverified page when the next poll would have succeeded.
    let calls = 0;
    await page.route('**/api/query', async (route) => {
      calls += 1;
      if (calls === 1) {
        await route.fulfill({ status: 500, contentType: 'application/json', body: '{}' });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'success', value: paidValue }),
      });
    });

    await page.goto(`/success?session_id=${SESSION}`);

    await expect(page.getByRole('heading', { name: /You’re in, Robin\./ })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText(/£3 Founding Waitlist reservation is confirmed/)).toBeVisible();
  });

  test('UI-06: a refunded reservation shows no paid confirmation', async ({ page }) => {
    await mockLookup(page, {
      found: true,
      status: 'refunded',
      name: 'Robin Fields',
      email: 'robin@example.com',
      confirmationEmailSent: false,
    });
    await page.goto(`/success?session_id=${SESSION}`);

    await expect(
      page.getByRole('heading', { name: /we’re checking your reservation/i }),
    ).toBeVisible({ timeout: 25_000 });
  });

  // Note: this app has no client-side routing, so leaving /success is a full
  // page load and cannot exercise React's unmount cleanup. The real UI-07
  // cancellation contract is covered in tests/unit/reservationPolling.test.ts.
  test('leaving the page stops polling and logs no error', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(String(error)));

    let requests = 0;
    await mockLookup(page, { found: false }); // keeps the page polling
    page.on('request', (request) => {
      if (request.url().includes('/api/query')) requests += 1;
    });

    await page.goto(`/success?session_id=${SESSION}`);
    await expect(page.getByRole('heading', { name: /Confirming your reservation/ })).toBeVisible();

    // Unmount mid-poll.
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Be Stronger/ })).toBeVisible();

    const afterNavigation = requests;
    await page.waitForTimeout(4000); // longer than the 1.5s poll interval
    expect(requests).toBe(afterNavigation); // no runaway retries
    expect(pageErrors).toEqual([]);
  });
});
