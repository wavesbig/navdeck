#!/bin/sh
# NavDeck 容器启动脚本
#
# 启动顺序：
# 1. 应用 Prisma 迁移（生产模式，仅部署迁移）
# 2. 执行 seed（幂等：仅 DB 为空时初始化）
# 3. 启动 Next.js standalone server

set -e

echo "[NavDeck] 启动数据库迁移..."
node ./node_modules/prisma/build/index.js migrate deploy

echo "[NavDeck] 执行种子脚本..."
node ./node_modules/tsx/dist/cli.mjs scripts/seed.ts

echo "[NavDeck] 启动 Next.js 服务..."
exec node server.js
