// e2e 专用数据库准备：每次跑测试前重建为全新种子态，
// 保证测试不读写开发者真实数据（.env 指向的 navdeck.db）。
// DATABASE_URL 由 playwright.config.ts 的 webServer.env 注入。
import { execSync } from 'node:child_process';
import { closeSync, existsSync, openSync, rmSync } from 'node:fs';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl?.startsWith('file:')) {
  console.error(
    'prepare-e2e-db: 需要 DATABASE_URL（file:）环境变量，拒绝在未隔离状态下运行',
  );
  process.exit(1);
}

const dbPath = databaseUrl.slice('file:'.length);
for (const suffix of ['', '-journal', '-wal', '-shm']) {
  const file = `${dbPath}${suffix}`;
  if (existsSync(file)) rmSync(file);
}
// Prisma schema engine 打不开不存在的文件，先落一个空文件再迁移
closeSync(openSync(dbPath, 'w'));

const runEnv = { ...process.env, DATABASE_URL: databaseUrl };
execSync('npx prisma migrate deploy', { stdio: 'inherit', env: runEnv });
execSync('npx tsx scripts/seed.ts', { stdio: 'inherit', env: runEnv });
