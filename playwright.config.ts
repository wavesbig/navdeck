import { defineConfig } from 'playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  fullyParallel: true,
  // e2e 会通过 API 修改共享 SQLite 状态（字号偏好 / widget 实例），
  // 并行会互相污染布局断言，必须串行
  workers: 1,
  use: {
    baseURL: 'http://localhost:3000',
    viewport: { width: 1280, height: 900 },
    trace: 'on-first-retry',
  },
  webServer: {
    // 每次重建全新的 e2e 专用数据库，与开发者真实数据完全隔离
    command: 'node scripts/prepare-e2e-db.mjs && npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      DATABASE_URL: 'file:./data/e2e-test.db',
    },
  },
});
