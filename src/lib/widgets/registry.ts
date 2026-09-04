/**
 * Widget 注册表（唯一事实来源）
 *
 * 加新 widget 只需两步：
 * 1. 在 WIDGET_REGISTRY 加一条元数据（key 自动并入 WidgetKey 联合类型）
 * 2. 新建组件并在 src/components/widgets/registry.tsx 注册 render
 *
 * 以下均由此派生，不再各处手写：
 * - WidgetKey / DateItemWidgetKey 类型（src/types 重导出）
 * - validation.ts 的 widgetKey 校验 enum 与日期类判定
 * - /api/widgets/library 的 widget 库元信息
 */
export interface WidgetRegistryEntry {
  label: string;
  description: string;
  /** 该 widget 是否持有日期项（countdown / countup 类） */
  hasDateItems?: true;
}

export const WIDGET_REGISTRY = {
  'nas-status': {
    label: 'NAS 状态',
    description: 'Docker 容器运行状态总览',
  },
  'resource-gauge': {
    label: '资源水位',
    description: 'CPU / 内存 / 磁盘 IO 实时水位',
  },
  countdown: {
    label: '倒数日',
    description: '距离未来的重要日子还有多少天',
    hasDateItems: true,
  },
  countup: {
    label: '正数日',
    description: '过去的重要日子已经过去多少天',
    hasDateItems: true,
  },
} satisfies Record<string, WidgetRegistryEntry>;

export type WidgetKey = keyof typeof WIDGET_REGISTRY;

/** 全部 widget key（元组形式，供 z.enum 直接使用） */
export const WIDGET_KEYS = Object.keys(WIDGET_REGISTRY) as [
  WidgetKey,
  ...WidgetKey[],
];

/** 拥有日期项能力的 widget key（类型级从 hasDateItems 过滤） */
export type DateItemWidgetKey = {
  [K in WidgetKey]: (typeof WIDGET_REGISTRY)[K] extends { hasDateItems: true }
    ? K
    : never;
}[WidgetKey];

/** 日期项能力 widget key 列表（运行时判定用） */
export const DATE_ITEM_WIDGET_KEYS = (
  Object.keys(WIDGET_REGISTRY) as WidgetKey[]
).filter((k) => 'hasDateItems' in WIDGET_REGISTRY[k]) as DateItemWidgetKey[];
