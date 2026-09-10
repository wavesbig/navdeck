import { expect, type Page, test } from 'playwright/test';

type WidgetSize = 'S' | 'M' | 'L';

interface InstanceInfo {
  id: string;
  widgetKey: string;
}

const FONT_SCALES = [100, 125, 150] as const;
const SIZES: WidgetSize[] = ['S', 'M', 'L'];
const WIDGET_KEYS = [
  'countdown',
  'countup',
  'resource-gauge',
  'nas-status',
] as const;

const INITIAL_ITEMS: Partial<
  Record<(typeof WIDGET_KEYS)[number], { name: string; date: string }>
> = {
  countdown: { name: '截断回归测试', date: '2027-01-01T00:00:00.000Z' },
  countup: { name: '截断回归测试', date: '2024-01-01T00:00:00.000Z' },
};

// 容差需大于亚像素舍入、小于真实溢出（历史 bug 为 2~30px）
const EDGE_TOLERANCE_PX = 1;
const SCROLL_TOLERANCE_PX = 2;

async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel('用户名').fill('admin');
  await page.getByLabel('密码').fill('changeme');
  await page.getByRole('button', { name: '登录' }).click();
  await page.waitForURL('/');
  await page.waitForSelector('.widget-cell');
}

async function apiGet<T>(page: Page, url: string): Promise<T> {
  return page.evaluate<T, string>(async (url) => {
    const res = await fetch(url);
    return (await res.json()) as T;
  }, url);
}

async function apiSend(
  page: Page,
  url: string,
  method: string,
  body?: unknown,
): Promise<void> {
  const status = await page.evaluate(
    async ({ url, method, body }) => {
      const res = await fetch(url, {
        method,
        headers:
          body === undefined
            ? undefined
            : { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      return res.status;
    },
    { url, method, body },
  );
  expect(status, `${method} ${url}`).toBeLessThan(400);
}

async function createInstance(
  page: Page,
  widgetKey: (typeof WIDGET_KEYS)[number],
): Promise<string> {
  const body: Record<string, unknown> = { widgetKey };
  const initialItem = INITIAL_ITEMS[widgetKey];
  if (initialItem) body.initialItem = initialItem;
  const created = await page.evaluate(async (body) => {
    const res = await fetch('/api/widgets/instances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.json();
  }, body);
  return created.id as string;
}

// 等待 RGL 两段式渲染（rowHeight 默认值 → 根字号缩放值）收敛：
// 连续两次采样卡片高度一致才认为布局落定
async function waitForLayoutStable(page: Page, indexes: number[]) {
  await page.waitForFunction(
    (indexes) => {
      const cells = [...document.querySelectorAll('.widget-cell')];
      if (cells.length === 0) return false;
      const heights = indexes.map(
        (i) => cells[i]?.getBoundingClientRect().height ?? -1,
      );
      if (heights.some((h) => h <= 0)) return false;
      const key = heights.join(',');
      const store = window as unknown as { __widgetHeights?: string };
      if (store.__widgetHeights === key) return true;
      store.__widgetHeights = key;
      return false;
    },
    indexes,
    { polling: 250, timeout: 20_000 },
  );
}

// 日期 widget 加载期渲染 M/L 版骨架屏，会瞬时溢出 S 卡，
// 等真实内容替换骨架后再测量
async function waitForContentLoaded(page: Page, indexes: number[]) {
  await page.waitForFunction(
    (indexes) => {
      const cells = [...document.querySelectorAll('.widget-cell')];
      return indexes.every((i) => !cells[i]?.querySelector('.astryx-skeleton'));
    },
    indexes,
    { polling: 250, timeout: 20_000 },
  );
}

async function measureWidgetOverflow(
  page: Page,
  cards: Array<{ index: number; label: string }>,
): Promise<string[]> {
  return page.evaluate(
    ({ cards, edge, scroll }) => {
      const cells = [...document.querySelectorAll('.widget-cell')];
      const problems: string[] = [];
      for (const { index, label } of cards) {
        const card = cells[index]?.querySelector('.widget-surface');
        if (!card) {
          problems.push(`${label}: cell ${index} 未找到卡片`);
          continue;
        }
        const style = getComputedStyle(card);
        const rect = card.getBoundingClientRect();
        const content = {
          top:
            rect.top +
            parseFloat(style.paddingTop) +
            parseFloat(style.borderTopWidth),
          bottom:
            rect.bottom -
            parseFloat(style.paddingBottom) -
            parseFloat(style.borderBottomWidth),
          left:
            rect.left +
            parseFloat(style.paddingLeft) +
            parseFloat(style.borderLeftWidth),
          right:
            rect.right -
            parseFloat(style.paddingRight) -
            parseFloat(style.borderRightWidth),
        };
        const describe = (el: Element) => {
          const cls = el.classList.length > 0 ? el.classList[0] : el.tagName;
          const text = (el.textContent ?? '').trim().slice(0, 12);
          return `${el.tagName.toLowerCase()}.${cls}「${text}」`;
        };
        card.querySelectorAll('*').forEach((el) => {
          const st = getComputedStyle(el);
          if (st.display === 'none' || st.visibility === 'hidden') return;
          const r = el.getBoundingClientRect();
          if (r.width === 0 && r.height === 0) return;
          const name = describe(el);
          if (
            r.bottom > rect.bottom + edge ||
            r.right > rect.right + edge ||
            r.top < rect.top - edge
          ) {
            problems.push(`${label}: ${name} 被卡片裁剪`);
          } else if (
            r.bottom > content.bottom + edge ||
            r.right > content.right + edge
          ) {
            problems.push(`${label}: ${name} 侵入内边距`);
          }
        });
        if (card.scrollHeight > card.clientHeight + scroll) {
          problems.push(
            `${label}: 内容超高 ${card.scrollHeight - card.clientHeight}px`,
          );
        }
      }
      return problems;
    },
    { cards, edge: EDGE_TOLERANCE_PX, scroll: SCROLL_TOLERANCE_PX },
  );
}

test('widget 全尺寸 × 字号缩放：内容不溢出、不被裁剪', async ({ page }) => {
  test.setTimeout(300_000);
  await login(page);

  const { fontSize: originalFontSize } = await apiGet<{
    fontSize: number;
  }>(page, '/api/preferences');
  const created: string[] = [];

  try {
    for (const widgetKey of WIDGET_KEYS) {
      created.push(await createInstance(page, widgetKey));
    }

    for (const size of SIZES) {
      for (const id of created) {
        await apiSend(page, `/api/widgets/instances/${id}`, 'PATCH', {
          size,
        });
      }
      for (const scale of FONT_SCALES) {
        // 改真实偏好后整页刷新：网格以目标字号重新挂载，
        // 行高随根字号缩放的路径才会被真实执行
        await apiSend(page, '/api/preferences', 'PATCH', {
          key: 'fontSize',
          value: scale,
        });
        await page.goto('/');
        await page.waitForSelector('.widget-cell');
        const { items } = await apiGet<{ items: InstanceInfo[] }>(
          page,
          '/api/widgets/instances',
        );
        const indexes = created.map((id) =>
          items.findIndex((item) => item.id === id),
        );
        await waitForContentLoaded(page, indexes);
        await waitForLayoutStable(page, indexes);
        const cards = created.map((_id, i) => ({
          index: indexes[i],
          label: `${items[indexes[i]]?.widgetKey ?? '?'} size=${size} scale=${scale}%`,
        }));

        const problems = await measureWidgetOverflow(page, cards);
        expect(problems).toEqual([]);
      }
    }
  } finally {
    const current = await apiGet<{ fontSize: number }>(
      page,
      '/api/preferences',
    );
    if (current.fontSize !== originalFontSize) {
      await apiSend(page, '/api/preferences', 'PATCH', {
        key: 'fontSize',
        value: originalFontSize,
      });
    }
    for (const id of created) {
      await apiSend(page, `/api/widgets/instances/${id}`, 'DELETE');
    }
  }
});
