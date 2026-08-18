import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const COOKIE_PREFERENCES_KEY = 'myavail_cookie_preferences';

async function preparePage(page: Page, path: string) {
  await page.addInitScript(
    ([key, value]) => window.localStorage.setItem(key, value),
    [COOKIE_PREFERENCES_KEY, JSON.stringify({ essential: true, analytics: false, marketing: false })],
  );
  await page.goto(path);
  await page.waitForLoadState('networkidle');

  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation: none !important;
        transition: none !important;
      }
      .reveal-on-scroll,
      .reveal-on-scroll > *,
      .fade-up {
        opacity: 1 !important;
        transform: none !important;
      }
    `,
  });
  await page.evaluate(() => {
    document.querySelectorAll<HTMLElement>('.reveal-on-scroll').forEach((element) => {
      element.classList.add('reveal-visible');
    });
  });
}

async function expectAccessible(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    await page.evaluate(() => document.documentElement.clientWidth),
  );
}

test.describe('WCAG A/AA', () => {
  test('landing page', async ({ page }) => {
    await preparePage(page, '/');
    await expectAccessible(page);
  });

  test('FAQ expanded state', async ({ page }) => {
    await preparePage(page, '/#faq');
    const firstQuestion = page.getByRole('button', {
      name: 'What makes Avail different from other fitness apps?',
    });
    await firstQuestion.click();
    await expect(firstQuestion).toHaveAttribute('aria-expanded', 'true');
    await expectAccessible(page);
  });

  test('paid waitlist CTA state', async ({ page }) => {
    await preparePage(page, '/#early-access');
    const cta = page.getByRole('link', { name: 'Join the Founding Waitlist · $5 USD' });
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute('href', /^https:\/\/buy\.stripe\.com\//);
    await expectAccessible(page);
  });

  for (const path of ['/privacy', '/terms']) {
    test(`${path.slice(1)} page`, async ({ page }) => {
      await preparePage(page, path);
      await expectAccessible(page);
    });
  }
});
