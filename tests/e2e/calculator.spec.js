import { expect, test } from '@playwright/test';

const display = (page) => page.locator('#display');
const calculation = (page) => page.locator('#calculation');
const button = (page, value) => page.locator(`button[data-value="${value}"]`);

async function clickSequence(page, values) {
  for (const value of values) await button(page, value).click();
}

async function expectDisplay(page, value) {
  await expect(display(page)).toHaveText(value);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expectDisplay(page, '0');
});

test('button input enters decimals, rejects duplicates, and calculates addition', async ({ page }) => {
  await clickSequence(page, ['1', '.', '5', '.']);
  await expectDisplay(page, '1.5');
  await clickSequence(page, ['+', '2', '.', '2', '5', '=']);
  await expectDisplay(page, '3.75');
});

test('keyboard input enters decimals and calculates multiplication with Enter', async ({ page }) => {
  await page.keyboard.type('2.5*4');
  await page.keyboard.press('Enter');
  await expectDisplay(page, '10');
});

test('all operations and equals key show exact visible results', async ({ page }) => {
  const cases = [
    { keys: '7-10=', expression: '7 − 10', result: '-3' },
    { keys: '7.5/2.5=', expression: '7.5 ÷ 2.5', result: '3' },
    { keys: '0.1+0.2=', expression: '0.1 + 0.2', result: '0.3' },
  ];
  for (const { keys, expression, result } of cases) {
    await page.reload();
    await page.keyboard.type(keys);
    await expect(calculation(page)).toHaveText(expression);
    await expectDisplay(page, result);
  }
});

test('shifted operators are accepted', async ({ page }) => {
  await page.keyboard.type('2.5');
  await page.keyboard.press('Shift+Digit8');
  await page.keyboard.type('4');
  await page.keyboard.press('Enter');
  await expectDisplay(page, '10');
});

test('clear button and Escape erase partial, result, and error state', async ({ page }) => {
  await clickSequence(page, ['9', '+', '4', 'C']);
  await expectDisplay(page, '0');
  await clickSequence(page, ['2', '+', '3', '=']);
  await expectDisplay(page, '5');

  await page.keyboard.press('Escape');
  await expectDisplay(page, '0');
  await page.keyboard.type('6*7');
  await page.keyboard.press('Enter');
  await expectDisplay(page, '42');
  await page.keyboard.press('Escape');
  await expectDisplay(page, '0');

  await page.keyboard.type('8/0=');
  await expectDisplay(page, 'Cannot divide by zero');
  await page.keyboard.press('Escape');
  await page.keyboard.type('5-1=');
  await expectDisplay(page, '4');
});

test('division by zero is exact, locked, and recoverable through clear', async ({ page }) => {
  await clickSequence(page, ['8', '/', '0', '=']);
  await expect(calculation(page)).toHaveText('8 ÷ 0');
  await expectDisplay(page, 'Cannot divide by zero');
  await clickSequence(page, ['5', '+', '=']);
  await page.keyboard.press('7');
  await expectDisplay(page, 'Cannot divide by zero');

  await button(page, 'C').click();
  await expect(calculation(page)).toBeHidden();
  await clickSequence(page, ['8', '/', '0', '.', '0', '=']);
  await expectDisplay(page, 'Cannot divide by zero');
  await button(page, 'C').click();
  await clickSequence(page, ['8', '/', '2', '=']);
  await expectDisplay(page, '4');
});

test('premature equals and guarded keys do not corrupt or double-dispatch', async ({ page }) => {
  await page.keyboard.type('8+');
  await page.keyboard.press('Enter');
  await expectDisplay(page, '8');
  await page.keyboard.type('2');
  await page.keyboard.press('Enter');
  await expectDisplay(page, '10');

  await page.reload();
  await page.keyboard.type('5');
  await page.keyboard.press('Control+/');
  await page.keyboard.press('Meta++');
  await page.keyboard.press('a');
  await page.keyboard.press('ArrowLeft');
  await expectDisplay(page, '5');

  await page.reload();
  await page.keyboard.type('8+2');
  await button(page, '7').focus();
  await page.keyboard.press('Enter');
  await expectDisplay(page, '10');
});

test('layout has no overflow, clipping, overlap, undersized controls, or narrow gaps', async ({ page }, testInfo) => {
  const geometry = await page.evaluate(() => {
    const panel = document.querySelector('.calculator').getBoundingClientRect();
    const displayElement = document.querySelector('#display');
    const buttons = [...document.querySelectorAll('button')];
    const rects = buttons.map((element) => {
      const rect = element.getBoundingClientRect();
      return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height };
    });
    const overlaps = [];
    for (let first = 0; first < rects.length; first += 1) {
      for (let second = first + 1; second < rects.length; second += 1) {
        const a = rects[first];
        const b = rects[second];
        if (a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top) overlaps.push([first, second]);
      }
    }
    return {
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      panel: { left: panel.left, right: panel.right, width: panel.width },
      rects,
      overlaps,
      gap: Number.parseFloat(getComputedStyle(document.querySelector('.keypad')).gap),
      displayFont: Number.parseFloat(getComputedStyle(displayElement).fontSize),
      buttonFonts: buttons.map((element) => Number.parseFloat(getComputedStyle(element).fontSize)),
    };
  });

  expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth);
  expect(geometry.overlaps).toEqual([]);
  expect(geometry.gap).toBeGreaterThanOrEqual(8);
  expect(geometry.displayFont).toBeGreaterThanOrEqual(16);
  expect(Math.min(...geometry.buttonFonts)).toBeGreaterThanOrEqual(16);
  for (const rect of geometry.rects) {
    expect(rect.width).toBeGreaterThanOrEqual(44);
    expect(rect.height).toBeGreaterThanOrEqual(44);
    expect(rect.left).toBeGreaterThanOrEqual(geometry.panel.left);
    expect(rect.right).toBeLessThanOrEqual(geometry.panel.right);
  }

  if (testInfo.project.name === 'phone-320') {
    expect(geometry.clientWidth).toBe(320);
    await clickSequence(page, ['1', '.', '5', '+', '2', '.', '2', '5', '=']);
    await expectDisplay(page, '3.75');
  } else {
    expect(geometry.panel.width).toBeLessThanOrEqual(384);
    expect(Math.abs((geometry.panel.left + geometry.panel.right) / 2 - geometry.clientWidth / 2)).toBeLessThanOrEqual(2);
    await page.keyboard.type('8/2=');
    await expectDisplay(page, '4');
  }
});
