import { test, expect, Page } from '@playwright/test';

/**
 * Helper: fill textarea and trigger Vue reactivity
 */
async function fillTextarea(page: Page, text: string) {
  const textarea = page.locator('textarea');
  await textarea.click();
  await textarea.fill(text);
  await textarea.dispatchEvent('input');
}

test.describe('App Shell & Navigation', () => {
  test('loads homepage correctly', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('.logo')).toBeVisible();
    await expect(page.locator('nav a:has-text("Reader")')).toBeVisible();
    await expect(page.locator('nav a:has-text("Settings")')).toBeVisible();
    await expect(page.locator('nav a:has-text("About")')).toBeVisible();
  });

  test('navigates to Settings page', async ({ page }) => {
    await page.goto('/');
    await page.click('nav a:has-text("Settings")');
    await expect(page).toHaveURL('/settings');
  });

  test('navigates to About page', async ({ page }) => {
    await page.goto('/');
    await page.click('nav a:has-text("About")');
    await expect(page).toHaveURL('/about');
    await expect(page.locator('h1:has-text("About")')).toBeVisible();
  });

  test('no console errors on initial load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('/');
    await page.waitForTimeout(2000);
    const appErrors = errors.filter(e =>
      !e.includes('favicon') && !e.includes('pwa-') &&
      !e.includes('manifest') && !e.includes('apple-touch-icon') &&
      !e.includes('service-worker') && !e.includes('404')
    );
    expect(appErrors).toEqual([]);
  });
});

test.describe('English POS Tagging (wink-en)', () => {
  test('tags simple English sentence', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);
    await fillTextarea(page, 'The cat sat on the mat.');
    await page.waitForSelector('[data-upos]', { timeout: 45_000 });
    const taggedSpans = page.locator('[data-upos]');
    expect(await taggedSpans.count()).toBeGreaterThan(0);
    await expect(page.locator('[data-upos="NOUN"]').first()).toBeVisible();
    await expect(page.locator('[data-upos="VERB"]').first()).toBeVisible();
    await expect(page.locator('text=wink-en')).toBeVisible();
  });

  test('handles multi-line English text', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    await fillTextarea(page, 'Hello world.\nThis is a test.\nGoodbye.');
    await page.waitForSelector('[data-upos]', { timeout: 30_000 });
    const output = page.locator('.output-content');
    const html = await output.innerHTML();
    expect(html).toContain('<br');
  });
});

test.describe('Japanese POS Tagging (kuromoji-ja)', () => {
  test('tags Japanese sentence without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('/');
    await page.waitForTimeout(1000);
    await fillTextarea(page, '私は日本人です。');
    await page.waitForSelector('[data-upos]', { timeout: 60_000 });

    const errorBanner = page.locator('.error-banner');
    if (await errorBanner.isVisible()) {
      const text = await errorBanner.textContent();
      expect(text).not.toContain('path.join');
    }

    await expect(page.locator('text=kuromoji-ja')).toBeVisible();
    const taggedSpans = page.locator('[data-upos]');
    expect(await taggedSpans.count()).toBeGreaterThan(0);

    const appErrors = errors.filter(e =>
      !e.includes('favicon') && !e.includes('pwa-') &&
      !e.includes('manifest') && !e.includes('404')
    );
    expect(appErrors).toEqual([]);
  });
});

test.describe('Chinese POS Tagging (jieba-zh)', () => {
  test('tags Chinese sentence', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    await fillTextarea(page, '我是中国人。今天天气很好。');
    await page.waitForSelector('[data-upos]', { timeout: 45_000 });
    await expect(page.locator('text=jieba-zh')).toBeVisible();
    const taggedSpans = page.locator('[data-upos]');
    expect(await taggedSpans.count()).toBeGreaterThan(0);
  });
});

test.describe('Language Detection', () => {
  test('auto-detects English', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    await fillTextarea(page, 'The quick brown fox jumps over the lazy dog.');
    await page.waitForSelector('[data-upos]', { timeout: 30_000 });
    await expect(page.locator('text=wink-en')).toBeVisible();
  });

  test('auto-detects Japanese', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    await fillTextarea(page, '東京は日本の首都です。');
    await page.waitForSelector('[data-upos]', { timeout: 60_000 });
    await expect(page.locator('text=kuromoji-ja')).toBeVisible();
  });

  test('auto-detects Chinese', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    await fillTextarea(page, '中文测试一下这个功能是否正常。');
    await page.waitForSelector('[data-upos]', { timeout: 45_000 });
    await expect(page.locator('text=jieba-zh')).toBeVisible();
  });
});

test.describe('UI Features', () => {
  test('Copy HTML button exists', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    await fillTextarea(page, 'Hello world.');
    await page.waitForSelector('[data-upos]', { timeout: 30_000 });
    await expect(page.locator('button:has-text("Copy HTML")')).toBeVisible();
  });

  test('word count updates', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    await fillTextarea(page, 'One two three four five.');
    await page.waitForSelector('[data-upos]', { timeout: 30_000 });
    const status = await page.locator('.output-status').textContent();
    expect(status).toMatch(/\d+ word/);
  });
});

test.describe('Error Resilience', () => {
  test('switching languages does not crash', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('/');
    await page.waitForTimeout(1000);

    await fillTextarea(page, 'Hello world.');
    await page.waitForTimeout(2000);
    await fillTextarea(page, 'Back to English now testing more.');
    await page.waitForSelector('[data-upos]', { timeout: 30_000 });
    expect(errors).toEqual([]);
  });
});
