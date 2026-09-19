# NavDeck 设计约定

> 由 UI 审计整改建立（2026-09-19，Phase 1 / Design Tokens）。
> 常量与 utility 的唯一来源：`src/app/globals.css`（CSS 侧）与 `src/lib/design-tokens.ts`（TS 侧）。

## 危险色（error 唯一）

- 危险语义唯一来源是 Astryx 的 `--color-error`（utility：`text-error` / `bg-error` / `border-error`）。
- **禁止使用 `text-danger` / `bg-danger` / `var(--color-danger)`**：Astryx 主题未定义 `--color-danger`，这些类是静默 no-op（历史遗留已全部清除）。
- 错误提示优先用 Astryx `Text` + `className="text-error"` + `role="alert"`。

## 圆角

| utility | 值 | 场景 |
|---------|-----|------|
| `rounded-control` | 8px | 按钮 / 输入框 / 小容器 |
| `rounded-panel` | 12px | 面板 / 列表容器 / 设置卡片 |
| `rounded-widget` | 1.125rem (18px) | widget / 服务卡片 / 图标 / 全屏提示层 |

- 一律使用上述 token，禁止 `rounded-lg` / `rounded-2xl` / `rounded-[Npx]`。
- **已批准例外**：
  - `BrandMark` / `BrandForm` 的 logo 预览块保留 `rounded-[18px]`（px 制）：这些盒子尺寸固定（不随字号缩放），改用 rem 制会让圆角与盒子比例失衡。
  - 素材页 14px 勾选框的 `rounded-sm`（2px）：无对应 token，改大半径会让小勾选框近乎变圆。
- widget 生态（内容容器 / RGL placeholder / 拖拽中）已统一 `--radius-widget`（rem 制，随根字号等比缩放）。

## 阴影

- 浮层族（tooltip / toast / banner / 悬浮工具栏 / 全屏提示层）统一 `shadow-float`（= Astryx `--shadow-med`）。
- widget 家族阴影 token：`--shadow-widget-rest` / `--shadow-widget-hover`（定义于 `.widget-surface`，含 dark 变体）。所有 widget（含日期卡特型板）共用同一阴影与 hover 物理（上浮 1px、按下归位）；日期卡只保留背景/边框材质差异，不再自带阴影。
- 交互态阴影（卡片 hover `shadow-md`、kbd 徽章 `shadow-sm`、Logo 文字 `drop-shadow-sm`）保留 Tailwind 标准档，不属于浮层族。
- 卡片 hover 上浮与 widget 对齐为 1px（`hover:-translate-y-px`）。像素 accent 的"卡片尺度回声"经评估后刻意不做——给每张卡加装饰点会踩本审计自己标红的"无意义装饰"反模式；状态点语义色已是卡片区的品牌回声。
- widget 三层阴影配方收敛在 `.widget-surface`（CSS），widget 卡片一律 `elevation="none"` + 该类。

## z-index 层级

| utility | 值 | 场景 |
|---------|-----|------|
| `z-raised` | 10 | 卡片内覆盖：状态灯、角标、widget 拖拽手柄层 |
| `z-selected` | 20 | 批量选择勾选框（需压过 `z-raised` 角标） |
| `z-chrome` | 50 | 视口级悬浮 chrome：Logo、工具栏、横幅、全屏提示层 |

- **已批准例外**：背景层 `-z-10`（fixed 背景垫底）；RGL 拖拽中 widget `z-index: 100`（拖拽预览浮于一切内容之上）。
- 新增浮层时从上表选择层级，禁止再引入裸 `z-<number>`。
- Astryx Dialog 渲染为**原生 `<dialog>` 元素**（modal 时处于浏览器 top layer，z-index 天然失效；仅 `purpose='required'` 时显式带 `role="alertdialog"`，其余为隐式 dialog 语义、无 role 属性）。globals.css 用 `dialog` / `[role="alertdialog"]` 选择器兜底非 top-layer 场景，业务代码不要手动改弹层 z-index。

## 键盘焦点

- Astryx `IconButton` / `Button` 自带焦点样式；自写 `<button>` 或可聚焦元素统一追加 `focus-ring` utility（accent outline + 2px offset）。
- `focus-ring` 定义在 globals.css，与 `z-*` utilities 同源维护。

## 文本排版

- 弹窗标题统一刻度：`dialog[aria-modal='true'] h2` / `[role="alertdialog"] h2` 一律 1rem/600/行高 1.5rem（globals.css 覆盖 Astryx DialogHeader 与 AlertDialog 的偏大默认值）。弹窗体内自定义标题直接用 `<Text as="h2">`（如 AddWidgetDialog），由本规则统一排版，不再写内联样式。
- 组件内文本优先用 Astryx `<Text>`（携带语义输出）；裸 Tailwind 文本类（`text-sm` / `text-2xs` / `text-fg-secondary`）仅限表格、网格单元格等渲染热点，并逐步收敛。
- 同语义同规格：标题用 Heading 组件、正文/辅助文本用 Text 的 size/color，不再新增裸类。
- **禁止在信息类文本上使用 `size="2xs"`**（换算后仅 8px，字号偏好 90% 时 7.2px 不可读）：表单提示、空态 hint、保存消息、弹窗描述一律用 `sm` 档（12px）。`2xs` 仅限 widget 内部紧凑数据（NAS/qB/资源/日期 widget 的图例与状态标签，Nothing 风格刻度的一部分）。

## 图标尺寸

| 档位 | 值 | 场景 |
|------|-----|------|
| `ICON_SIZE.xs` | 12 | 卡片角标、行内小图标 |
| `ICON_SIZE.sm` | 14 | 菜单项 / 列表行操作按钮 |
| `ICON_SIZE.md` | 16 | 工具栏按钮、banner |
| `ICON_SIZE.lg` | 18 | 区块级入口按钮 |

- 同一语义（如"删除"）全站同一档位；新代码从 `src/lib/design-tokens.ts` 取值。

## 弹窗宽度

| 档位 | 值 | 场景 |
|------|-----|------|
| `DIALOG_WIDTH.sm` | 320 | 紧凑配置（日期 widget 设置） |
| `DIALOG_WIDTH.md` | 440 | 标准表单（分类 / 引擎 / widget 添加 / 确认弹窗） |
| `DIALOG_WIDTH.lg` | 560 | 宽表单与面板（卡片编辑、Cmd+K、关于） |

- 历史值已吸附：420→md（+20px）、520→lg（+40px）。

## 间距

- 组件布局间距一律用 Astryx 数值 token（`gap={n}` / `padding*={n}`）。
- 裸 Tailwind 间距类（`gap-2` / `p-3` 等）仅限图标与文字之间的微调（≤2 步），不做区块级布局。

## 高亮色

- 搜索命中等中性强调用 `bg-highlight`（`--color-highlight` = accent 22% 半透明，随主题）。
- **禁止用 warning 充当高亮**——warning 保留给真实的警示语义。

## 主题预览瓦片

- `ThemeForm` 的亮暗预览使用裸 Tailwind 中性色（`bg-neutral-*`）：预览需要脱离当前主题固定表达亮/暗，属**已批准例外**，代码内已有注释说明。
