import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['@prisma/client', '@libsql/client'],
  experimental: {
    // 继续使用 Turbopack，但关闭 dev 持久化缓存，避免复用损坏的 .next/dev 产物
    turbopackFileSystemCacheForDev: false,
  },
};

export default nextConfig;
