import { test, expect } from '@playwright/test';

async function fillTextarea(page: import('@playwright/test').Page, text: string) {
  const textarea = page.locator('textarea');
  await textarea.fill(text);
  await textarea.dispatchEvent('input');
}

test.describe('Markdown Rendering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
  });

  test('preserves spaces between words in tagged English text', async ({ page }) => {
    await fillTextarea(page, 'The quick brown fox jumps over the lazy dog.');
    await page.waitForSelector('[data-upos]', { timeout: 30000 });
    await page.waitForTimeout(2000);

    const text = await page.locator('.output-content').textContent();
    expect(text).toContain('quick brown fox');
    expect(text).toContain('over the lazy');
  });

  test('renders bold text inside ordered list items correctly', async ({ page }) => {
    await fillTextarea(page, [
      '1. **Visual recognition** — identifying letters',
      '2. **Phonological processing** — connecting text',
      '3. **Semantic analysis** — extracting meaning',
    ].join('\n'));

    await page.waitForSelector('[data-upos]', { timeout: 30000 });
    await page.waitForTimeout(3000);

    const text = await page.locator('.output-content').textContent();
    const html = await page.locator('.output-content').innerHTML();

    // Spaces must be preserved within list items
    expect(text).toContain('identifying letters');
    expect(text).toContain('connecting text');
    expect(text).toContain('extracting meaning');

    // Bold tags must be present
    expect(html).toContain('<strong>');

    // Items must NOT mix: "Phonological" must come AFTER "identifying"
    const idIdx = text!.indexOf('identifying');
    const phIdx = text!.indexOf('Phonological');
    expect(phIdx).toBeGreaterThan(idIdx);
  });

  test('renders markdown tables with proper spacing', async ({ page }) => {
    await fillTextarea(page, [
      '| Name | Role |',
      '|---|---|',
      '| Alice | developer |',
      '| Bob | designer |',
    ].join('\n'));

    await page.waitForSelector('[data-upos]', { timeout: 30000 });
    await page.waitForTimeout(2000);

    const html = await page.locator('.output-content').innerHTML();
    const text = await page.locator('.output-content').textContent();

    expect(html).toContain('<table>');
    expect(html).toContain('<th>');
    expect(html).toContain('<td>');
    // Spaces between words in table cells
    expect(text).toContain('Alice');
    expect(text).toContain('developer');
  });

  test('loads sample markdown with proper rendering', async ({ page }) => {
    const sampleBtn = page.locator('button', { hasText: /sample/i });
    await sampleBtn.click();
    await page.waitForSelector('[data-upos]', { timeout: 45000 });
    await page.waitForTimeout(4000);

    const text = await page.locator('.output-content').textContent();
    const html = await page.locator('.output-content').innerHTML();

    // Paragraph text has spaces
    expect(text).toContain('complex cognitive process');

    // List items have spaces
    expect(text).toContain('identifying letters and words');

    // Table cells have spaces
    expect(text).toContain('person, place, thing');

    // Code blocks exist and aren't tagged
    expect(html).toContain('<pre>');
    const codeBlocks = html.match(/<pre>.*?<\/pre>/gs) ?? [];
    for (const block of codeBlocks) {
      expect(block).not.toContain('data-upos');
    }

    // No hidden <p> tags wrapping tight list content
    expect(html).not.toMatch(/<li>\s*<p>/);

    // Bold text rendered
    expect(html).toContain('<strong>');

    // Heading spaces
    expect(text).toContain('The Art of Reading');
  });

  test('no console errors during markdown rendering', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    const sampleBtn = page.locator('button', { hasText: /sample/i });
    await sampleBtn.click();
    await page.waitForSelector('[data-upos]', { timeout: 45000 });
    await page.waitForTimeout(3000);

    expect(errors).toHaveLength(0);
  });
});

test.describe('i18n', () => {
  test('header has UI language selector next to dark mode', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);

    const langSelect = page.locator('.header-actions .locale-select');
    await expect(langSelect).toBeVisible();

    // Should have auto + 4 language options (en, zh, zh-tw, ja)
    const options = langSelect.locator('option');
    const count = await options.count();
    expect(count).toBeGreaterThanOrEqual(5);

    // Dark mode toggle should be next to it
    const darkToggle = page.locator('.header-actions .dark-toggle');
    await expect(darkToggle).toBeVisible();
  });

  test('switching UI language updates nav text', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);

    const langSelect = page.locator('.header-actions .locale-select');

    // Switch to Simplified Chinese
    await langSelect.selectOption('zh');
    await page.waitForTimeout(300);

    const navLinks = await page.locator('.app-nav a').allTextContents();
    expect(navLinks.some((t) => t.includes('阅读器'))).toBe(true);
    expect(navLinks.some((t) => t.includes('设置'))).toBe(true);

    // Switch to Traditional Chinese
    await langSelect.selectOption('zh-tw');
    await page.waitForTimeout(300);

    const navLinksTW = await page.locator('.app-nav a').allTextContents();
    expect(navLinksTW.some((t) => t.includes('閱讀器'))).toBe(true);
    expect(navLinksTW.some((t) => t.includes('設定'))).toBe(true);

    // Switch to Japanese
    await langSelect.selectOption('ja');
    await page.waitForTimeout(300);

    const navLinksJa = await page.locator('.app-nav a').allTextContents();
    expect(navLinksJa.some((t) => t.includes('リーダー'))).toBe(true);

    // Switch back to English
    await langSelect.selectOption('en');
    await page.waitForTimeout(300);

    const navLinksEn = await page.locator('.app-nav a').allTextContents();
    expect(navLinksEn.some((t) => t.includes('Reader'))).toBe(true);
  });
});
