# NavDeck

自托管 Docker 导航站，面向 NAS 玩家。卡片化展示自托管服务，集成 Docker 容器状态监控、内外网双地址自动切换、全局搜索（Cmd+K + 拼音匹配）和单用户认证保护。

## 功能特性

- 卡片化展示自托管服务（qBittorrent / Jellyfin / Alist 等），按分类组织，支持拖拽排序
- Docker 容器状态聚合监控 + 资源水位（CPU / 内存 / 磁盘 IO）30 秒自动刷新
- 内外网双地址自动切换，点击卡片跳转正确的 URL（根据网络策略）
- 顶部独立搜索框 + Cmd+K 全局搜索（子串 + 拼音 + 首字母缩写匹配）
- 5 个搜索引擎切换（Google / Bing / 百度 / DuckDuckGo / 自定义）
- 主题明暗切换 + 跟随系统
- 单用户认证保护，JWT 30 天有效期
- 响应式布局：桌面端 widget 栏右侧，移动端下方

## 技术栈

- **框架**：Next.js 16.2.11（App Router + Turbopack）
- **UI**：React 19.2.4 + Astryx v0.1.8（neutral 预设）+ Tailwind CSS v4
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

# 数据库
npm run db:generate             # prisma generate
npm run db:migrate              # prisma migrate deploy（生产）
npm run db:migrate:dev         # prisma migrate dev（开发）
npm run db:studio               # prisma studio
npm run db:seed                 # 写入种子数据
```

## Docker 部署

```bash
# 构建并启动
docker compose up -d --build

# 查看日志
docker compose logs -f navdeck

# 停止
docker compose down
```

容器启动时会自动执行数据库迁移和种子写入。数据持久化在 `./data` 目录。

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

## License

[MIT](./LICENSE)
