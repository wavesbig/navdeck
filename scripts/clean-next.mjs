import { rmSync } from 'node:fs';
import { createServer } from 'node:net';

const port = Number(process.env.PORT || 3000);

// 旧 dev server 仍占用端口时拒绝启动：
// 在运行中的进程脚下删 .next，会让它继续使用半删除的编译产物，导致嵌套动态路由 404。
await new Promise((resolve, reject) => {
  const server = createServer();
  server.once('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      reject(
        new Error(`端口 ${port} 已被占用，请先停止旧的 next dev 进程再启动`),
      );
      return;
    }
    reject(error);
  });
  server.once('listening', () => {
    server.close(() => resolve());
  });
  server.listen(port);
});

// 每次启动 dev server 前清理 .next，避免 Turbopack 缓存损坏导致路由 404
rmSync('.next', { recursive: true, force: true });
