#!/bin/sh
# NavDeck 容器启动脚本
#
# 启动顺序：
# 1. root 阶段：按 PUID/PGID（默认 1001:1001）修正挂载目录属主，避免
#    Docker 自动创建的 root 目录导致非 root 运行用户无法写数据库
# 2. 降权到 nextjs：应用 Prisma 迁移（生产模式，仅部署迁移）
# 3. 执行 seed（幂等：仅 DB 为空时初始化）
# 4. 启动 Next.js standalone server

set -e

# root 启动：修正目录属主后降权重入本脚本
if [ "$(id -u)" = "0" ]; then
  PUID=${PUID:-1001}
  PGID=${PGID:-1001}
  # 把镜像内 nextjs/nodejs 的 uid/gid 调整为目标值（passwd 行为 name:x:uid:gid:...）
  sed -i "s/^nextjs:x:[0-9]*:[0-9]*:/nextjs:x:${PUID}:${PGID}:/" /etc/passwd
  sed -i "s/^nodejs:x:[0-9]*:/nodejs:x:${PGID}:/" /etc/group
  # docker.sock 附加组：默认自动探测 socket 属组（jlesage 模式，NAS/Desktop 均零配置）；
  # DOCKER_GID 环境变量可显式覆盖（非标准挂载等场景）。setpriv 显式指定后降权重入
  if [ -n "${DOCKER_GID:-}" ]; then
    SOCK_GID=$DOCKER_GID
  elif [ -S /var/run/docker.sock ]; then
    SOCK_GID=$(stat -c %g /var/run/docker.sock 2>/dev/null || echo 0)
  else
    SOCK_GID=0
  fi
  mkdir -p data uploads/icons/cards uploads/icons/library
  chown -R "$PUID:$PGID" data uploads
  # 自定义 PUID/PGID 时，Prisma CLI 运行期需写 node_modules 内的引擎缓存目录
  if [ "$PUID" != "1001" ] || [ "$PGID" != "1001" ]; then
    chown -R "$PUID:$PGID" node_modules
  fi
  exec setpriv --reuid "$PUID" --regid "$PGID" --groups "$SOCK_GID" sh "$0"
fi

echo "[NavDeck] 启动数据库迁移..."
node ./node_modules/prisma/build/index.js migrate deploy

echo "[NavDeck] 执行种子脚本..."
node ./node_modules/tsx/dist/cli.mjs scripts/seed.ts

echo "[NavDeck] 启动 Next.js 服务..."
exec node server.js
