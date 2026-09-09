# NavDeck

自托管 Docker 导航站，面向 NAS 玩家。📖 [使用手册](./docs/manual.md)卡片化展示自托管服务，集成 Docker 容器状态监控、内外网双地址自动切换、全局搜索（Cmd+K + 拼音匹配）和单用户认证保护。

## 功能特性

- **卡片化服务导航**：按分类组织自托管服务卡片（qBittorrent / Jellyfin / Alist 等），支持分类与卡片拖拽排序、批量管理、在线状态灯
- **内外网双地址自动切换**：根据网络策略，点击卡片跳转正确的内网 / 外网 URL
- **Widget 栏**：NAS 状态（Docker 容器聚合总览）、资源水位（CPU / 内存 / 磁盘 IO，30 秒自动刷新）、倒数日 / 正数日（支持多日期项与重复日期）；widget 实例支持添加、调整大小与排序
- **Lucky 规则同步**：对接 Lucky OpenAPI，一键将 Web 反代规则同步为卡片（全量 diff，失效规则可一键恢复跳过项或清理）
- **全局搜索**：Cmd+K 唤起，子串 + 拼音 + 首字母缩写匹配；顶部搜索框支持多个搜索引擎配置与排序（默认 Google / Bing / 百度 / DuckDuckGo / 自定义）
- **壁纸与图标**：自定义首页壁纸上传；图标支持内置图标库、上传自定义图标、favicon 自动抓取
- **备份 / 恢复**：一键导出 zip（配置数据 + 上传文件），支持导入恢复
- **主题**：明暗切换 + 跟随系统
- **单用户认证**：Credentials + JWT，30 天有效期
- **响应式布局**：桌面端 widget 栏右侧，移动端下方

## 技术栈

- **框架**：Next.js 16.2.11（App Router + Turbopack）
- **UI**：React 19.2.4 + Astryx v0.5.2（neutral 预设）+ Tailwind CSS v4
- **数据库**：SQLite via libsql + Prisma 7.9.0
- **认证**：NextAuth.js v5 + bcryptjs
- **拖拽**：@dnd-kit/core + @dnd-kit/sortable
- **表单校验**：zod + react-hook-form
- **代码质量**：Biome v2.5.5（lint + format）
- **测试**：Vitest 4.x

## 快速开始

### 环境要求

- Node.js 22+（见 `.nvmrc`）
- npm 10+

### 安装

```bash
git clone <repo-url>
cd navdeck
npm ci
cp .env.example .env  # 修改默认密码和 AUTH_SECRET
npm run db:migrate:dev  # 初始化数据库
npm run db:seed          # 写入默认账号
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)，使用 `.env` 中配置的账号登录。

### 环境变量

见 [.env.example](./.env.example) 完整说明。

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `DATABASE_URL` | 是 | `file:./data/navdeck.db` | SQLite 数据库路径 |
| `AUTH_SECRET` | 是 | - | NextAuth 加密密钥，至少 32 字符 |
| `AUTH_USERNAME` | 是 | `admin` | 默认管理员用户名 |
| `AUTH_PASSWORD` | 是 | `changeme` | 默认管理员密码 |
| `DOCKER_HOST` | 否 | unix socket | Docker 监控数据源（如 `tcp://host:2375`）|

## 常用命令

```bash
# 开发
npm run dev                    # 启动 dev server（Turbopack）

# 构建
npm run build                  # 生产构建（output: standalone）
npm run start                  # 运行生产构建

# 代码质量
npm run lint                   # Biome lint 检查
npm run lint:fix               # Biome lint 自动修复
npm run format                 # Biome 格式化
npm run check                  # Biome 完整检查（lint + format）
npm run check:staged           # Biome 只检查暂存文件（pre-commit 用）
npm run typecheck              # tsc --noEmit 类型检查

# 测试
npm test                       # vitest run
npm run test:watch             # vitest watch 模式
npm run test:coverage          # vitest + 覆盖率

# 发布（升 patch 版本并推送镜像/tag）
bash scripts/release.sh patch

# 数据库
npm run db:generate             # prisma generate
npm run db:migrate              # prisma migrate deploy（生产）
npm run db:migrate:dev         # prisma migrate dev（开发）
npm run db:studio               # prisma studio
npm run db:seed                 # 写入种子数据
```

## Docker 部署

### 方式一：拉取镜像（推荐，无需克隆源码）

镜像发布在 GHCR：`ghcr.io/wavesbig/navdeck`（tag 见 [Packages](https://github.com/wavesbig?tab=packages)）

```bash
# 1. 准备目录与配置
mkdir navdeck && cd navdeck
mkdir data
# 下载生产 compose
curl -O https://raw.githubusercontent.com/wavesbig/navdeck/main/docker-compose.prod.yml

# 2. 创建 .env（AUTH_SECRET 必填）
cat > .env <<'EOF'
AUTH_SECRET=请替换为随机字符串（openssl rand -base64 32 生成）
AUTH_USERNAME=admin
AUTH_PASSWORD=请修改默认密码
EOF

# 3. 启动（Linux NAS 请按需设置 DOCKER_GID，见 compose 注释）
docker compose -f docker-compose.prod.yml up -d
```

打开 `http://<主机IP>:3000`，用 `.env` 中的账号登录，**请立即修改默认密码**。

### 方式二：源码构建

```bash
# 克隆本仓库后
docker compose up -d --build
```

### 通用说明

- 容器启动时会自动执行数据库迁移和种子写入
- 数据持久化在 `./data` 目录，升级/重建容器不会丢失
- 反代/域名部署建议在 `.env` 加 `AUTH_URL=https://你的域名`
- 停止：`docker compose down`；日志：`docker compose logs -f navdeck`


## 项目结构

```
navdeck/
├── prisma/              # Prisma schema 与迁移
├── public/icons/       # 内置图标库（manifest.json）
├── scripts/            # seed 等脚本
├── src/
│   ├── app/            # Next.js App Router
│   │   ├── api/        # API 路由
│   │   ├── settings/   # 设置面板
│   │   └── login/      # 登录页
│   ├── components/     # React 组件
│   │   ├── cards/      # 卡片相关
│   │   ├── categories/ # 分类
│   │   ├── dnd/        # 拖拽
│   │   ├── layout/     # 布局
│   │   ├── search/    # 搜索
│   │   ├── settings/   # 设置面板
│   │   └── widgets/    # Widget 栏
│   ├── hooks/          # React hooks
│   ├── lib/            # 业务逻辑（auth / db / docker / search 等）
│   └── types/          # 共享类型
├── docs/spec.md        # 产品规格说明
└── tasks/              # 任务清单
```

## 开发约定

- **语言**：项目仅支持中文。UI 文案、注释、文档、提交信息使用中文（技术术语保留英文）
- **提交规范**：Conventional Commits 格式（`feat(scope):` / `fix(scope):` / `docs:` / `style:` / `refactor(scope):` / `chore:` / `test(scope):` / `perf(scope):`）
- **UI 组件**：优先使用 Astryx 组件；写 UI 前用 `npx astryx build "<idea>"` / `astryx search "<query>"` / `astryx component <Name>` 查可用组件
- **样式**：禁止 raw `<div>`、`style={{}}` 及 hardcoded 值，采用「组件 + token-backed utility」工作流
- **表单布局**：表单字段容器统一使用 Astryx `FormLayout`（`vertical` / `horizontal` 配对字段），不再手写 VStack 间距

## License

[MIT](./LICENSE)
