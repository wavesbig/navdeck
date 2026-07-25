# NavDeck M1 任务清单

> 基于 [tasks/plan.md](./plan.md) 的可执行任务。勾选规则：完成一项勾一项，提交一次 commit。

## M1.1 数据层

- [ ] T1.1.1 更新 `prisma/schema.prisma`：User / Category / Card / WidgetConfig / DateItem / UserPreference 六个模型
- [ ] T1.1.2 运行 `npm run db:migrate:dev --name init` 生成首个迁移
- [ ] T1.1.3 更新 `scripts/seed.ts`：从 `AUTH_USERNAME` + `AUTH_PASSWORD` 初始化默认账号（bcrypt 哈希）+ 默认 widget 配置（4 个 widget 全部启用）
- [ ] T1.1.4 创建 `src/types/index.ts`：共享类型定义（NetworkMode / Theme / SearchEngine / WidgetKey 等）
- [ ] T1.1.5 运行 `npm run db:seed` 验证种子数据
- [ ] T1.1.6 `npm run typecheck` 通过

## M1.2 认证

- [ ] T1.2.1 安装 `next-auth@beta` + `bcryptjs` + `@types/bcryptjs`
- [ ] T1.2.2 创建 `src/lib/auth.ts`：NextAuth 配置（Credentials Provider + JWT + 30 天 cookie）
- [ ] T1.2.3 创建 `src/app/api/auth/[...nextauth]/route.ts`：NextAuth Route Handler
- [ ] T1.2.4 创建 `middleware.ts`：拦截未登录请求跳转 `/login`（排除 `/api/auth` + `/login` + 静态资源）
- [ ] T1.2.5 创建 `src/app/(auth)/login/page.tsx`：登录页（Astryx Form + Input + Button）
- [ ] T1.2.6 更新 `src/app/providers.tsx`：集成 SessionProvider
- [ ] T1.2.7 `npx astryx component Form` + `Input` + `Button` 查 props
- [ ] T1.2.8 手动测试：未登录访问 `/` 跳转 `/login`，登录后回跳
- [ ] T1.2.9 `npm run typecheck && npm run lint` 通过

## M1.3 主页骨架

- [ ] T1.3.1 `npx astryx build "navigation dashboard with centered search and right widget sidebar"`
- [ ] T1.3.2 `npx astryx docs layout` 查 AppShell 区域预算
- [ ] T1.3.3 创建 `src/components/layout/Header.tsx`：Logo 左 + 搜索居中 + 设置右（Astryx AppShell + Toolbar）
- [ ] T1.3.4 创建 `src/app/(protected)/layout.tsx`：受保护布局（含 Header）
- [ ] T1.3.5 创建 `src/app/(protected)/page.tsx`：主页空状态（Astryx EmptyState）
- [ ] T1.3.6 创建 `src/components/search/SearchBox.tsx`：顶部独立搜索框占位（560×48px，桌面）
- [ ] T1.3.7 桌面端 1440px 居中 + 右侧 widget 栏 360px 占位
- [ ] T1.3.8 手动测试：登录后看到空状态首页
- [ ] T1.3.9 `npm run lint` 通过

## M1.4 分类 + 卡片 CRUD

- [ ] T1.4.1 创建 `src/app/api/categories/route.ts`：GET（列表含卡片）/ POST（创建）
- [ ] T1.4.2 创建 `src/app/api/categories/[id]/route.ts`：PATCH（改名/图标/颜色）/ DELETE（categoryId 置空）
- [ ] T1.4.3 创建 `src/app/api/cards/route.ts`：GET（列表）/ POST（创建）
- [ ] T1.4.4 创建 `src/app/api/cards/[id]/route.ts`：GET / PATCH / DELETE
- [ ] T1.4.5 所有 API Route 加 session 校验
- [ ] T1.4.6 `npx astryx component Card` + `Dialog` + `Form` 查 props
- [ ] T1.4.7 创建 `src/components/cards/CardItem.tsx`：单卡片（图标 + 状态灯占位 + 标题在下方）
- [ ] T1.4.8 创建 `src/components/cards/CardGrid.tsx`：卡片网格（响应式列数）
- [ ] T1.4.9 创建 `src/components/categories/CategorySection.tsx`：分类分区（标题 + 卡片网格）
- [ ] T1.4.10 主页组装：分类分区纵向铺开 + 未分类排在最后
- [ ] T1.4.11 创建 `src/components/cards/CardEditModal.tsx`：卡片编辑 Modal（字段：name / internalUrl / externalUrl / icon / description / categoryId）
- [ ] T1.4.12 主页「新增卡片」按钮触发 Modal
- [ ] T1.4.13 卡片 hover 编辑/删除操作
- [ ] T1.4.14 手动测试：创建分类 → 创建卡片 → 看到卡片展示 → 编辑 → 删除
- [ ] T1.4.15 `npm run typecheck && npm run lint && npm run build` 三连通过

## M1.5 拖拽排序

- [x] T1.5.1 安装 `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities`
- [x] T1.5.2 创建 `src/components/dnd/SortableList.tsx`：垂直列表拖拽（分类用）
- [x] T1.5.3 创建 `src/components/dnd/SortableGrid.tsx`：网格拖拽（卡片用）
- [x] T1.5.4 卡片网格接入 SortableGrid：分类内拖拽重排 order
- [x] T1.5.5 卡片跨分类拖拽：DndContext + 多 SortableContext，更新 categoryId + order
- [x] T1.5.6 创建 `src/app/api/cards/reorder/route.ts`：批量更新 order + categoryId
- [x] T1.5.7 分类管理列表接入 SortableList（M1.9 设置面板内使用）
- [x] T1.5.8 创建 `src/app/api/categories/reorder/route.ts`：批量更新 order
- [x] T1.5.9 拖拽视觉反馈：占位符 + 拖拽中样式（Astryx token）
- [ ] T1.5.10 手动测试：卡片分类内拖拽 + 跨分类拖拽 + 拖到/拖出未分类
- [x] T1.5.11 `npm run typecheck && npm run lint` 通过

## M1.6 状态灯 + 内外网切换

- [x] T1.6.1 创建 `src/lib/network.ts`：网络模式判断（auto/internal/external）+ URL 选择逻辑
- [x] T1.6.2 创建 `src/app/api/cards/status/route.ts`：并发探测所有卡片（fetch + 3 秒超时）
- [x] T1.6.3 创建 `src/app/api/cards/[id]/status/route.ts`：单卡片探测（点击时触发）
- [x] T1.6.4 `npx astryx component StatusDot` 查 props
- [x] T1.6.5 创建 `src/components/cards/StatusDot.tsx`：三态状态灯（online/offline/unknown）
- [x] T1.6.6 `CardItem.tsx` 接入 StatusDot
- [x] T1.6.7 前端进入页面时调 `/api/cards/status`，更新状态灯
- [x] T1.6.8 点击卡片：立即跳转 + 后台 fire-and-forget 调 `/api/cards/[id]/status`
- [x] T1.6.9 创建 `src/components/layout/NetworkToggle.tsx`：三态切换器（自动/内网/外网）
- [x] T1.6.10 `Header.tsx` 接入 NetworkToggle
- [x] T1.6.11 网络模式持久化到 UserPreference 表
- [x] T1.6.12 切换网络模式后重新探测状态灯
- [ ] T1.6.13 手动测试：在线/离线/未知三态 + 内外网切换 + 点击跳转
- [x] T1.6.14 `npm run typecheck && npm run lint` 通过

## M1.7 Widget 栏

- [ ] T1.7.1 安装 `dockerode` + `@types/dockerode`
- [ ] T1.7.2 创建 `src/lib/docker.ts`：Docker 客户端单例 + 容器列表 + 聚合统计
- [ ] T1.7.3 创建 `src/app/api/widgets/docker/route.ts`：返回容器状态 + CPU/内存/磁盘IO 聚合
- [ ] T1.7.4 `npx astryx component Card` + `Progress` + `List` 查 props
- [ ] T1.7.5 创建 `src/components/widgets/WidgetBar.tsx`：widget 栏容器（桌面右侧 / 移动端下方）
- [ ] T1.7.6 创建 `src/components/widgets/NasStatus.tsx`：容器状态聚合（运行/总数 + 状态分布）
- [ ] T1.7.7 创建 `src/components/widgets/ResourceGauge.tsx`：CPU/内存/磁盘IO 进度条（Astryx Progress）
- [ ] T1.7.8 30 秒自动刷新（Docker 数据 widget，setInterval + clearInterval）
- [ ] T1.7.9 创建 `src/app/api/widgets/countdown/route.ts`：日期项 CRUD（倒数日 + 正数日）
- [ ] T1.7.10 创建 `src/components/widgets/CountdownWidget.tsx`：倒数日列表
- [ ] T1.7.11 创建 `src/components/widgets/CountupWidget.tsx`：正数日列表
- [ ] T1.7.12 widget 内部齿轮配置浮层（倒数日/正数日增删改日期项）
- [ ] T1.7.13 创建 `src/components/widgets/WidgetConfig.tsx`：widget 栏配置浮层（显示/隐藏 + 排序 + 1/2 栏切换）
- [ ] T1.7.14 widget 栏顶部图标按钮触发 WidgetConfig 浮层
- [ ] T1.7.15 widget 配置持久化到 WidgetConfig 表 + UserPreference 表（widgetLayout）
- [ ] T1.7.16 手动测试：4 个 widget 展示 + 30 秒刷新 + 配置浮层 + 日期项增删改
- [ ] T1.7.17 `npm run typecheck && npm run lint` 通过

## M1.8 搜索

- [ ] T1.8.1 安装 `pinyin-pro`
- [ ] T1.8.2 创建 `src/lib/search.ts`：搜索匹配（子串 + 拼音 + 首字母缩写）
- [ ] T1.8.3 创建 `src/app/api/search/route.ts`：服务端搜索卡片（name + url + description）
- [ ] T1.8.4 `npx astryx component Dialog` + `List` + `Input` 查 props
- [ ] T1.8.5 创建 `src/components/search/CmdKModal.tsx`：Cmd+K Modal（Dialog + 搜索框 + 结果列表）
- [ ] T1.8.6 全局快捷键监听：Cmd+K（Mac）/ Ctrl+K（Windows）唤起 Modal
- [ ] T1.8.7 实时搜索（debounce 200ms）
- [ ] T1.8.8 键盘导航：上下箭头切换选中 + 回车跳转
- [ ] T1.8.9 匹配高亮（命中字段加粗）
- [ ] T1.8.10 空状态：空输入不展示 / 无结果「未找到匹配的卡片」
- [ ] T1.8.11 跳转后 Modal 自动关闭
- [ ] T1.8.12 创建 `src/components/search/EngineSwitcher.tsx`：5 引擎切换器
- [ ] T1.8.13 完善 `src/components/search/SearchBox.tsx`：引擎切换 + 回车新标签页跳转
- [ ] T1.8.14 当前引擎持久化到 UserPreference 表
- [ ] T1.8.15 手动测试：Cmd+K 搜索 + 拼音/首字母匹配 + 引擎切换跳转
- [ ] T1.8.16 `npm run typecheck && npm run lint` 通过

## M1.9 设置面板

- [ ] T1.9.1 `npx astryx docs layout` 查设置面板布局参考
- [ ] T1.9.2 创建 `src/app/(protected)/settings/layout.tsx`：设置面板布局（左侧 tab 导航）
- [ ] T1.9.3 创建 `src/app/(protected)/settings/page.tsx`：重定向到 `/settings/general`
- [ ] T1.9.4 创建 `src/components/settings/SettingsLayout.tsx`：左侧 tab 组件
- [ ] T1.9.5 创建 `src/app/(protected)/settings/general/page.tsx`：基础设置页
- [ ] T1.9.6 创建 `src/components/settings/AccountForm.tsx`：账号名 + 密码修改表单
- [ ] T1.9.7 创建 `src/app/api/account/route.ts`：账号更新 API
- [ ] T1.9.8 创建 `src/components/settings/NetworkForm.tsx`：网络模式默认值（三档 radio）
- [ ] T1.9.9 创建 `src/components/settings/ThemeForm.tsx`：主题切换（明亮/暗黑/跟随系统）
- [ ] T1.9.10 创建 `src/app/(protected)/settings/categories/page.tsx`：分类管理页
- [ ] T1.9.11 创建 `src/components/settings/CategoryManager.tsx`：分类增删改 + 拖拽排序
- [ ] T1.9.12 分类删除时卡片 categoryId 置空（确认提示）
- [ ] T1.9.13 顶部「设置」按钮跳转 `/settings`
- [ ] T1.9.14 手动测试：改账号/密码 + 网络默认值 + 主题 + 分类管理
- [ ] T1.9.15 `npm run typecheck && npm run lint` 通过

## M1.10 图标库

- [ ] T1.10.1 安装 `cheerio` + `@types/cheerio`
- [ ] T1.10.2 创建 `src/lib/favicon.ts`：favicon 抓取（fetch HTML + cheerio 解析 link rel="icon"）
- [ ] T1.10.3 创建 `src/app/api/icons/favicon/route.ts`：favicon 抓取 API（接收 url，返回图标文件）
- [ ] T1.10.4 创建 `src/app/api/icons/upload/route.ts`：图标上传 API（multipart/form-data）
- [ ] T1.10.5 创建 `data/uploads/icons/cards/` + `data/uploads/icons/library/` 目录
- [ ] T1.10.6 准备 `public/icons/` 内置图标（50-100 个常用 NAS 服务图标）
- [ ] T1.10.7 创建 `public/icons/manifest.json`：图标清单（name + category + githubPath）
- [ ] T1.10.8 创建 `src/lib/icons.ts`：图标库元数据加载 + 按需拉取（fetch GitHub raw + 存本地）
- [ ] T1.10.9 创建 `src/app/api/icons/library/route.ts`：图标库搜索 + 拉取 API
- [ ] T1.10.10 `npx astryx component Dialog` + `Grid` + `Image` 查 props
- [ ] T1.10.11 `CardEditModal.tsx` 集成 icon 区域：
  - 填完 URL → 自动抓 favicon 预览
  - 上传按钮 → 文件选择 → 预览
  - 图标库按钮 → 浮层搜索 + 网格展示 → 点选预览
- [ ] T1.10.12 三种来源互斥（后选覆盖先选）
- [ ] T1.10.13 离线场景：按需拉取失败给提示
- [ ] T1.10.14 手动测试：favicon 抓取 + 上传 + 图标库选择
- [ ] T1.10.15 `npm run typecheck && npm run lint` 通过

## M1.11 响应式 + 主题切换

- [ ] T1.11.1 创建 `src/hooks/useTheme.ts`：主题切换 hook（light/dark/system）
- [ ] T1.11.2 更新 `src/app/providers.tsx`：ThemeProvider 集成 colorMode
- [ ] T1.11.3 主题持久化到 localStorage + UserPreference 表
- [ ] T1.11.4 顶部快捷明暗切换图标按钮（Header.tsx）
- [ ] T1.11.5 桌面端布局断点（≥1024px）：1440px 居中 + widget 栏 360px 右侧
- [ ] T1.11.6 平板断点（768-1023px）：单列 + widget 栏下方
- [ ] T1.11.7 移动端断点（<768px）：顶栏紧凑 + 搜索图标按钮触发 Cmd+K + 设置面板顶部 tab
- [ ] T1.11.8 搜索框响应式：560px 固定（桌面）→ 占满宽度（移动）
- [ ] T1.11.9 卡片网格响应式：4-5 列（桌面）→ 2-3 列（平板）→ 2 列（移动）
- [ ] T1.11.10 设置面板响应式：左侧 tab（桌面）→ 顶部 tab（移动）
- [ ] T1.11.11 手动测试：调整浏览器宽度，检查各断点布局
- [ ] T1.11.12 手动测试：主题切换 + 跟随系统
- [ ] T1.11.13 `npm run lint` 通过

## M1.12 测试 + 部署验证

- [ ] T1.12.1 单元测试 `src/lib/search.ts`：子串 + 拼音 + 首字母缩写匹配
- [ ] T1.12.2 单元测试 `src/lib/network.ts`：内外网 URL 选择逻辑
- [ ] T1.12.3 单元测试 `src/lib/favicon.ts`：HTML 解析（mock HTML 输入）
- [ ] T1.12.4 单元测试 `src/lib/icons.ts`：manifest.json 解析
- [ ] T1.12.5 API Route 测试：cards/categories CRUD + session 校验
- [ ] T1.12.6 `npm test` 通过
- [ ] T1.12.7 `npm run test:coverage` 检查覆盖率
- [ ] T1.12.8 `npm run typecheck && npm run lint && npm run build` 三连通过
- [ ] T1.12.9 更新 `Dockerfile`：加 `cheerio` + `pinyin-pro` 等新依赖的构建步骤
- [ ] T1.12.10 `docker build` 通过
- [ ] T1.12.11 `docker-compose up` 启动后访问 `http://localhost:3000`
- [ ] T1.12.12 验证登录 → 创建分类 → 创建卡片 → 状态灯 → widget 栏 → 搜索 → 设置
- [ ] T1.12.13 验证数据持久化：重启容器后数据还在
- [ ] T1.12.14 验证移动端：浏览器 DevTools 切移动视口
- [ ] T1.12.15 验证明暗主题切换

## 任务统计

- 里程碑数：12
- 任务总数：约 130 项
- 关键路径：M1.1 → M1.2 → M1.3 → M1.4（垂直切片）→ 其余并行

## 提交规范

每个里程碑完成时提交一次 commit：
```
feat(M1.x): 里程碑名称

- 具体改动 1
- 具体改动 2

Refs: docs/spec.md, tasks/plan.md
```
