import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

/**
 * Vitest 配置
 *
 * - resolve.alias：手写 @ → src，与 tsconfig.json paths 保持一致
 * - environment：node（lib 单元测试不需要 DOM）
 * - 不强制 node_modules 内的依赖走 ESM/CJS 转换
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/lib/**/*.ts', 'src/hooks/**/*.ts'],
      exclude: ['src/lib/db.ts', 'src/lib/docker.ts'],
    },
  },
});
