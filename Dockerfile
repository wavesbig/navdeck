# 多阶段构建：deps → builder → runner
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
# 安装全部依赖（含 devDependencies），供 builder 阶段类型检查与构建使用
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# standalone 产物已自动追踪运行时依赖（含 prisma client、@libsql、dockerode 等）
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Prisma schema 与生成的客户端
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/src/generated ./src/generated
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@libsql ./node_modules/@libsql
# dockerode 依赖 native module（ssh2 等），显式复制避免 standalone 漏追踪
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/dockerode ./node_modules/dockerode
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/ssh2 ./node_modules/ssh2
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/asn1-ber ./node_modules/asn1-ber
# Prisma CLI 与 dotenv：用于启动时执行 migrate + seed
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/dotenv ./node_modules/dotenv
# seed 脚本与 tsx 运行时
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/tsx ./node_modules/tsx
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@babel ./node_modules/@babel
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/typescript ./node_modules/typescript
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@esbuild ./node_modules/@esbuild
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

# 启动脚本：先迁移 + 种子，再启动 Next.js
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

RUN mkdir -p data uploads/icons/cards uploads/icons/library
RUN chown -R nextjs:nodejs data uploads

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["./docker-entrypoint.sh"]
