import { rmSync } from 'node:fs';

// 每次启动 dev server 前清理 .next，避免 Turbopack 缓存损坏导致路由 404
rmSync('.next', { recursive: true, force: true });
