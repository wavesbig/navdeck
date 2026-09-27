import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // e2e 等场景可通过环境变量隔离构建目录，避免与运行中的 dev server 争用 .next
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  output: 'standalone',
  serverExternalPackages: ['@prisma/client', '@libsql/client'],
  experimental: {
    // 继续使用 Turbopack，但关闭 dev 持久化缓存，避免复用损坏的 .next/dev 产物
    turbopackFileSystemCacheForDev: false,
  },
};

export default nextConfig;

