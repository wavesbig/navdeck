# 多阶段构建：deps → builder → runner
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
# 安装全部依赖（含 devDependencies），供 builder 阶段类型检查与构建使用
RUN npm ci

FROM node:22-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json* ./
ENV HUSKY=0
RUN npm ci --omit=dev --ignore-scripts
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# prisma.config.ts 依赖 DATABASE_URL（generate 不连库，占位即可；.env 不入镜像，
# 该默认值也是 runner 阶段未显式传入时的合理路径）
ENV DATABASE_URL="file:./data/navdeck.db"
RUN npx prisma generate
# 根布局预渲染（/_not-found 等）会读用户偏好（空库走默认值），需先落数据库 schema
RUN npx prisma migrate deploy
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# runner 阶段显式声明（ENV 不跨 FROM 继承）；compose/运行时可覆盖
ENV DATABASE_URL="file:./data/navdeck.db"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 入口脚本以 root 修正挂载目录属主，再经 setpriv 降权（显式保留 socket 附加组）运行
RUN apk add --no-cache setpriv

# standalone 产物已自动追踪运行时依赖（含 prisma client、@libsql、dockerode 等）
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Prisma schema 与生成的客户端
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/src/generated ./src/generated
# seed 脚本及其依赖（db.ts 用 tsconfig paths，需一并提供）
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
COPY --from=builder --chown=nextjs:nodejs /app/src/lib ./src/lib
COPY --from=builder --chown=nextjs:nodejs /app/tsconfig.json ./tsconfig.json
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
# 完整生产依赖树（Prisma CLI migrate + tsx seed + dockerode 等），替代逐包 COPY
# 避免遗漏 CLI 传递依赖（effect / c12 / chokidar 等）；体积换可靠性
COPY --from=prod-deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# 启动脚本：先迁移 + 种子，再启动 Next.js
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

RUN mkdir -p data uploads/icons/cards uploads/icons/library
RUN chown -R nextjs:nodejs data uploads

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 健康检查：无鉴权探活路由（应用可达 + 数据库连通）；
# start_period 宽限首启迁移 + 种子的耗时
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:3000/api/health || exit 1

CMD ["./docker-entrypoint.sh"]
