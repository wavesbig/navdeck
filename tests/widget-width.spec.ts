import { expect, type Page, test } from 'playwright/test';

const acceptedBarWidths = [400, 480] as const;

async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel('用户名').fill('admin');
  await page.getByLabel('密码').fill('changeme');
  await page.getByRole('button', { name: '登录' }).click();
  await page.waitForURL('/');
  await page.waitForSelector('.widget-cell');
}

for (const barWidth of acceptedBarWidths) {
  test(`保持 ${barWidth}px widget 栏的已接受双列布局`, async ({ page }) => {
    await login(page);

    await page.evaluate((width) => {
      document.documentElement.style.setProperty(
        '--widget-bar-width',
        `${width}px`,
      );
    }, barWidth);

    const expectedCellWidth = (barWidth - 8) / 2;
    await page.waitForFunction((expected) => {
      const cell = document.querySelector('.widget-cell');
      return (
        cell !== null &&
        Math.abs(cell.getBoundingClientRect().width - expected) <= 1
      );
    }, expectedCellWidth);

    const layout = await page.evaluate(() => {
      const cells = [...document.querySelectorAll('.widget-cell')];
      const firstCellTop = cells[0]?.getBoundingClientRect().top ?? 0;
      const firstRow = cells
        .filter(
          (cell) =>
            Math.abs(cell.getBoundingClientRect().top - firstCellTop) < 1,
        )
        .map((cell) => {
          const rect = cell.getBoundingClientRect();
          return {
            left: rect.left,
            width: rect.width,
          };
        });

      const overflowing = cells.flatMap((cell) => {
        const content = cell.querySelector('[class*="@container"]');
        if (!content) return [];
        const cellRect = cell.getBoundingClientRect();

        return [...content.querySelectorAll<HTMLElement>('*')]
          .filter((element) => {
            const style = getComputedStyle(element);
            if (style.display === 'none' || style.visibility === 'hidden') {
              return false;
            }
            const rect = element.getBoundingClientRect();
            if (rect.width === 0 && rect.height === 0) return false;
            return (
              rect.left < cellRect.left - 1 ||
              rect.right > cellRect.right + 1 ||
              rect.top < cellRect.top - 1 ||
              rect.bottom > cellRect.bottom + 1
            );
          })
          .map((element) => ({
            className: element.className,
            text: element.textContent?.trim() ?? '',
          }));
      });

      return { firstRow, overflowing };
    });

    expect(layout.firstRow).toHaveLength(2);
    expect(new Set(layout.firstRow.map((cell) => cell.left)).size).toBe(2);
    for (const cell of layout.firstRow) {
      expect(Math.abs(cell.width - expectedCellWidth)).toBeLessThanOrEqual(1);
    }
    expect(layout.overflowing).toEqual([]);
  });
}
