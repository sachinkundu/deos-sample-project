import { expect, test } from '@playwright/test';

test.setTimeout(360_000);

const display = (page) => page.locator('#display');
const button = (page, value) => page.locator(`button[data-value="${value}"]`);

async function capture(page, testInfo, name) {
  const image = await page.screenshot({ fullPage: true });
  expect(image.byteLength).toBeGreaterThan(1_000);
  await testInfo.attach(name, { body: image, contentType: 'image/png' });
}

async function clickAndCapture(page, testInfo, value, index, expected) {
  await button(page, value).click();
  await expect(button(page, value)).toHaveClass(/is-pressed/);
  if (expected !== undefined) await expect(display(page)).toHaveText(expected);
  await page.waitForTimeout(40);
  await capture(page, testInfo, `${String(index).padStart(2, '0')}-button-${value.replace('/', 'divide')}`);
}

test('review sequence captures buttons, key trace, clear, error, and recovery', async ({ page, browser }, testInfo) => {
  await page.addInitScript(() => {
    window.addEventListener('DOMContentLoaded', () => {
      const overlay = document.createElement('aside');
      overlay.id = 'evidence-key-trace';
      overlay.setAttribute('aria-label', 'Evidence key trace');
      overlay.textContent = 'Keys: none';
      Object.assign(overlay.style, {
        position: 'fixed', right: '12px', top: '12px', zIndex: '9999',
        maxWidth: 'calc(100vw - 24px)', padding: '8px 12px', borderRadius: '10px',
        background: '#fff', color: '#111827', font: '700 14px/1.4 monospace',
        boxShadow: '0 6px 24px rgba(0,0,0,.35)',
      });
      document.body.append(overlay);
      const keys = [];
      window.addEventListener('keydown', (event) => {
        keys.push(event.key);
        overlay.textContent = `Keys: ${keys.join(' · ')}`;
      });
    });
  });

  await page.goto('/');
  await expect(display(page)).toHaveText('0');

  const buttonRun = [
    ['1', '1'], ['.', '1.'], ['5', '1.5'], ['+', '1.5'], ['2', '2'],
    ['.', '2.'], ['2', '2.2'], ['5', '2.25'], ['=', '3.75'],
  ];
  for (let index = 0; index < buttonRun.length; index += 1) {
    await clickAndCapture(page, testInfo, buttonRun[index][0], index + 1, buttonRun[index][1]);
  }

  await page.reload();
  const keys = ['2', '.', '5', '*', '4', 'Enter'];
  for (let index = 0; index < keys.length; index += 1) {
    await page.keyboard.press(keys[index]);
    await page.waitForTimeout(40);
    await capture(page, testInfo, `${String(index + 10).padStart(2, '0')}-key-${keys[index]}`);
  }
  await expect(display(page)).toHaveText('10');
  await expect(page.locator('#evidence-key-trace')).toHaveText('Keys: 2 · . · 5 · * · 4 · Enter');

  await capture(page, testInfo, '16-before-clear');
  await clickAndCapture(page, testInfo, 'C', 17, '0');

  for (const [index, value] of ['8', '/', '0', '='].entries()) {
    await clickAndCapture(page, testInfo, value, index + 18);
  }
  await expect(display(page)).toHaveText('Cannot divide by zero');
  await capture(page, testInfo, '22-divide-by-zero');
  await clickAndCapture(page, testInfo, 'C', 23, '0');
  for (const [index, value] of ['8', '/', '2', '='].entries()) {
    await clickAndCapture(page, testInfo, value, index + 24);
  }
  await expect(display(page)).toHaveText('4');
  await capture(page, testInfo, '28-recovered-result');

  const plainContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const plainPage = await plainContext.newPage();
  await plainPage.goto(process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173');
  await expect(plainPage.locator('#evidence-key-trace')).toHaveCount(0);
  const plainImage = await plainPage.screenshot({ fullPage: true });
  await testInfo.attach('29-plain-preview-no-overlay', { body: plainImage, contentType: 'image/png' });
  await plainContext.close();
});

test('evidence trace shows guarded keys while state remains unchanged and Enter dispatches once', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    window.addEventListener('DOMContentLoaded', () => {
      const overlay = document.createElement('aside');
      overlay.id = 'evidence-key-trace';
      overlay.style.cssText = 'position:fixed;right:12px;top:12px;z-index:9999;padding:8px 12px;background:white;color:#111827;font:700 14px monospace;border-radius:10px';
      const keys = [];
      window.addEventListener('keydown', (event) => {
        keys.push(`${event.ctrlKey ? 'Ctrl+' : ''}${event.metaKey ? 'Meta+' : ''}${event.key}`);
        overlay.textContent = `Received: ${keys.join(' · ')}`;
      });
      document.body.append(overlay);
    });
  });
  await page.goto('/');
  await page.keyboard.type('8+');
  await page.keyboard.press('Enter');
  await expect(display(page)).toHaveText('8');
  await capture(page, testInfo, 'guarded-premature-equals');
  await page.keyboard.type('2');
  await page.keyboard.press('Enter');
  await expect(display(page)).toHaveText('10');

  await page.reload();
  await page.keyboard.type('5');
  await page.keyboard.press('Control+/');
  await page.keyboard.press('Meta++');
  await page.keyboard.press('a');
  await page.keyboard.press('ArrowLeft');
  await expect(display(page)).toHaveText('5');
  await expect(page.locator('#evidence-key-trace')).toContainText('Ctrl+/');
  await expect(page.locator('#evidence-key-trace')).toContainText('a');
  await capture(page, testInfo, 'guarded-modifier-and-unrelated-keys');

  await page.reload();
  await page.keyboard.type('8+2');
  await button(page, '7').focus();
  await page.keyboard.press('Enter');
  await expect(display(page)).toHaveText('10');
  await capture(page, testInfo, 'focused-button-enter-single-dispatch');
});
