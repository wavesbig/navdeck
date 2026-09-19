# NavDeck UI Audit Roadmap

> 生成于 2026-09-19。合并自三次审计：功能完整性审计、repository-level interface review、产品视觉审查。
> 本文件是审计产出，未修改任何产品代码。所有路径为仓库相对路径。

## 优先级定义

- **P0**：影响正常使用（含移动端可能不可用，需 360px 视口实测确认的项已标注）
- **P1**：明显影响体验，或"一处修改、多页受益"的一致性债
- **P2**：视觉与细节优化

## 整改实测更新（2026-09-19，整改阶段 1-5 完成）

- **N1 证伪**：360px 视口实测工具栏宽 340px、无溢出、图标无压扁（P0 降级为观察项；320px 以下极端设备仍会溢出，暂不处理）。
- **N2 证伪**：360px 下 6 段移动导航完整可读、无截断，无需重构。
- **R1 合规**：Astryx 对话框宽度在 360px 下自动钳制到约 314px，无溢出。
- **R2 已修复**、**V1/V2 已修复**、**I4 已修复**、**T8 已修复**、**2xs 可读性已修复**（信息类文本 39 处 2xs 升 sm 档，widget 内部紧凑数据保留）。
- **V4 改判**：AppShell 透明背景、用户菜单 `paddingInline: 12`、弹窗标题内联字号、CategoryBadge 动态色均为**承重的 StyleX 桥接**（运行时未分层 StyleX 优先级高于 utilities 层，转 className 会静默失效），保留并记入约定文档。
- **I3 限制**：react-grid-layout 不支持键盘拖拽，widget 键盘排序为已知限制；主页卡片与设置列表已支持。
- **Astryx Dialog 澄清**：渲染为原生 `<dialog>`（modal 时处于 top layer），z-index 类规则对其无效；相关选择器已修正为 `dialog` / `[role="alertdialog"]`。

## 系统性问题总览（一处修改，多页受益）

以下问题散落在多个页面/组件，修复收益最高，建议优先于单点问题处理。

| ID | 问题 | 影响面 | Priority | Fix Layer |
|----|------|--------|----------|-----------|
| T1 | 危险色 token 双轨（danger / error） | 主页 + 全部设置表单 + widget | P1 | Design Token |
| T2 | radius token 被字面量绕过 | 主页 + 素材页 + widget 网格 | P2 | Design Token |
| T3 | 三套阴影系统并存 | 主页 + widget + 设置 + 浮层族 | P2 | Design Token |
| T4 | z-index 无层级语义 + DOM 硬改 | widget 栏 + 全部弹层 | P1 | Design Token |
| T7 | 间距习语混用（Astryx gap vs 裸 Tailwind gap-） | 全部设置页 + widget | P2 | Design Token |
| B1 | EngineIcon 组件重复定义两份 | 主页搜索 + 搜索设置 | P1 | Base Component |
| B2 | 空态实现五套 | 主页 + widget + 素材 + 分类 + 壁纸 | P1 | Base Component |
| B3 | 列表行 + DnD 脚手架重复两份 | 分类管理 + 搜索引擎管理 | P1 | Base Component |
| B4 | 裸按钮缺失 focus-visible / active | 主页 + 设置 + 弹窗 | P1 | Base Component |
| I2 | UI 状态走 window 事件总线，含裸字符串监听 | 主页 + widget + 工具栏 | P1 | Interaction |
| I3 | 拖拽排序无键盘替代 | 主页卡片 + widget + 设置列表 | P1 | Interaction |
| L1 | 文档大纲缺 h1 且标题跳级 | 主页 + 设置 + 弹窗 | P1 | Layout |
| W3 | widget 弹层 z-index 用 DOM 遍历硬改 | widget 栏全部弹出层 | P1 | Base Component |

---

## 1. Design Tokens

### T1 危险色 token 双轨

- **Problem**: `--color-danger` 系（`text-danger`/`bg-danger`，16 处）与 `--color-error` 系（`bg-error`、toast 边框，3 处）并存，语义相同、来源不同。
- **Evidence**: 表单错误统一用 `text-danger`（CardEditModal / CategoryManager / SearchEngineManager / LoginForm）；`StatusDot.tsx` 注释明确写 "token 是 error 不是 danger" 并用 `bg-error`；`globals.css` toast 边框用 `--color-error`；`ResourceGauge.tsx` 的 `variantColor()` 用 `--color-danger`。
- **Root Cause**: Astryx 主题同时暴露 error/danger 两个别名，项目未约定单一来源。
- **Impact**: 暗色模式下两 token 若色值不严格一致，同一页面出现两种"红色"；后续主题定制需改两处。
- **Priority**: P1
- **Fix Layer**: Design Token

### T2 radius token 被字面量绕过

- **Problem**: `@theme` 已定义 `--radius-control/panel/widget`（globals.css），但多处直接写死。
- **Evidence**: `HomeContent.tsx:344` 拖入链接提示层 `rounded-2xl`（16px，widget 半径是 18px）；`AssetsContent.tsx:459` 素材 EmptyState `rounded-lg`、`:263/:367` `rounded-sm`；`WidgetGrid.tsx` 内容容器 `rounded-[18px]` 字面量；globals.css 中 RGL placeholder 与 dragging `border-radius: 18px`。
- **Root Cause**: token 定义晚于部分组件，改造成分批进行但未收口。
- **Impact**: 圆角调整时出现 2px 级别的漏网差异，视觉上恰好可见。
- **Priority**: P2
- **Fix Layer**: Design Token

### T3 三套阴影系统并存

- **Problem**: Astryx `elevation=` prop（widget 全系 11 处）、裸 Tailwind `shadow-sm/md/lg`（10 处）、自定义 CSS box-shadow 字面量（widget-surface / date-widget-surface / RGL dragging）并存。
- **Evidence**: `SearchBox.tsx:78`（shadow-md+lg）、`EditModeBanner.tsx:51`、`BatchDeleteBar.tsx:46`、`FloatingToolbar.tsx:348`、`CardItem.tsx:149`、`HomeContent.tsx:344`、`SettingsSection.tsx:31`（elevation="low"）；globals.css `.widget-surface` 三层阴影。
- **Root Cause**: 浮层族（tooltip/banner/toolbar/批量条）声称"同族毛玻璃"，但阴影值各自手写，未沉淀为 token。
- **Impact**: 主题切换或壁纸加深时浮层阴影不联动；同族浮层存在细微深度差。
- **Priority**: P2
- **Fix Layer**: Design Token

### T4 z-index 无层级语义

- **Problem**: z-10/z-20/z-50 散落各处，无 token 层级；WidgetBar 甚至用 DOM 遍历硬改弹层 z-index（详见 W3）。
- **Evidence**: `CardItem.tsx:154/166/174`（z-20/z-10）、`FloatingLogo.tsx:35` / `FloatingToolbar.tsx:348` / `EditModeBanner.tsx:44` / `BatchDeleteBar.tsx:39` / `HomeContent.tsx:341` 全部 z-50。
- **Root Cause**: 没有 popover / sticky / modal 层级约定。
- **Impact**: 每新增一个浮层都可能压住或被压；WidgetBar 的 hack 就是该债的利息。
- **Priority**: P1
- **Fix Layer**: Design Token（z-scale token），配套 W3 收敛。

### T5 弹窗宽度无 scale

- **Problem**: Dialog 宽度手写五档：320 / 420 / 440 / 520 / 560。
- **Evidence**: `DateWidgetShell.tsx`（320）、`CategoryEditModal` 与 AlertDialog 默认（420）、`AddWidgetDialog.tsx:175` / `QbittorrentReconfigureDialog.tsx:67` / EngineEditModal（440）、`CardEditModal.tsx`（520）、`CmdKModal.tsx` / `AboutDialog.tsx:31`（560）。
- **Root Cause**: 按每个弹窗内容随手定宽，无 width token（sm/md/lg）。
- **Impact**: 同类表单弹窗宽度不一；小视口下需逐一验证（见 R1）。
- **Priority**: P2
- **Fix Layer**: Design Token

### T6 图标尺寸无 scale

- **Problem**: lucide 图标 12/14/16/18/20 五档混用，无约定；同为"删除"语义出现 12 与 14 两种。
- **Evidence**: CardItem 右键菜单 `Trash2 size={14}`；`AssetsContent.tsx` AssetCard/AssetRow `Trash2 size={12}`；FloatingToolbar 统一 16；WidgetBar 添加按钮 18；EngineSwitcher logo 20。
- **Root Cause**: 未定义 icon-size scale（如 sm=12 / md=14 / lg=16）及"什么场景用哪档"的约定。
- **Impact**: 密集菜单区图标重量不齐，视觉噪声。
- **Priority**: P2
- **Fix Layer**: Design Token

### T7 间距习语混用

- **Problem**: Astryx 数值 gap（`gap={5}`）与裸 Tailwind gap（`gap-2`/`gap-3`/`gap-4`/`gap-0.5`）在同一批文件混用。
- **Evidence**: `ThemeForm.tsx:126`（gap-2）与同页其他布局的 Astryx gap prop；`CategoryManager.tsx:288`、`SearchEngineManager.tsx:289`（gap-3）。
- **Root Cause**: Astryx 组件与 Tailwind 工具类边界未约定（组件布局用前者、微调例外需白名单）。
- **Impact**: 间距体系无法整体调档；review 时无法判断哪些是例外。
- **Priority**: P2
- **Fix Layer**: Design Token（先立约定，再渐进收敛）

### T8 高亮色语义错用

- **Problem**: Cmd+K 搜索命中高亮用 `bg-warning/30`，警告色被用作中性高亮。
- **Evidence**: `CmdKModal.tsx` renderItem 中 `<mark className="bg-warning/30">`。
- **Root Cause**: 缺少 highlight 语义 token，临时取了 warning。
- **Impact**: 未来引入真正的 warning 场景时语义污染；暗色下 30% warning 底对文字对比度未经验证。
- **Priority**: P2
- **Fix Layer**: Design Token

## 2. Base Components

### B1 EngineIcon 重复定义

- **Problem**: 完全相同的 `EngineIcon` 组件定义两份；引擎 logo 直接 `<Image>` 裸渲染，绕过卡片图标的统一入口 `IconImage`。
- **Evidence**: `EngineSwitcher.tsx:74` 与 `SearchEngineManager.tsx:337`（逻辑相同：有 logo 用 Image，无则 Globe 兜底）。
- **Root Cause**: 设置页复用主页组件时选择了复制而非抽包。
- **Impact**: logo 兜底逻辑或尺寸策略变更时漏改一处；与 IconImage 的错误兜底行为可能不一致。
- **Priority**: P1
- **Fix Layer**: Base Component（抽到 `src/components/icons/`）

### B2 空态五套实现

- **Problem**: 同一"空态"语义有五种实现，视觉同族但代码各异。
- **Evidence**: Astryx `EmptyState`（`HomeContent.tsx:265`）；素材页自建同名 `EmptyState`（`AssetsContent.tsx:447`）；`DateWidgetEmptyState`（`DateWidgetDisplay.tsx:444`）；`.widget-bar-empty` CSS 类（globals.css）；分类管理虚线 div（`CategoryManager.tsx:203`）。壁纸管理另有虚线 div（WallpaperManager）。
- **Root Cause**: 空态未沉淀为带 variant 的单一组件。
- **Impact**: 新页面空态随意发挥；图标/间距/交互（可点击上传）各自为政。
- **Priority**: P1
- **Fix Layer**: Base Component

### B3 列表行 + DnD 脚手架重复

- **Problem**: 分类管理与搜索引擎管理的行组件结构 95% 相同（拖拽手柄、徽章/图标、名称、编辑/删除），手柄样式字符串逐字相同；DnD 配置（PointerSensor distance:5、closestCenter、arrayMove + 失败回滚）完全重复。
- **Evidence**: `CategoryManager.tsx:296` 与 `SearchEngineManager.tsx:297`（手柄样式一致）；两文件各自定义 sensors/handleDragEnd。
- **Root Cause**: 设置页两个"可排序列表"未抽象。
- **Impact**: 拖拽行为修复（如加 KeyboardSensor，见 I3）需要改两处；第三个列表出现时会复制第三份。
- **Priority**: P1
- **Fix Layer**: Base Component

### B4 裸按钮缺失 focus-visible / active

- **Problem**: hover 覆盖 14 个文件，`focus-visible` 仅 7 个文件；自写按钮普遍缺少键盘焦点样式，全站 active 按压态几乎只在 date-widget CSS 中存在。
- **Evidence**: `SearchBox.tsx:113` 清除按钮仅有 `hover:text-primary`；`CategoryManager.tsx:296` / `SearchEngineManager.tsx:297` 拖拽手柄无 focus-visible；WallpaperManager 壁纸清除按钮仅有 hover；CardItem 有 hover 上浮无 active 反馈。
- **Root Cause**: Astryx IconButton/Button 自带焦点样式，绕过组件的裸 `<button>`/`<a>` 没有等价保障。
- **Impact**: 键盘用户在搜索框、设置列表、壁纸管理中焦点不可见；点击反馈弱。
- **Priority**: P1
- **Fix Layer**: Base Component（提供统一 FocusRingButton 或强制 focus-visible 工具类；active 态按 Astryx 现有规格补齐）

### B5 单选语义错标为 toggle

- **Problem**: 单选场景用 `role="button"` + `aria-pressed`（toggle 语义），应为 radio / `aria-checked`。
- **Evidence**: `WallpaperManager.tsx` WallpaperThumb；`AssetsContent.tsx` AssetRow。
- **Root Cause**: 自绘可选中瓦片未区分单选/多选语义；与素材页网格的 `SelectableCard`（语义正确）形成两套实现。
- **Impact**: 读屏用户把单选听成开关；行为与素材页不一致。
- **Priority**: P2
- **Fix Layer**: Base Component（统一 SelectableTile）

### B6 Lucky 失效角标不可达

- **Problem**: 失效标记仅靠 `title` 悬停提示，不可聚焦，键盘与读屏均无法获取原因。
- **Evidence**: `CardItem.tsx:174-177`，`<span title="Lucky 规则已失效">` 包裹 Link2Off 图标。
- **Root Cause**: 复用 title 习惯，未走 Tooltip 组件（Astryx Tooltip 已有键盘可达实现）。
- **Impact**: 失效卡片"为什么半透明"对部分用户是谜。
- **Priority**: P2
- **Fix Layer**: Base Component

### B7 分区标题组件缺失

- **Problem**: 首页分区标题两套语言：widget 区用点阵 eyebrow（"WIDGETS"），卡片分类用 Heading level 4 粗体。
- **Evidence**: globals.css `.widget-bar-title`；`CategorySection.tsx:100`。
- **Root Cause**: 无 SectionHeader 组件；两处分头实现。
- **Impact**: 同级信息视觉重量不同；从设计角度，分类区缺品牌低语（详见 W2）。
- **Priority**: P1
- **Fix Layer**: Base Component（SectionHeader 统一 eyebrow + 标题两段式；方向是分类区获得 eyebrow，而非删掉点阵）

### B8 文本习语混用

- **Problem**: Astryx `<Text>` 与裸 Tailwind 文本类（`text-sm`/`text-2xs`/`text-fg-secondary`）混用，素材页最重。
- **Evidence**: `AssetsContent.tsx:108` 附近列表头、`:263/:367` 行内元素；其余设置页基本走 Text 组件。
- **Root Cause**: 素材页网格/表格性能与灵活性考虑引入裸类，未回填约定。
- **Impact**: 字号/颜色调整需两套改法；读屏语义（Text 组件的语义输出）在素材页缺失。
- **Priority**: P2
- **Fix Layer**: Base Component（约定 + 渐进替换）

## 3. Layout

### L1 文档大纲缺 h1 且标题跳级

- **Problem**: 主页没有任何 h1（BrandTitle 渲染 `<span>`）；分区直接 Heading level 4；设置区块从 h5 开始；弹窗全部 h5。
- **Evidence**: `BrandTitle.tsx:42`（`<span>`）；`CategorySection.tsx:100`（level 4）；`SettingsSection.tsx:35`（level 5）；`AddWidgetDialog.tsx:197/281/344`、`DateItemConfigPanel.tsx:171`（level 5）；唯一 h1 在 `LoginForm.tsx:79`。
- **Root Cause**: 视觉字号直接映射 Heading level（h5 恰好等于想要的字号），未按文档大纲分配。
- **Impact**: 读屏用户按标题导航时大纲断裂；可及性与语义双输。
- **Priority**: P1
- **Fix Layer**: Layout（主页 h1 = 品牌名或 sr-only；视觉字号与语义级别分离）

### L2 首屏弹入（CLS）

- **Problem**: widget 网格挂载前不渲染（`layoutMode` 等测宽）、壁纸 hydration 后才渲染，首屏内容有一次弹入。
- **Evidence**: `WidgetGrid.tsx`（mounted && layoutMode 条件渲染）；`BackgroundLayer.tsx`（useMounted 后才渲染壁纸）。
- **Root Cause**: 防布局抖动的刻意取舍（代码注释已说明），但未提供骨架占位。
- **Impact**: 每次进入主页视觉跳动一次；慢网络下更明显。
- **Priority**: P2
- **Fix Layer**: Layout（widget 栏/壁纸区加固定高度骨架位）

### L3 设置区块描述截断

- **Problem**: SettingsSection 标题旁内联描述 `truncate`，窗口略窄时静默截断。
- **Evidence**: `SettingsSection.tsx` 头部 HStack 内 `<Text className="truncate">`。
- **Root Cause**: 强行单行头部布局。
- **Impact**: 描述信息丢失且无提示。
- **Priority**: P2
- **Fix Layer**: Layout（描述换行或移入内容区首行）

## 4. Navigation

### N1 主页工具栏移动端溢出

- **Problem**: FloatingToolbar 移动端需要容纳 9 个 IconButton（网络/主题｜CmdK/Widget/简洁｜编辑/批量｜用户），无收纳策略，仅缩小内边距。
- **Evidence**: `FloatingToolbar.tsx` 三个 cluster + 用户菜单；响应式处理只有 `top-6 right-4 md:right-6` 与 `px-1.5 py-1 sm:px-2 md:px-3`。
- **Root Cause**: 桌面分区逻辑直接搬到移动端。
- **Impact**: 360px 视口大概率溢出或换行（需实测确认）。
- **Priority**: P0（待 360px 实测）
- **Fix Layer**: Navigation（移动端折叠为 3 个高频按钮 + "更多"菜单；或窄视口隐藏次要项）

### N2 设置页移动端导航拥挤

- **Problem**: 6 项 SegmentedControl `layout="fill"` 一行铺满小屏。
- **Evidence**: `SettingsSideNav.tsx` SettingsMobileNavPicker。
- **Root Cause**: 桌面侧栏的移动替代品直接用了等分分段控件。
- **Impact**: 360px 下六项文字挤压，触控目标偏小。
- **Priority**: P1
- **Fix Layer**: Navigation（小屏改下拉或两行分组）

## 5. Dashboard / Widget

### W1 双材质 widget 表面

- **Problem**: `.widget-surface`（NAS/qB/资源：半透明 surface + 三层阴影 + inset 高光，hover 仅加深阴影）与 `.date-widget-surface`（日期卡：不透明白渐变板 + radial 高光 + hover 上浮）同网格共存，材质与 hover 物理分裂。
- **Evidence**: globals.css 两个 surface 类定义及其 hover 规则。
- **Root Cause**: 日期卡按 Nothing Date Time 参考实现（特型可以理解），但未与通用 surface 共享阴影/物理配方。
- **Impact**: 同一行两种"重力"；主题调整时两处维护。
- **Priority**: P1
- **Fix Layer**: Dashboard/Widget（保留日期卡特型外观，统一阴影与 hover 物理为共享 token）

### W2 卡片区品牌断层

- **Problem**: 产品签名（点阵数字、DotMeter、像素 accent）全部集中在时钟与 widget；用户停留最久的卡片图标网格是标准 Astryx Card + hover 上浮，与同类导航站无法区分。
- **Evidence**: `CardItem.tsx` 视觉仅 `radius-widget` + hover shadow；globals.css 点阵类只服务 widget/clock/brand。
- **Root Cause**: 品牌语言随功能模块生长，未回灌最高频区域。
- **Impact**: 产品辨识度依赖用户是否启用 widget；空 widget 用户看到的是"普通 dashboard"。
- **Priority**: P2
- **Fix Layer**: Dashboard/Widget（卡片 hover 物理与 widget 对齐、状态点/像素 accent 在卡片尺度回声；不重设计网格）

### W3 widget 弹层 z-index DOM hack

- **Problem**: WidgetBar 打开弹出层时 querySelectorAll 遍历 DOM 强设 `style.zIndex`，波及期间所有 `role=dialog` / context menu。
- **Evidence**: `WidgetBar.tsx` useEffect 中 `document.querySelectorAll('[role=dialog], .astryx-context-menu')` 循环设 z-index=50。
- **Root Cause**: Astryx 浮层 wrapper 默认 z-index 与页面层级冲突，未在 token 层解决（关联 T4）。
- **Impact**: 编辑态/素材库打开期间的任意弹窗都被改写样式；升级 Astryx 可能静默失效。
- **Priority**: P1
- **Fix Layer**: Base Component（z-scale token 落地后删除 hack）

## 6. Interaction

### I1 搜索框承诺与行为不符

- **Problem**: placeholder 写"搜索卡片，或输入关键词跳转搜索引擎…"，但回车只会打开 Web 搜索；卡片搜索仅存在于 Cmd+K，入口无语义提示。
- **Evidence**: `SearchBox.tsx` placeholder 与 `handleSubmit`（仅 `window.open` 引擎模板）；卡片搜索在 `CmdKModal.tsx`。
- **Root Cause**: 两代搜索功能（引擎跳转、Cmd+K 卡片搜索）叠加后未统一入口语义。
- **Impact**: 用户输入卡片名回车得到 Google 结果，核心路径混淆；卡片搜索被发现率低。
- **Priority**: P0
- **Fix Layer**: Interaction（回车优先匹配卡片命中则打开卡片，否则跳引擎；或改文案 + 提供卡片搜索模式）

### I2 全局事件总线 + 裸字符串监听

- **Problem**: edit-mode / batch-mode / simple-mode / network-mode / widget-config 五套 UI 状态走 window CustomEvent 广播；同一事件两种写法——组件用 `EDIT_MODE_CHANGE_EVENT` 常量，WidgetBar 用裸字符串。
- **Evidence**: `WidgetBar.tsx:78` `addEventListener('edit-mode-change', ...)` vs `HomeContent.tsx:119` 用常量；`edit-mode-event.ts` 常量值恰为 `'edit-mode-change'` 才未出错。
- **Root Cause**: 无状态管理库时的快速通路，未沉淀为单一事件模块。
- **Impact**: 常量值改动即静默断裂；事件顺序/重复监听不可测。
- **Priority**: P1
- **Fix Layer**: Interaction（收敛为类型安全的事件模块或轻量 store；全部消费点走常量）

### I3 拖拽排序无键盘替代

- **Problem**: 全部 DnD（主页卡片、widget RGL、设置页列表）仅有 PointerSensor，无 KeyboardSensor，键盘用户无法排序。
- **Evidence**: `HomeContent` 的 sensors（useCardReorder）、`CategoryManager.tsx` / `SearchEngineManager.tsx`（`useSensor(PointerSensor)`）。
- **Root Cause**: 只实现了指针交互。
- **Impact**: 可及性硬伤；与 B3 合并修复可一次覆盖三处。
- **Priority**: P1
- **Fix Layer**: Interaction

### I4 入场动画每次重载重播

- **Problem**: launcher-fly-in（600ms 弹簧）+ 卡片错峰入场每次整页重载都播放。
- **Evidence**: globals.css `launcher-fly-in` / `stagger-cards`（reduced-motion 已处理，但普通用户每次都重播）。
- **Root Cause**: 未做"会话内仅首次"标记。
- **Impact**: 高频打开的导航站第三次起变成动效过路费。
- **Priority**: P2
- **Fix Layer**: Interaction（sessionStorage 首次标记，后续直出）

## 7. Responsive

### R1 弹窗宽度小视口验证

- **Problem**: 宽 520/560 的弹窗（CardEditModal、CmdKModal、AboutDialog）在 360px 视口的实际表现未验证。Astryx Dialog 存在 `STANDARD_DIALOG_MAX_WIDTH` 钳制（已在 node_modules 确认），但自定义 width 路径需实测。
- **Evidence**: 各 Dialog width prop（见 T5）；`CardPreviewDialog` 已自行钳制 `innerWidth - 48`（正确示范）。
- **Root Cause**: 依赖 Astryx 内部钳制，未建立实测清单。
- **Impact**: 潜在横向溢出；若 Astryx 行为变化则回归。
- **Priority**: P2
- **Fix Layer**: Responsive（360px 视口实测清单；必要时统一钳制进 T5 的 width token）

### R2 背景层 bg-fixed 冗余 + iOS 风险

- **Problem**: BackgroundLayer 容器本身 `position: fixed; inset: 0`，其上再加 `bg-fixed`（background-attachment: fixed）既冗余又是 iOS Safari 已知坏味道。
- **Evidence**: `BackgroundLayer.tsx` className `fixed inset-0 -z-10 ... bg-fixed`。
- **Root Cause**: 复制模板写法。
- **Impact**: iOS 上可能触发渲染异常；语义冗余。
- **Priority**: P2
- **Fix Layer**: Responsive（移除 bg-fixed 即可，视觉无变化）

## 8. Accessibility

### A1 状态指示单通道

- **Problem**: StatusDot 在线/离线仅颜色二值（绿/红）；AT 有 aria-label 但键盘用户 hover 不到（span 不可聚焦）。
- **Evidence**: `StatusDot.tsx`（role="img" + title + aria-label，颜色区分）。
- **Root Cause**: 视觉符号未带形状差异。
- **Impact**: 色弱用户无法区分在线/离线。
- **Priority**: P2
- **Fix Layer**: Accessibility（离线态加形状/图标差异，或状态点可聚焦显示 Tooltip）

### A2 搜索框自动聚焦

- **Problem**: 页面加载即 focus 搜索框，对屏幕阅读器和移动端不友好。
- **Evidence**: `SearchBox.tsx` useEffect `inputRef.current?.focus()`。
- **Root Cause**: 桌面效率优化直接全局生效。
- **Impact**: 读屏用户落地即被拖进输入框；打断浏览语境。
- **Priority**: P2
- **Fix Layer**: Accessibility（限制为非触屏时执行，`/` 快捷键已够用）

### A3 键盘 DnD 缺失

- 见 I3（主修在 Interaction，A11y 验收在本层回归）。

### A4 标题大纲断裂

- 见 L1（主修在 Layout，A11y 验收在本层回归）。

## 9. Visual Polish

### V1 搜索框 border-2 破坏 hairline 体系

- **Problem**: 搜索框 `border-2` 是全站唯一 2px 边框，与 1px hairline 体系冲突，且与焦点态 ring-2 视觉重量相同。
- **Evidence**: `SearchBox.tsx:78`。
- **Root Cause**: 单组件调优时加重了边框。
- **Impact**: 门面组件脱离体系精度；焦点态强度无法表达。
- **Priority**: P2
- **Fix Layer**: Visual Polish（降回 1px，焦点强度交给 ring）

### V2 手搓小控件痕迹（✕ 字形 + ⌘K 平台提示）

- **Problem**: 清除按钮用文本"✕"而非 lucide X；kbd 硬编码"⌘ K"不区分 Windows/Linux 的 Ctrl。
- **Evidence**: `SearchBox.tsx:104-107`（kbd）、`:113`（✕）。
- **Root Cause**: 门面组件里的快捷小件未走组件/图标体系。
- **Impact**: AI 生成痕迹感最重的一处；平台提示错误。
- **Priority**: P2
- **Fix Layer**: Visual Polish

### V3 壁纸遮罩不可调

- **Problem**: 50% 平铺黑/白 overlay 固定，亮/暗壁纸适配粗放。
- **Evidence**: `BackgroundLayer.tsx` overlay 线性渐变写死 0.5。
- **Root Cause**: 可读性地板策略（合理的基线选择），但无用户调节。
- **Impact**: 极亮/极暗壁纸上要么文字吃力要么壁纸失真。
- **Priority**: P2
- **Fix Layer**: Visual Polish（按主题调校 scrim，或外观设置增加强度滑杆；不强求）

### V4 内联样式覆盖 token

- **Problem**: 组件级 inline style 绕过样式体系。
- **Evidence**: FloatingToolbar 用户菜单 `style={{ paddingInline: 12 }}`；`app/page.tsx` AppShell `style={{ backgroundColor: 'transparent' }}`；CategoryBadge 动态色 style。
- **Root Cause**: 对 Astryx 默认值的临时覆盖未沉淀为工具类/变体。
- **Impact**: 主题调整时内联值不可达。
- **Priority**: P2
- **Fix Layer**: Visual Polish

### V5 主题预览瓦片裸中性色

- **Problem**: ThemeModeTile 预览用 `bg-neutral-800/700/600/100/300/400` 裸 Tailwind 中性色。
- **Evidence**: `ThemeForm.tsx` MiniWindowScheme。
- **Root Cause**: 预览需要脱离当前主题固定表达亮/暗（代码注释已说明，属合理例外）。
- **Impact**: 无实际影响；仅需在 token 约定文档中标注为例外。
- **Priority**: P2
- **Fix Layer**: Visual Polish（标注例外即可，不必强改）

---

## 建议执行顺序

### Wave 1 — P0（先验证再修）

1. N1：360px 视口实测工具栏，确认后做移动端收纳
2. I1：搜索框回车优先匹配卡片 + 平台正确的 kbd 提示（顺带 V2）

### Wave 2 — P1 系统性（一处修改多页受益）

3. T4 + W3：z-scale token 落地，删除 WidgetBar DOM hack
4. B1 / B2 / B3：收编 EngineIcon、EmptyState、Row+DnD 脚手架
5. I2：事件总线收敛为单一模块（全部走常量）
6. B4：FocusRingButton 统一裸按钮焦点/按压态
7. I3：借助 B3 收编后的 DnD 脚手架加 KeyboardSensor
8. T1：danger/error 二选一，全量替换
9. L1：主页 h1 + heading level 重排
10. N2：设置页移动端导航改造
11. B7 + W1：SectionHeader 统一分区标题；widget 阴影/物理共享 token

### Wave 3 — P2 清扫（随日常迭代顺手做）

12. T2 / T3 / T5 / T6 / T7 / T8：radius、shadow、dialog width、icon size、spacing 约定、highlight token
13. B5 / B6 / B8 / A1 / A2：瓦片语义、Tooltip 化、文本习语、状态形状、自动聚焦
14. V1 / V3 / V4 / R1 / R2 / I4 / L2 / L3：门面 hairline、遮罩精调、内联样式、响应式实测清单、入场动画会话门控、骨架位、描述换行

## 明确不做的事（防止过度设计）

- 不重设计卡片网格（80px 图标瓦片是品类惯例，只需品牌低语）
- 不删除 50% 壁纸遮罩策略（改为精调，而非推翻）
- 不给设置页加品牌表演（Linear/Vercel 风格是刻意的、正确的）
- 不为了"高级感"引入新的动效或玻璃拟态层级
- 点阵视觉语言（KWGTDot47 / DotMeter / 像素 accent）是产品资产，一切改动以强化而非稀释它为准

## 审计中确认的正面项（不需要动）

- 主题 FOUC 处理 + `light-dark()` 时钟方案（useTheme / ThemeScript）
- widget 行高随根字号缩放（150% 字号偏好适配）
- `prefers-reduced-motion` 全覆盖
- 可撤销删除 + 二次确认（useUndoableDelete + AlertDialog）
- 嵌入预检 blocked 兜底（CardPreviewDialog）
- Astryx Dialog ESC 由共享层栈接管，不会与编辑模式 ESC 冲突（已在 node_modules 验证）
- hover-revealed 操作模式（分类新建按钮、素材删除按钮）含 focus-within / pointer-coarse / focus-visible 三重兜底
