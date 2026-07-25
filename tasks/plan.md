# NavDeck M1 实现计划

> 基于 [docs/spec.md](../docs/spec.md) 的实现路线图。M1 目标：核心功能可用。

## 实现策略

### Tracer Bullet（先打穿垂直切片）

不按模块逐个堆叠，而是先打穿一个最小可用切片：**用户登录 → 看到首页空状态 → 创建一个分类 → 创建一张卡片 → 看到卡片展示**。这条链路通了之后，再围绕它补充 widget 栏、搜索、设置面板、图标库等外围功能。

理由：
- M0 脚手架已就位，无需重复配置技术栈
- 垂直切片能尽早暴露 Server Component / Client Component 边界、Prisma 调用链、Astryx 集成问题
- 卡片是核心实体，所有其他功能（搜索、widget、拖拽）都围绕它展开

### 实现顺序

```
M1.1 数据层（Prisma schema + 初始化）
   ↓
M1.2 认证（登录 + middleware）
   ↓
M1.3 主页骨架（AppShell + Header + 搜索框 + 空状态）
   ↓
M1.4 分类 + 卡片 CRUD（垂直切片打通）
   ↓
M1.5 拖拽排序（@dnd-kit 集成）
   ↓
M1.6 状态灯 + 内外网切换
   ↓
M1.7 Widget 栏（Docker + 倒数日/正数日）
   ↓
M1.8 搜索（Cmd+K + 引擎切换）
   ↓
M1.9 设置面板（账号/网络/主题/分类管理）
   ↓
M1.10 图标库（favicon + 上传 + Walkxcode）
   ↓
M1.11 响应式 + 主题切换
   ↓
M1.12 测试 + 部署验证
```

## 里程碑

### M1.1 数据层
- 更新 `prisma/schema.prisma`：User / Category / Card / WidgetConfig / DateItem / UserPreference
- `prisma migrate dev --name init`
- 更新 `scripts/seed.ts`：默认账号（从环境变量）+ 默认 widget 配置
- 单元测试：schema 校验、seed 脚本

### M1.2 认证
- 安装 `next-auth@beta` + `bcryptjs`
- `src/lib/auth.ts`：NextAuth 配置（Credentials Provider + JWT + 30 天）
- `src/app/api/auth/[...nextauth]/route.ts`
- `src/app/(auth)/login/page.tsx`：登录页（Astryx Form + Input + Button）
- `middleware.ts`：拦截未登录跳转 `/login`
- 启动时初始化账号：`scripts/seed.ts` 读 `AUTH_USERNAME` + `AUTH_PASSWORD`

### M1.3 主页骨架
- `npx astryx build "navigation dashboard with search and widget sidebar"` → 获取 kit
- `src/components/layout/Header.tsx`：Logo 左 + 搜索居中 + 设置右
- `src/app/(protected)/page.tsx`：AppShell 布局 + 空状态
- `src/components/search/SearchBox.tsx`：顶部独立搜索框（先占位，M1.8 实现引擎切换）
- 响应式布局框架（桌面 1440px 居中 + widget 栏 360px，移动端单列）

### M1.4 分类 + 卡片 CRUD
- `src/app/api/categories/route.ts`：GET / POST / PATCH / DELETE
- `src/app/api/cards/route.ts` + `[id]/route.ts`：CRUD
- `src/components/categories/CategorySection.tsx`：分类分区（标题 + 卡片网格）
- `src/components/cards/CardItem.tsx`：单卡片（图标 + 状态灯占位 + 标题）
- `src/components/cards/CardEditModal.tsx`：卡片编辑 Modal（Dialog + Form）
- 主页组装：分类分区纵向铺开 + 未分类排在最后
- 拖拽占位（M1.5 实现）

### M1.5 拖拽排序
- 安装 `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities`
- `src/components/dnd/SortableList.tsx`：垂直列表（分类排序）
- `src/components/dnd/SortableGrid.tsx`：网格（卡片排序）
- 跨容器拖拽：DndContext + 多个 SortableContext
- `src/app/api/cards/reorder/route.ts` + `categories/reorder/route.ts`
- 卡片跨分类拖拽：更新 categoryId + order

### M1.6 状态灯 + 内外网切换
- `src/lib/network.ts`：网络模式判断（auto 模式：探测内网可达性）
- `src/app/api/cards/status/route.ts`：并发探测所有卡片
- `src/components/cards/StatusDot.tsx`：三态状态灯（Astryx StatusDot）
- `src/components/layout/NetworkToggle.tsx`：三态切换器
- 点击卡片：跳转 + 后台异步触发 `/api/cards/[id]/status`
- 状态缓存：进入页面时拉一次，点击时更新对应卡片

### M1.7 Widget 栏
- 安装 `dockerode`（Docker API 客户端）
- `src/lib/docker.ts`：Docker 客户端单例 + 容器聚合统计
- `src/app/api/widgets/docker/route.ts`：返回容器状态 + 资源水位
- `src/components/widgets/WidgetBar.tsx`：widget 栏容器
- `src/components/widgets/NasStatus.tsx`：容器状态聚合
- `src/components/widgets/ResourceGauge.tsx`：CPU/内存/磁盘IO 进度条（Astryx Progress）
- `src/components/widgets/CountdownWidget.tsx` + `CountupWidget.tsx`：日期项列表
- `src/app/api/widgets/countdown/route.ts`：日期项 CRUD
- 30 秒自动刷新（Docker 数据 widget）
- widget 栏配置浮层：显示/隐藏 + 排序 + 1/2 栏切换

### M1.8 搜索
- 安装 `pinyin-pro`
- `src/lib/search.ts`：搜索匹配（子串 + 拼音 + 首字母缩写）
- `src/app/api/search/route.ts`：服务端搜索
- `src/components/search/CmdKModal.tsx`：Cmd+K Modal（Dialog + List + 键盘导航）
- `src/components/search/EngineSwitcher.tsx`：5 引擎切换器
- `src/components/search/SearchBox.tsx`：完善顶部搜索框（引擎切换 + 回车跳转）
- 全局快捷键监听（Cmd+K / Ctrl+K）

### M1.9 设置面板
- `src/app/(protected)/settings/page.tsx` + `layout.tsx`：设置面板布局（左侧 tab）
- `src/app/(protected)/settings/general/page.tsx`：基础设置
- `src/components/settings/AccountForm.tsx`：账号名 + 密码修改
- `src/components/settings/NetworkForm.tsx`：网络模式默认值
- `src/components/settings/ThemeForm.tsx`：主题切换（明亮/暗黑/跟随系统）
- `src/app/(protected)/settings/categories/page.tsx`：分类管理页
- `src/components/settings/CategoryManager.tsx`：增删改 + 拖拽排序

### M1.10 图标库
- 安装 `cheerio`
- `src/lib/favicon.ts`：favicon 抓取（cheerio 解析 HTML）
- `src/app/api/icons/favicon/route.ts`：favicon 抓取 API
- `src/app/api/icons/upload/route.ts`：图标上传 API
- `src/lib/icons.ts`：Walkxcode 图标库元数据 + 按需拉取
- `src/app/api/icons/library/route.ts`：图标库搜索 + 拉取 API
- `public/icons/` + `public/icons/manifest.json`：内置图标 + 清单
- `CardEditModal.tsx` 集成三种图标来源
- 存储目录：`data/uploads/icons/cards/` + `data/uploads/icons/library/`

### M1.11 响应式 + 主题切换
- `src/hooks/useTheme.ts`：主题切换 hook（light/dark/system）
- `src/app/providers.tsx`：ThemeProvider 集成 colorMode
- 顶部快捷明暗切换图标
- 响应式断点：
  - 桌面（≥1024px）：1440px 居中 + 右侧 widget 栏 360px
  - 平板（768-1023px）：单列 + widget 栏移到下方
  - 移动（<768px）：单列 + 顶栏紧凑 + Cmd+K 改为搜索图标按钮
- 主页 / 设置面板 / widget 栏响应式调整

### M1.12 测试 + 部署验证
- 单元测试：
  - `lib/search.ts`（拼音 + 首字母 + 子串）
  - `lib/network.ts`（内外网判断）
  - `lib/favicon.ts`（HTML 解析）
  - `lib/icons.ts`（元数据解析）
- API Route 测试：CRUD + 权限校验
- `npm run lint && npm run typecheck && npm run build` 三连通过
- `docker build` 通过
- `docker-compose up` 启动后可访问
- 数据持久化验证

## 技术决策

### Next.js 16 破坏性变更
- 写代码前查 `node_modules/next/dist/docs/` 对应章节
- 重点关注：App Router / Server Component / Middleware / Route Handler 的 API 变化
- `libsql` 和 `@prisma/client` 已在 `serverExternalPackages` 中

### Prisma 7 注意事项
- generator 用 `prisma-client`（非 `prisma-client-js`）
- 输出到 `src/generated/prisma`（git 忽略）
- 主入口 `src/generated/prisma/client.ts`
- 必须用 driver adapter（`@prisma/adapter-libsql`）
- `prisma.config.ts` 用 dotenv 读 `DATABASE_URL`
- `tsx` 不解析 tsconfig paths，seed 脚本用相对路径

### Astryx 组件优先级
- 写 UI 前必走流程：`astryx build` → `astryx template` → `astryx component`
- 全页 → AppShell；侧边栏 → SideNav
- 密集数据 → Table / List/Item 边到边
- 状态 → StatusDot / Token
- 卡片本体 → Card 组件
- Modal → Dialog
- 表单 → Form + Input + Select + Checkbox
- 拖拽手柄 → Icon + Button（@dnd-kit 监听事件）
- 进度条 → Progress（ResourceGauge）
- 完成前自检：替换所有 raw `<div>` / `style={{}}` / hardcoded 值

### Server vs Client Component 边界
- **Server Component**（默认）：数据获取、静态展示、API Route
- **Client Component**（`'use client'`）：
  - 表单交互（Modal、Input、Button onClick）
  - 拖拽（@dnd-kit 需要 DOM 事件）
  - 主题切换（localStorage + document.documentElement）
  - Cmd+K Modal（键盘事件监听）
  - Widget 栏配置浮层
- Server Component 通过 props 传数据给 Client Component

### Docker socket 访问
- 容器内通过 `/var/run/docker.sock` 访问宿主机 Docker API
- 用 `dockerode` 库封装 API 调用
- 容器状态聚合：`listContainers({ all: true })` → 按状态分组计数
- 资源水位：`getContainerStats(id)` → 聚合 CPU/内存/IO
- 不做容器启停操作（只读）

### 内外网判断策略（auto 模式）
- 客户端首次加载时，前端 fetch 一个轻量探测端点（如 `/api/network/probe`）
- 后端尝试 fetch 内网地址（如 `http://192.168.1.1`）判断可达性
- 结果缓存到 localStorage（避免每次探测）
- 用户切换网络时（如从内网切到外网）需手动刷新或重新探测
- M1 简化实现：auto 模式直接探测卡片自身的 internalUrl，失败用 externalUrl

## 风险与缓解

### 风险 1：Astryx 组件覆盖不全
- **风险**：某些场景 Astryx 没有对应组件（如复杂拖拽手柄、自定义进度条样式）
- **缓解**：先 `astryx search` 查找，找不到用 Tailwind utility + token 兜底，不手写等效组件
- **兜底**：必要时 `astryx swizzle <Name>` eject 组件源码做定制

### 风险 2：Docker socket 权限
- **风险**：容器内访问 docker.sock 可能权限不足
- **缓解**：docker-compose 已挂载 sock，运行用户需在 docker 组内
- **测试**：M1.7 先验证 `dockerode` 能否拿到容器列表

### 风险 3：NextAuth v5 + Next.js 16 兼容
- **风险**：NextAuth v5 是 beta，可能与 Next.js 16 有兼容问题
- **缓解**：M1.2 优先验证登录流程，遇到问题降级到自实现 JWT + httpOnly Cookie

### 风险 4：内外网自动判断误判
- **风险**：探测内网地址超时阈值不好定（太短误判，太长卡顿）
- **缓解**：M1 用简化策略（auto 模式探测卡片自身 internalUrl，3 秒超时），用户可手动切换内网/外网模式

### 风险 5：图标库按需拉取依赖公网
- **风险**：NAS 环境可能无法访问 GitHub raw
- **缓解**：内置 50-100 个常用图标覆盖主流场景，按需拉取失败时回退到上传或 favicon

## 验收标准

每个里程碑完成时验证：
- [ ] `npm run typecheck` 通过
- [ ] `npm run lint` 通过
- [ ] 手动测试核心功能链路
- [ ] 提交一次 git commit（按里程碑粒度）

M1 最终验收：
- [ ] spec.md 的 Success Criteria 全部勾选
- [ ] `docker build && docker-compose up` 可用
- [ ] 数据持久化验证（重启容器后数据还在）
