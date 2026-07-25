# Spec: NavDeck M1

> 自托管 Docker 导航站，面向 NAS 玩家。M1 目标：核心功能可用。

## Objective

### 项目定位

NavDeck 是一个自托管的 Docker 导航站，部署在 NAS 上，为 NAS 玩家提供：
- 卡片化展示各类自托管服务（qBittorrent / Jellyfin / Alist 等）
- 分类组织卡片，支持拖拽排序
- Docker 容器状态聚合监控（widget 栏）
- 内外网双地址自动切换
- 全局搜索（Cmd+K 搜卡片 + 顶部独立搜索框接 5 个搜索引擎）
- 单用户认证保护

### 用户画像

NAS 玩家，自托管服务用户，程序员背景，桌面端鼠标操作为主。

### M1 成功标准

- 用户能登录系统，未登录无法访问任何功能页
- 用户能创建/编辑/删除/拖拽分类和卡片
- 主页按分类分区展示卡片，状态灯正确反映在线状态
- 点击卡片跳转正确的内外网地址（根据网络策略）
- Widget 栏展示 Docker 容器状态聚合 + 资源水位，30 秒自动刷新
- Cmd+K 唤起搜索，模糊匹配卡片（子串 + 拼音 + 首字母缩写）
- 顶部搜索框切换 5 个搜索引擎跳转
- 设置面板管理分类、账号、网络默认值、主题
- 主题明暗切换 + 跟随系统
- 移动端响应式（widget 栏移到主体下方）

## Tech Stack

### 框架
- Next.js 16.2.11（App Router + Turbopack，有破坏性变更，写代码前查 `node_modules/next/dist/docs/`）
- React 19.2.4
- TypeScript 5.x

### UI 组件
- Astryx v0.1.8（neutral 预设主题，153 组件）
  - 优先使用 Astryx 组件，写 UI 前用 `npx astryx build "<idea>"` / `npx astryx search "<query>"` / `npx astryx component <Name>` 查可用组件
  - 禁止 raw `<div>` / `style={{}}` / hardcoded 值（如 `bg-[#fff]`、`p-[13px]`）
  - 全页 → AppShell；侧边栏 → SideNav
  - 密集数据用 Table / List/Item 边到边，不用 Card 包列表项
  - 状态用 StatusDot / Token，Badge 只用于计数和枚举
- Tailwind CSS v4（utilities + token 兜底，通过 tailwind-theme bridge 共享 token）

### 数据库
- SQLite via libsql（`@prisma/adapter-libsql`）
- Prisma 7.9.0
  - generator 用 `prisma-client`（非 `prisma-client-js`），输出到 `src/generated/prisma`
  - 主入口 `src/generated/prisma/client.ts`
  - 配置在 `prisma.config.ts`，用 dotenv 读 DATABASE_URL

### 认证
- NextAuth.js v5（Auth.js）
- Credentials Provider + JWT + httpOnly Cookie
- 30 天固定有效期
- 密码 bcrypt 哈希

### 第三方库
- `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities` —— 拖拽（分类排序 + 卡片分类内/跨分类拖拽）
- `next-auth` —— 认证
- `bcryptjs` —— 密码哈希（纯 JS，Docker alpine 友好）
- `cheerio` —— 服务端 HTML 解析（favicon 抓取）
- `pinyin-pro` —— 中文拼音 + 首字母缩写搜索

### 运行环境
- Docker 容器部署（node:22-alpine 多阶段构建）
- 挂载 `/var/run/docker.sock:/var/run/docker.sock`（Docker 监控数据源）
- 挂载 `./data:/app/data`（DB + 上传图标持久化）
- 环境变量：`AUTH_USERNAME` + `AUTH_PASSWORD` + `DATABASE_URL`

## Commands

```bash
# 开发
npm run dev                    # Next.js dev server（Turbopack）

# 构建
npm run build                  # 生产构建（output: standalone）
npm run start                  # 运行生产构建

# 代码质量
npm run lint                   # ESLint 检查
npm run lint:fix               # ESLint 自动修复
npm run typecheck              # tsc --noEmit 类型检查

# 测试
npm test                       # vitest run
npm run test:watch              # vitest watch 模式
npm run test:coverage           # vitest + 覆盖率
npm run test:e2e                # Playwright（M1 暂未配置）

# 数据库
npm run db:generate             # prisma generate
npm run db:migrate              # prisma migrate deploy（生产）
npm run db:migrate:dev          # prisma migrate dev（开发）
npm run db:studio               # prisma studio
npm run db:seed                 # tsx scripts/seed.ts

# Astryx CLI
npx astryx build "<idea>"       # 返回 kit（page + blocks + components）
npx astryx search "<query>"     # 搜索组件/hook/模板
npx astryx component <Name>      # 查组件 props + 示例
npx astryx docs <topic>         # 查文档（layout/tokens/theme 等）
npx astryx template --list      # 列出 page + block 模板
```

## Project Structure

```
d:\git_space\navdeck\
├── prisma/
│   └── schema.prisma              # Prisma 数据模型
├── prisma.config.ts               # Prisma 7 配置（datasource url）
├── public/
│   └── icons/                     # 内置图标（随版本发布，约 50-100 个 NAS 服务图标）
├── scripts/
│   └── seed.ts                    # 数据库种子脚本
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/
│   │   │       └── page.tsx       # 登录页
│   │   ├── (protected)/
│   │   │   ├── layout.tsx         # 受保护布局（middleware 校验）
│   │   │   ├── page.tsx           # 主页（分类分区 + 卡片 + widget 栏 + 搜索）
│   │   │   └── settings/
│   │   │       ├── page.tsx       # 设置面板（独立页面 + 左侧 tab）
│   │   │       ├── general/
│   │   │       │   └── page.tsx   # 基础设置（账号 + 网络默认值 + 主题）
│   │   │       └── categories/
│   │   │           └── page.tsx   # 分类管理
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   └── [...nextauth]/
│   │   │   │       └── route.ts   # NextAuth API
│   │   │   ├── cards/
│   │   │   │   ├── route.ts       # 卡片 CRUD
│   │   │   │   ├── [id]/
│   │   │   │   │   └── route.ts   # 单卡片操作
│   │   │   │   ├── reorder/
│   │   │   │   │   └── route.ts   # 拖拽排序
│   │   │   │   └── status/
│   │   │   │       └── route.ts   # 批量状态探测
│   │   │   ├── categories/
│   │   │   │   ├── route.ts       # 分类 CRUD
│   │   │   │   └── reorder/
│   │   │   │       └── route.ts   # 拖拽排序
│   │   │   ├── widgets/
│   │   │   │   ├── config/
│   │   │   │   │   └── route.ts   # widget 栏配置
│   │   │   │   ├── docker/
│   │   │   │   │   └── route.ts  # Docker 数据（NasStatus + ResourceGauge）
│   │   │   │   └── countdown/     # 倒数日
│   │   │   │       └── route.ts
│   │   │   ├── icons/
│   │   │   │   ├── upload/
│   │   │   │   │   └── route.ts   # 上传图标
│   │   │   │   ├── favicon/
│   │   │   │   │   └── route.ts   # 抓取 favicon
│   │   │   │   └── library/
│   │   │   │       └── route.ts   # 图标库搜索 + 按需拉取
│   │   │   └── search/
│   │   │       └── route.ts       # Cmd+K 搜索
│   │   ├── globals.css            # 全局样式（Astryx + Tailwind 层叠）
│   │   ├── layout.tsx             # 根布局（字体 + Providers）
│   │   └── providers.tsx          # ThemeProvider + LinkProvider + NextAuth
│   ├── components/
│   │   ├── dnd/                   # 拖拽封装（@dnd-kit）
│   │   │   ├── SortableList.tsx   # 垂直列表拖拽（分类）
│   │   │   ├── SortableGrid.tsx   # 网格拖拽（卡片）
│   │   │   └── SortableContext.tsx
│   │   ├── cards/
│   │   │   ├── CardGrid.tsx       # 卡片网格
│   │   │   ├── CardItem.tsx       # 单卡片（图标+状态灯+标题）
│   │   │   ├── CardEditModal.tsx  # 卡片编辑 Modal
│   │   │   └── StatusDot.tsx      # 状态灯
│   │   ├── categories/
│   │   │   ├── CategorySection.tsx # 分类分区（标题 + 卡片网格）
│   │   │   └── CategoryEditForm.tsx
│   │   ├── widgets/
│   │   │   ├── WidgetBar.tsx      # widget 栏容器
│   │   │   ├── WidgetConfig.tsx   # widget 栏配置浮层
│   │   │   ├── NasStatus.tsx      # Docker 容器状态聚合
│   │   │   ├── ResourceGauge.tsx  # 资源水位（CPU/内存/磁盘IO）
│   │   │   ├── CountdownWidget.tsx # 倒数日
│   │   │   └── CountupWidget.tsx   # 正数日
│   │   ├── search/
│   │   │   ├── SearchBox.tsx      # 顶部独立搜索框（5 引擎切换）
│   │   │   ├── EngineSwitcher.tsx # 引擎切换器
│   │   │   └── CmdKModal.tsx     # Cmd+K 搜索 Modal
│   │   ├── settings/
│   │   │   ├── SettingsLayout.tsx # 设置面板布局（左侧 tab）
│   │   │   ├── AccountForm.tsx    # 账号管理
│   │   │   ├── NetworkForm.tsx    # 网络模式默认值
│   │   │   ├── ThemeForm.tsx      # 主题切换
│   │   │   └── CategoryManager.tsx # 分类管理
│   │   └── layout/
│   │       ├── Header.tsx         # 顶部（Logo 左 + 搜索居中 + 设置右）
│   │       └── NetworkToggle.tsx  # 网络模式切换器（自动/内网/外网）
│   ├── lib/
│   │   ├── db.ts                  # Prisma 单例（driver adapter）
│   │   ├── auth.ts                # NextAuth 配置
│   │   ├── docker.ts             # Docker API 客户端（dockerode）
│   │   ├── favicon.ts            # favicon 抓取（cheerio）
│   │   ├── icons.ts             # 图标库元数据 + 按需拉取
│   │   ├── search.ts            # 搜索匹配（pinyin-pro）
│   │   └── network.ts           # 内外网判断
│   ├── hooks/
│   │   ├── useTheme.ts           # 主题切换 hook
│   │   ├── useNetworkMode.ts    # 网络模式 hook
│   │   └── useWidgetConfig.ts   # widget 配置 hook
│   └── types/
│       └── index.ts              # 共享类型定义
├── data/                          # 运行时数据（git 忽略）
│   ├── navdeck.db                 # SQLite 数据库
│   └── uploads/
│       └── icons/
│           ├── cards/             # 用户上传的卡片图标
│           └── library/           # 从图标库拉取的图标副本
├── Dockerfile                     # 多阶段构建
├── docker-compose.yml             # 服务编排
├── next.config.ts                 # Next.js 配置（standalone + serverExternalPackages）
└── docs/
    └── spec.md                    # 本文件
```

## Code Style

### 命名约定
- 文件：PascalCase（组件）/ camelCase（工具）/ kebab-case（路由）
- 组件：PascalCase（`CardItem`、`WidgetBar`）
- 函数/变量：camelCase
- 类型/接口：PascalCase
- 常量：UPPER_SNAKE_CASE
- 数据库字段：camelCase（Prisma 默认）

### Astryx 组件优先
```tsx
// ✅ 正确：Astryx 组件 + token utility
import { Card, Button, StatusDot } from '@astryxdesign/core';

export function CardItem({ card }: { card: Card }) {
  return (
    <Card className="p-4 flex flex-col gap-2 items-center">
      <Image src={card.icon} alt={card.name} width={48} height={48} />
      <StatusDot variant={card.status === 'online' ? 'success' : 'danger'} />
      <Text className="text-secondary">{card.name}</Text>
    </Card>
  );
}

// ❌ 错误：raw <div> + style={{}} + hardcoded 值
<div style={{ padding: 16, display: 'flex' }}>
  <div style={{ color: '#666' }}>标题</div>
</div>
```

### Server Component vs Client Component
```tsx
// Server Component（默认）：数据获取、静态展示
// app/page.tsx
import { prisma } from '@/lib/db';

export default async function Home() {
  const categories = await prisma.category.findMany({
    include: { cards: true },
  });
  return <CardGrid categories={categories} />;  // Client Component
}

// Client Component：交互、状态、浏览器 API
'use client';
import { useState } from 'react';
import { Dialog } from '@astryxdesign/core';

export function CardEditModal() {
  const [open, setOpen] = useState(false);
  return <Dialog open={open} onOpenChange={setOpen}>...</Dialog>;
}
```

### API Route
```ts
// app/api/cards/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: '未授权' }, { status: 401 });

  const cards = await prisma.card.findMany({
    include: { category: true },
    orderBy: { order: 'asc' },
  });
  return NextResponse.json(cards);
}
```

## Testing Strategy

### 框架
- **单元测试**：Vitest（已安装）
- **E2E 测试**：Playwright（M1 暂未配置，留位）

### 测试位置
```
src/
├── components/
│   └── cards/
│       ├── CardItem.tsx
│       └── __tests__/
│           └── CardItem.test.tsx    # 组件测试与组件同目录
└── lib/
    └── search.ts
        └── __tests__/
            └── search.test.ts        # 工具测试与工具同目录
```

### 测试覆盖期望
- `lib/` 工具函数：100% 覆盖（search、network 判断、favicon 解析）
- `lib/docker.ts`：mock Docker API
- 组件：核心交互（拖拽、Modal 开关、表单提交）
- API Route：CRUD + 权限校验
- E2E：M1 不做，留位

### 测试优先级（M1）
1. 搜索匹配逻辑（拼音 + 首字母缩写 + 子串）
2. 内外网 URL 选择逻辑
3. 图标库元数据解析
4. 分类/卡片 CRUD API
5. 认证中间件

## Boundaries

### Always
- 写 UI 前先用 `npx astryx build` / `astryx search` / `astryx component` 查组件
- 所有值用 Astryx token（`bg-surface` / `text-primary` / `rounded-lg`）
- 完成前自检：替换 `style={{}}` / raw `<div>` / hardcoded 值
- API Route 必须校验 session
- 密码 bcrypt 哈希存储
- 上传文件存 `data/uploads/`，DB 存相对路径
- 写 Next.js 代码前查 `node_modules/next/dist/docs/`（破坏性变更）

### Ask First
- 新增第三方依赖
- 修改 Prisma schema（需 migrate）
- 改 `next.config.ts` / `tsconfig.json` / `prisma.config.ts`
- 改 Dockerfile / docker-compose.yml
- 新增环境变量

### Never
- raw `<div>` / `style={{}}` / hardcoded 值（`bg-[#fff]`、`p-[13px]`）
- 明文存储密码
- 提交 `.env` / `data/` / `src/generated/`
- 在 `:root` 覆盖 `--color-*`
- 在组件里写 `import './xxx.css'` 或 `@apply`
- 跳过 middleware 直接暴露受保护路由

## 数据模型

### Prisma Schema

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "sqlite"
}

model User {
  id           String   @id @default(cuid())
  username     String   @unique
  passwordHash String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model Category {
  id    String @id @default(cuid())
  name  String
  icon  String?
  color String?
  order Int    @default(0)
  cards Card[]

  @@map("categories")
}

model Card {
  id          String   @id @default(cuid())
  name        String
  internalUrl String
  externalUrl String
  icon        String
  description String?
  categoryId  String?
  category    Category? @relation(fields: [categoryId], references: [id], onDelete: SetNull)
  order       Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([categoryId])
  @@map("cards")
}

model WidgetConfig {
  id        String  @id @default(cuid())
  widgetKey String  @unique  // 'nas-status' | 'resource-gauge' | 'countdown' | 'countup'
  enabled   Boolean @default(true)
  order     Int     @default(0)

  @@map("widget_configs")
}

model DateItem {
  id        String   @id @default(cuid())
  widgetKey String   // 'countdown' | 'countup'
  name      String
  date      DateTime
  recurring Boolean   @default(false)  // 是否每年循环（倒数日用）
  createdAt DateTime @default(now())

  @@index([widgetKey])
  @@map("date_items")
}

model UserPreference {
  id            String @id @default(cuid())
  key           String @unique
  value         String

  @@map("user_preferences")
  // 存储项：networkMode | theme | searchEngine | widgetLayout
}
```

### 字段说明

#### Category
- `name`（必填）：分类名称
- `icon`（选填）：图标路径或图标名
- `color`（选填）：强调色，默认继承主题中性色
- `order`（自动）：排序，拖拽调整

#### Card
- `name`（必填）：卡片标题
- `internalUrl`（必填）：内网地址
- `externalUrl`（必填）：外网地址
- `icon`（必填）：图标路径（三种来源：favicon / 上传 / 图标库）
- `description`（选填）：hover 描述
- `categoryId`（选填，不填则归「未分类」）
- `order`（自动，拖拽调整）
- 删除分类时 `categoryId` 自动置空（`onDelete: SetNull`）

#### DateItem
- `widgetKey`：`'countdown'` 或 `'countup'`
- `name`：日期项名称
- `date`：目标日期（倒数日）或起始日期（正数日）
- `recurring`：是否每年循环（仅倒数日用，正数日不循环）

#### UserPreference
- 存储全局配置：`networkMode`（auto/internal/external）、`theme`（light/dark/system）、`searchEngine`（google/bing/baidu/github/stackoverflow）、`widgetLayout`（1/2）

## 模块意图

### 1. 分类管理

- 扁平一层，无嵌套
- 字段：name（必填）、icon（选填）、color（选填）、order（自动）
- 主页按分类分区纵向铺开，所有分类在一页内滚动浏览
- 卡片可「未分类」，未分类分区排在最后
- 删除分类时，其下卡片自动归到「未分类」（categoryId 置空）
- 分类管理入口：右上「设置」→ 设置面板 → 分类管理 tab
- 排序方式：拖拽（@dnd-kit/sortable）

### 2. 卡片模型

- 字段：name / internalUrl / externalUrl / icon / description / categoryId / order
- 状态灯三态：🟢 在线 / 🔴 离线 / ⚪ 未知
- 检测时机：
  - 进入页面时：前端调 `/api/cards/status`，后端并发探测所有卡片
  - 点击卡片时：立即跳转 + 后台异步触发该卡片检测，不阻塞跳转
- 检测执行方：后端（规避 CORS）
- 探测目标：根据网络策略选择 URL
- 拖拽：分类内重排 order + 跨分类改 categoryId（含拖到/拖出「未分类」）
- 内外网切换（全局设置）：
  - 三态切换器位于右上角「设置」按钮旁
  - 自动（默认）：内网优先，内网不通用外网
  - 内网：强制用 internalUrl
  - 外网：强制用 externalUrl
  - 切换后立即生效

### 3. Widget 栏

- widget 列表（M1）：
  - **NasStatus**：运行中容器数 / 总容器数 + 状态分布
  - **ResourceGauge**：CPU 使用率 + 内存使用率 + 磁盘 IO 速率（容器聚合）
  - **倒数日**：多条日期项，每条 = 名称 + 目标日期 + 是否每年循环，按距今天数升序，显示「名称 · 还有 X 天」
  - **正数日**：多条日期项，每条 = 名称 + 起始日期，按天数降序，显示「名称 · 已 X 天」
- widget 栏配置（widget 栏顶部图标按钮 → 浮层）：
  - 显示/隐藏每个 widget
  - 拖拽排序
  - 1 栏 / 2 栏布局切换
- widget 内部配置（每个 widget 右上角齿轮 → 浮层）：
  - NasStatus / ResourceGauge：无内部配置
  - 倒数日 / 正数日：增删改日期项
- 数据刷新：
  - Docker 数据 widget（NasStatus + ResourceGauge）：30 秒自动刷新
  - 自定义数据 widget（正数日/倒数日）：进入页面时计算一次
- 数据源：
  - Docker 数据：后端通过 Docker socket 调 Docker API
  - 自定义数据：存 DB（DateItem 表）
- widget 栏 360px 宽，右侧固定（桌面）/ 主体下方（移动端）

### 4. 认证

- NextAuth.js (Auth.js v5) + Credentials Provider
- JWT + httpOnly Cookie，30 天有效期
- 账号初始化：
  - docker-compose 挂 `AUTH_USERNAME=admin` + `AUTH_PASSWORD=changeme`
  - 后端启动时检查 DB，DB 为空则读环境变量初始化账号（密码 bcrypt 哈希后入库）
  - DB 有数据后以 DB 为准
- 账号管理：登录后可在设置面板改账号名 + 密码
- 密码存储：bcrypt 哈希（bcryptjs）
- 路由保护：middleware 拦截未登录请求，跳转 `/login`
- 登出：NextAuth 内置 `/api/auth/signout`

### 5. Cmd+K 搜索

- 唤起：Cmd+K（Mac）/ Ctrl+K（Windows/Linux）/ 顶部搜索图标按钮（移动端）
- 搜索范围：卡片（name + url + description）
- 匹配方式：不区分大小写子串 + 拼音匹配 + 首字母缩写匹配
- 实时搜索，debounce 200ms
- 键盘上下箭头切换选中项，回车跳转
- 结果纯列表：图标 + 名称 + 分类名副标题
- 匹配高亮
- 跳转后 Modal 自动关闭

### 6. 搜索引擎（顶部独立搜索框）

- 5 个预置引擎：
  - Google: `https://www.google.com/search?q=`
  - Bing: `https://www.bing.com/search?q=`
  - 百度: `https://www.baidu.com/s?wd=`
  - GitHub: `https://github.com/search?q=`
  - Stack Overflow: `https://stackoverflow.com/search?q=`
- 切换器：搜索框左侧按钮显示当前引擎 logo/名称，点击展开下拉菜单
- 当前选中引擎持久化（UserPreference 表）
- 输入关键词回车 → 新标签页打开 `引擎URL + encodeURIComponent(关键词)`
- 空输入回车无反应
- 布局：搜索框独立居中，560×48px（桌面），占满宽度（移动端）

### 7. 设置面板

- 形态：独立页面 `/settings` + 左侧 tab 导航
- Tab 列表：
  - **基础设置**（`/settings/general`）：
    - 账号管理：改账号名 + 改密码
    - 网络模式默认值：自动 / 内网 / 外网
    - 外观：主题切换（明亮 / 暗黑 / 跟随系统）
  - **分类管理**（`/settings/categories`）：
    - 增删改 + 拖拽排序
- 主题切换两种入口：
  - 设置面板 → 外观 → 三档 radio
  - 右上角「设置」按钮旁放明暗切换图标

### 8. 图标库

- 三种来源（互斥，只存最终值）：
  - **URL 抓 favicon**：用户填完 URL 后自动尝试抓取，作为默认图标
  - **用户上传**：从本地选择图片文件上传
  - **图标库选择**：从 Walkxcode Dashboard Icons 选
- 图标库（Walkxcode Dashboard Icons）：
  - 内置部分：`public/icons/` 内置约 50-100 个常用 NAS 服务图标
  - 按需拉取：后端从 GitHub raw 拉取对应 SVG/PNG，存到 `data/uploads/icons/library/`
  - 图标清单：内置 JSON 清单（图标名 + 分类 + GitHub 路径）
  - 离线场景：无公网时只能用内置 + 上传，按需拉取失败给提示
- 存储目录分开：
  - `public/icons/`：内置图标
  - `data/uploads/icons/cards/`：用户上传的卡片图标
  - `data/uploads/icons/library/`：从图标库拉取的图标副本
- DB 卡片 icon 字段存相对路径
- 交互：
  - 用户填完 URL → 自动抓 favicon 预览
  - icon 预览区旁边两个按钮：上传 / 从图标库选
  - 三者互斥，后选覆盖先选

## Success Criteria

### 功能完整性
- [ ] 用户能登录/登出，未登录跳转登录页
- [ ] 用户能创建/编辑/删除分类，拖拽排序
- [ ] 用户能创建/编辑/删除卡片，拖拽排序（分类内 + 跨分类）
- [ ] 主页按分类分区展示卡片，未分类分区排在最后
- [ ] 状态灯正确显示三态（在线/离线/未知）
- [ ] 点击卡片跳转正确的内外网地址
- [ ] Widget 栏展示 4 个 widget，30 秒自动刷新 Docker 数据
- [ ] Cmd+K 搜索能模糊匹配（子串 + 拼音 + 首字母缩写）
- [ ] 顶部搜索框切换 5 个引擎跳转
- [ ] 设置面板能改账号/密码/网络默认值/主题
- [ ] 主题明暗切换 + 跟随系统
- [ ] 图标三种来源可用（favicon / 上传 / 图标库）

### 响应式
- [ ] 桌面端：1440px 居中 + 右侧 widget 栏 360px
- [ ] 移动端：单列 + widget 栏移到主体下方
- [ ] 搜索框 / 卡片网格 / 设置面板自适应

### 代码质量
- [ ] `npm run lint` 通过
- [ ] `npm run typecheck` 通过
- [ ] `npm run build` 通过
- [ ] 无 raw `<div>` / `style={{}}` / hardcoded 值
- [ ] 所有值用 Astryx token
- [ ] 单元测试覆盖核心工具函数

### 部署
- [ ] `docker build` 通过
- [ ] docker-compose up 启动后可访问
- [ ] 数据持久化（DB + 上传图标在 `./data` 卷里）

## Open Questions

- 内外网自动判断的具体实现方式（内网探测 ping vs HTTP 探测 vs 客户端 IP 判断）
- Docker 容器状态聚合的 API 实现细节（dockerode 库选择）
- favicon 抓取的容错策略（目标站无 favicon 时返回默认图标）
- 图标库清单的初始内容（50-100 个常用 NAS 服务的具体清单）
- Playwright E2E 测试是否在 M1 配置（当前列为暂留位）
