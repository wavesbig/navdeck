# NavDeck 设计系统 v2.1

> 逐值对齐实际代码的设计系统文档。事实来源：`node_modules/@astryxdesign/theme-neutral/dist/theme.css`、`src/app/globals.css`（全量 1100+ 行）、`docs/design-conventions.md`、`src/lib/design-tokens.ts`、组件源码与 localhost:3000 实机截图。
> 常量唯一来源：CSS 侧 `src/app/globals.css`，TS 侧 `src/lib/design-tokens.ts`。交互演示版：[docs/design-system-demo.html](./design-system-demo.html)（亮暗切换 / 浮层 / Toast / 点阵数字实况演示）。

## 01 概览与修订记录

六原则：token 单一来源 · 双主题对等 · 毛玻璃浮层同族 · 圆角三层语义 · 行优先数据 · 单一强调。

- v1→v2：accent 修正为中性黑白；新增品牌点阵字体与 widget-surface 三层阴影；圆角 control 修正为实际渲染 10px；新增 z-index 语义与工程规约。
- v2→v2.1（全量复审补齐）：新增动效系统章节；补齐第三字体 NType82Headline 与 brand-title 四档；记录并收敛**双红体系**（`--color-brand-red` / `--color-brand-pixel`）；补齐 date-widget 材质系统、数据 widget 刻度、首页时钟 ink 系统、拖拽视觉、滚动条规范。

## 02 色彩（实测值）

### 基础表面 / 文字

| token | 亮色 | 暗色 | 用途 |
|---|---|---|---|
| `--color-background-body` | `#f1f1f1` | `#1b1b1b` | 页面底色 |
| `--color-background-surface` | `#ffffff` | `#262626` | 浮层 / 卡片表面 |
| `--color-background-card` | `#ffffff` | `#1b1b1b` | 卡片 |
| `--color-background-popover` | `#ffffff` | `#1b1b1b` | 弹层 |
| `--color-text-primary` | `#000000` | `#ffffff` | 主文字 |
| `--color-text-secondary` | `#474747` | `#9e9e9e` | 次要文字（对比度 ≥4.5:1 校准） |
| `--color-text-disabled` | `#919191` | `#525252` | 禁用文字 |
| `--color-border` | `#00000014` | `#ffffff1A` | hairline 边框 |
| `--color-border-emphasized` | `#d4d4d4` | `#525252` | 强调边框 |

### accent 是中性黑白（不是彩色）

`--color-accent: light-dark(#1b1b1b, #f1f1f1)`。primary 按钮 = 亮色黑底白字 / 暗色白底黑字，hover 沿亮度轴偏移、不改文字色。`--color-accent-muted: light-dark(#f1f1f1, #262626)`。

### 双红体系（品牌签名，语义不同、禁止混用）

| 红 | token / 现状 | 语义 | 用途 |
|---|---|---|---|
| **数据红** | `--color-brand-red: #d71921`（已收敛，globals.css） | 数据强调 | 日期 widget 大数字、进度轨 |
| **像素红** | `--color-brand-pixel: #e5484d`（已收敛，globals.css；BrandMark SVG 引用同 token） | 像素签名 | Logo / 品牌标题中单个终点像素（参考 KWGT） |

> 两红已全部 token 化（2026-09-28）。视觉相近但语义不同，不得互相替代。

### 状态色

| token | 亮色 | 暗色 |
|---|---|---|
| `--color-error` | `#76000c` | `#ffc4be` |
| `--color-success` | `#00490b` | `#a4d6a3` |
| `--color-warning` | `#4b3900` | `#f8d36a` |

各配 `-muted` 变体（如 `--color-error-muted: light-dark(#ffc4be, #ff98903D)`）。

### 陷阱与禁令

- **`--color-danger` 不存在**：`text-danger` / `bg-danger` / `var(--color-danger)` 是静默 no-op。危险语义唯一来源 `--color-error`。
- **禁止用 warning 充当高亮**：warning 保留给真实警示语义。

### 高亮

`--color-highlight` = `color-mix(in srgb, var(--color-accent) 22%, transparent)`，用于搜索命中等中性强调。

## 03 品牌字体（点阵签名）

### 字体清单（三件套，全部自托管 `/fonts/date-widgets/`）

| 字体 | 文件 | 角色 |
|---|---|---|
| `KWGTDot47` | `ndot-47.ttf` | 点阵主力：时钟、品牌标题、数据大数字 |
| `NType82Regular` | `NType82-Regular.otf` | 点阵辅助行 / meta / 图例 |
| `NType82Headline` | `NType82-Headline.otf` | 点阵数字回退（时钟、NAS/资源大数值的第二优先级） |

正文与标题用 Astryx 默认栈：`Figtree, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`；代码用 `ui-monospace` 栈。点阵数字统一 `font-feature-settings: "tnum" 1` + `text-rendering: geometricPrecision`。

### 品牌标题四档（`.brand-title`，KWGTDot47 点阵语言）

| 档位 | 字号 | 场景 |
|---|---|---|
| `sm`（0.85em） | 随父级 | 小尺寸品牌标 |
| 默认 | 1.25rem / letter-spacing 0.03em | 通用 |
| `floating` | 1.625rem | 左上角悬浮 Logo |
| `lg` | 2.25rem / letter-spacing 0.04em | 首屏大标 |

点阵可读性下限：分区块标题用 `.widget-bar-title`（0.75rem，KWGTDot47 优先），NAS/图例类 kicker 用 `.widget-kicker`（0.68rem）——低于此尺寸不再使用点阵。

## 04 排版

- 字阶：`--font-size` 4xs(7px) → 5xl(42px)，base 14px（0.875rem）。
- 信息类文本**禁止 `size="2xs"`**（8px 不可读，90% 字号偏好下 7.2px）：表单提示、空态 hint、保存消息、弹窗描述一律 `sm`(12px)。`2xs` 仅限 widget 内部紧凑数据（NAS/qB/资源/日期 widget 的图例与状态标签，Nothing 风格刻度）。
- 弹窗标题统一刻度：`1rem / 600 / 行高 1.5rem`（globals.css 已覆盖 DialogHeader 与 AlertDialog 默认；弹窗体内自定义标题用 `<Text as="h2">`）。
- eyebrow 小标签：`.text-eyebrow`（11px / 500 / letter-spacing 0.14em / 大写）用于非点阵区的 section 标签；与 `.widget-bar-title`（点阵版）语义同源。
- 组件文本优先 Astryx `<Text>` / `Heading`；裸 Tailwind 文本类仅限表格、网格单元格等渲染热点。

## 05 间距

- 组件布局间距一律用 Astryx 数值 token（`gap={n}` / `padding*={n}`）。
- 裸 Tailwind 间距类（`gap-2` / `p-3`）仅限图标与文字之间的微调（≤2 步），不做区块级布局。

## 06 圆角（实测修正）

| token / utility | 实际值 | 场景 |
|---|---|---|
| `--radius-inner` | 6px | 内嵌小元素（如素材文件名徽章） |
| `rounded-control`（= `--radius-element`） | **10px** | 按钮 / 输入框 / 小容器 |
| `rounded-panel`（= `--radius-container`） | 12px | 面板 / 列表容器 / 设置卡片 |
| `rounded-widget`（1.125rem） | 18px | widget / 服务卡片 / 图标 / 全屏提示层 |
| `--radius-page` | 28px | 页面级 |
| `--radius-full` | 9999px | 胶囊 |

> 注意：`docs/design-conventions.md` 旧表写 rounded-control 8px 是注释遗留误差，实际渲染 10px（`--radius-element: 0.625rem`）。

- 禁止 `rounded-lg` / `rounded-2xl` / `rounded-[Npx]`。
- 已批准例外：`BrandMark` logo 块四档 px 制圆角（`[6px/9px/11px/18px]`，随 20/32/40/80px 固定盒子等比）与 `BrandForm` 预览块 `rounded-[18px]`；素材页 14px 勾选框 `rounded-sm`。

## 07 阴影与层级

### 浮层族（统一配方）

tooltip / toast / banner / 悬浮工具栏 / 全屏提示层统一 `shadow-float`（= Astryx `--shadow-med`），底为 `color-mix(in srgb, var(--color-background-surface) 85%, transparent)` + `backdrop-blur-md` + hairline 边框。**禁止反色方案**。

chrome 类胶囊变体（FloatingToolbar）：`bg-surface/80 backdrop-blur-md border border-border shadow-float rounded-full`。

### widget-surface 三层阴影（仅 widget 卡片，配 elevation="none"）

```css
/* rest */
--shadow-widget-rest: 0 8px 24px rgba(15,23,42,.07), 0 2px 6px rgba(15,23,42,.04),
  inset 0 1px 0 rgba(255,255,255,.82);
/* hover */
--shadow-widget-hover: 0 12px 30px rgba(15,23,42,.09), 0 3px 8px rgba(15,23,42,.04),
  inset 0 1px 0 rgba(255,255,255,.88);
/* dark 变体 */
html[data-theme="dark"] .widget-surface {
  --shadow-widget-rest:  0 8px 24px rgba(0,0,0,.32), 0 2px 6px rgba(0,0,0,.24), inset 0 1px 0 rgba(255,255,255,.04);
  --shadow-widget-hover: 0 12px 30px rgba(0,0,0,.4),  0 3px 8px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.06);
}
```

结构：外层大阴影造氛围 + 近距小阴影撑立体感 + inset 顶部白边模拟玻璃边缘高光。hover 物理统一 1px 上浮（`hover:-translate-y-px`）、按下归位；选中态 `ring-2 ring-accent`；日期卡只保留背景/边框材质差异，不自带阴影。

### 拖拽视觉（RGL）

- **placeholder**（落点提示）：`rgba(148,163,184,.08)` 底 + 2px 虚线边 `rgba(148,163,184,.45)`（dark .06/.35）+ `rounded-widget`，120ms 过渡，柔和中性色不抢焦点。
- **拖拽中**（`.react-draggable-dragging`，z=100）：阴影增强造浮起感——亮 `0 16px 32px rgba(15,23,42,.14), 0 4px 10px rgba(15,23,42,.06)` / dark `rgba(0,0,0,.4)/.24`；`cursor: grabbing`；内部子元素阴影清零防叠加。
- **过渡**：width/height 220ms ease-out；transform 220ms `cubic-bezier(0.22,0.61,0.36,1)`（仅 `.cssTransforms` 启用，防首帧飞入闪烁）。
- **`.widget-drag-handle`**：编辑态手柄用 clip-path 保留右上角 2.2rem 切换按钮可点击区。

### 其他交互态阴影

卡片 hover `shadow-md`、kbd 徽章 `shadow-sm`、Logo 文字 `drop-shadow-sm`（Tailwind 标准档，不属于浮层族）。

## 08 动效系统

### easing token

```css
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1); /* 带过冲，比 ease-out 更有"活物感" */
```

### 卡片错峰入场（`card-fly-in` + `.stagger-cards`）

- 每张卡从下方 16px + `scale(0.96)` 淡入归位；`400ms var(--ease-spring) both`。
- 父容器加 `.stagger-cards`，每张卡内联 `animation-delay: idx * 40ms`（上限 20 档，见 CardGrid）。
- **会话内仅首访播放**：`layout.tsx` entrance-gate 脚本在二次访问时给 `<html>` 标 `data-entered="1"`，命中 `animation: none` 跳过。

### 编辑横幅滑入（`edit-banner-in`）

`translateY(100%)→0` + 淡入，`0.25s ease-out`。

### 空态漂浮（`empty-float`）

空分类示意块中的中间方块 `3s ease-in-out infinite` 上下浮动，其余方块静态偏移。

### 减动效降级（prefers-reduced-motion）

- `card-fly-in`：关闭位移/缩放，降为 200ms 纯淡入。
- `edit-banner-enter`：直接 `animation: none`。
- 新增动画必须自带 reduced-motion 降级。

## 09 z-index 语义层级

| utility | 值 | 场景 |
|---|---|---|
| `z-raised` | 10 | 卡片内覆盖：状态灯、角标、widget 拖拽手柄层 |
| `z-selected` | 20 | 批量选择勾选框（压过 raised） |
| `z-chrome` | 50 | 视口级悬浮 chrome：Logo、工具栏、横幅、全屏提示层 |

例外：背景层 `-z-10`；RGL 拖拽中 widget `z-index: 100`；RGL placeholder `z-index: 2`（网格内部）。

- 新增浮层从上表选层级，禁止裸 `z-<number>`。
- Astryx Dialog 是**原生 `<dialog>`**：modal 时处于浏览器 top layer，z-index 天然失效；仅 `purpose='required'` 时有 `role="alertdialog"`。globals.css 已用 `dialog` / `[role="alertdialog"]` 选择器兜底非 top-layer 场景，业务代码不要手写弹层 z-index。
- 首页时钟 halo 用 `z-index: -1`（元素内 isolation 隔离）。

## 10 图标（ICON_SIZE 档位）

| 档位 | 值 | 场景 |
|---|---|---|
| `xs` | 12 | 卡片角标、行内小图标 |
| `sm` | 14 | 菜单项 / 列表行操作按钮 |
| `md` | 16 | 工具栏按钮、banner |
| `lg` | 18 | 区块级入口按钮 |

同一语义全站同一档位；从 `src/lib/design-tokens.ts` 取值。自托管站点图标容器 38px、卡片文字标签 80px 宽两行截断。图标体系：Lucide + `public/icons/` 自托管清单；`IconImage` 提供尺寸驱动的图片/字母回退。

## 11 核心组件

### 11.1 Widget / 导航卡片（BookmarkCard · WidgetCard）

- 结构：`rounded-widget` + `widget-surface`（三层阴影配方，见 07）。
- 交互：hover 1px 上浮 + shadow 切换；选中 `ring-2 ring-accent`；批量选择勾选框 `z-selected`、选中态 `border-accent bg-accent text-on-accent`。
- 键盘焦点：`group-focus-visible:ring-2 ring-accent`；自写按钮统一 `focus-ring`。
- lucky 失效卡片 `opacity-60` + warning 角标。

### 11.2 分类容器（Category）

分类头（SectionHeader）：图标（38px 容器）+ 标题；用户自定义色仅用于 CategoryBadge 动态背景（用户数据驱动的合法动态样式）。密集数据用行（Table/List），Card 只用于独立 widget。

### 11.3 数据 Widget（日期 / NAS / qBittorrent / 资源）

**date-widget 材质系统**（Nothing Date Time 式纯色底板，独立于 widget-surface）：

- 局部 token 族（亮色默认 / dark 变体）：`--date-widget-bg(#ffffff/#1b1b1d)`、`--date-widget-fg(#1b1b1d/#ffffff)`、`--date-widget-muted`、`--date-widget-border`、`--date-widget-rail`。
- 底板：`linear-gradient(180deg, rgba(255,255,255,.98), rgba(245,245,246,.96))` + `::before` 顶部 radial 白色材质高光；dark 变体整套换算。
- **tone 双通道**：每个数据项同时着色「数值 + 进度轨」——accent（`--color-brand-red`）/ warning（`--color-warning`）/ muted（fg 82% 混合），rail 为对应 75% / muted 18% 透明度。语义色 + 形状双编码。
- 布局三型：hero（大数字 + 参考信息）、compact（横排紧凑）、row（列表行）。圆角统一 `--radius-widget`。
- **自适应字号**：`src/lib/date-widget-metrics.ts` 按点阵字宽估算（CJK 1 全宽 / 数字字母 0.6）自动降档字号，数值永不换行（兜底 ellipsis）。
- 空态：虚线圈图标 + 标题/提示，可点击时 hover 高亮引导。
- `.widget-drag-handle`：编辑态 clip-path 手柄（见 07）。

**NAS / qB / 资源 widget（Nothing / KWGT 点阵风格）**：

- 刻度类：`.widget-kicker`(0.68rem) / `.nas-widget-legend`(0.68rem) / `.nas-widget-foot`(0.68rem) / `.nas-widget-containers`(0.62rem)——全部 `2xs` 允许档。
- 大数值：`.nas-widget-value` / `.resource-widget-value`（KWGTDot47 → NType82Headline 回退，tnum，1.9/2.6rem 内联档）；单位 `.resource-widget-unit`(0.85rem)。
- 状态点动态色：running 用 `var(--color-success)` 实心（NasStatus）。

### 11.4 浮层族（Tooltip / Toast / 提示条 / 悬浮工具栏）

- 统一配方：85% surface + blur 12px + hairline 边框 + `shadow-float`，亮暗自动适配，禁止反色。
- Toast error：左侧 3px `--color-error` 强调条，不回反色底。
- EditModeBanner：`rounded-widget bg-surface/85 text-primary border border-border shadow-float backdrop-blur-md` + `edit-banner-enter` 入场。
- 全家福清单：FloatingToolbar（胶囊 80%）、EditModeBanner、BatchDeleteBar、DefaultPasswordBanner（warning 边框变体）、UpdateNotification、全屏拖放提示（HomeContent）、Astryx Tooltip / Toast（globals.css 全局覆盖）。

### 11.5 表单控件（Button / Input / Dialog）

- primary 按钮：黑底白字（亮）/ 白底黑字（暗），hover 沿亮度轴偏移。
- 输入框四态：default / focus / error / disabled；error 用 `border-error` + `text-error` + `role="alert"`。
- 弹窗宽度档：`DIALOG_WIDTH` 320(sm 日期配置) / 440(md 标准表单) / 560(lg 卡片编辑、Cmd+K、关于)。历史值已吸附（420→md、520→lg）。一律从 `@/lib/design-tokens` 引用，禁止字面量。

### 11.6 状态标识（StatusDot 实际三态）

| 状态 | 样式 |
|---|---|
| online / running | 实心 `--color-success` |
| offline / stopped | 透明底 + 2px `--color-error` 描边 |
| 其余 | 实心 `--color-text-secondary` |

外圈统一 `ring-2 ring-surface`。语义色 + 文字双编码，不单靠颜色。

### 11.7 搜索（全局拼音搜索 + Cmd+K）

- 命中片段用 `bg-highlight`（accent 22% 半透明，随主题）。支持拼音全拼与首字母匹配（`wb` → 微博）。
- 搜索框是首页视觉锚点：胶囊形粗边框（亮色白底 / 暗色深底），`Ctrl K` 徽标；placeholder 空间不足时省略号截断（`.search-input::placeholder`）。
- Cmd+K 弹窗为 lg(560) 档。

### 11.8 滚动条（`.hover-scrollbar`）

默认隐藏，容器 hover/focus 才显示（webkit 自绘：8px 圆角 thumb）。用于 widget 内容区，避免永久滚动条打断视觉节奏。

## 12 工程规约

1. **危险色唯一**：只用 `--color-error`；`--color-danger` 是静默 no-op。
2. **2xs 禁令**：信息类文本禁用（见 04）。
3. **图标档位**：12/14/16/18（见 10）。
4. **弹窗宽度档**：320/440/560，引用 `DIALOG_WIDTH`（见 11.5）。
5. **间距 token 化**：布局用 Astryx 数值 token（见 05）。
6. **键盘焦点**：自写可聚焦元素统一 `focus-ring`（accent outline 2px + offset 2px）。
7. **StyleX 桥接**：Astryx 运行时 StyleX 样式**未分层**，压过 `@layer utilities` 里的 Tailwind 工具类。与 StyleX 冲突的覆盖只能用内联 style 或更高特异性选择器。承重内联清单（不得改为 className，会静默失效）：
   - `app/page.tsx` AppShell 根元素透明背景（壁纸透出的关键）
   - FloatingToolbar 用户菜单项 `paddingInline: 12`
   - 弹窗标题内联字号（或依赖 globals.css 的 dialog h2 规则）
   - CategoryBadge 用户色动态 `backgroundColor`
   - 数据 widget 大数字内联 fontSize（1.5/1.9/2.6rem 刻度，随 widget 尺寸档切换）
8. **主题覆盖禁令**：不 override `:root` 的 `--color-*`（Astryx 主题色）；品牌自有 token（`--color-brand-red`、`--home-clock-ink` 系、`--date-widget-*` 系）除外。
9. **时钟颜色机制**：首页时钟 ink 用 `light-dark()` 跟随 color-scheme，**不用 `html[data-theme]`**——Astryx Theme 在 mode='system' 时会移除 data-theme，keyed 在 data-theme 上会错误落回亮色（globals.css 有完整注释）。
10. **Astryx 组件优先**：`<div>` 裸布局禁止；组件 props 优先，其次 Tailwind token 工具类，无裸 hex/px（品牌资产与数据驱动样式除外）。

## 13 首页布局与层次（实机观察）

自上而下：品牌 Logo（左上，`.brand-title-floating` 点阵字）→ 安全提示 banner（毛玻璃胶囊，`z-chrome`）→ 点阵时钟 + 问候语 → 搜索框（视觉锚点，`Ctrl K`）→ WIDGETS 区（4 列 widget 卡网格）→ 分类区（38px 圆角图标 + 80px 文字标签）。

**首页时钟 ink 系统**（安静可读，不抢壁纸）：

- ink 双值：亮 `#41272d`（紫檀深棕红，与暖壁纸同族）/ 暗 `#f4e7e7`（暖珍珠白，避免纯白刺眼）——`light-dark()` 驱动。
- meta 只降透明度不改色相；可读性靠两层柔光：无边界椭圆 halo（body 底色 82%/42% 混合 + blur 0.75rem）+ 文字近/远双层 text-shadow。
- 时钟字号 3.75rem（移动端 2.875rem），KWGTDot47 → NType82Headline 回退。

右上角悬浮工具栏（`z-chrome` 圆角胶囊）承载视图切换、编辑模式、批量操作、用户菜单；进入编辑模式时唤起 EditModeBanner + 卡片拖拽（RGL 拖拽中 z=100）。

## 14 可访问性基线

- 对比度：`text-secondary` 按 ≥4.5:1 校准；hover 态不降对比。
- 键盘：所有交互元素可聚焦，`focus-ring` 统一焦点环；Tooltip 支持键盘焦点触发。
- 状态编码：颜色 + 文字/形状双编码（StatusDot 三态 + 文案、date-widget tone 值/轨双通道）。
- 动效：`prefers-reduced-motion` 全覆盖——入场动画降纯淡入、横幅动画关闭（见 08）。
- 品牌红与像素红仅作强调，不承载唯一语义。
