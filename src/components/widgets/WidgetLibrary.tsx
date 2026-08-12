'use client';

import { Dialog } from '@astryxdesign/core/Dialog';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import {
  Activity,
  CalendarClock,
  CalendarPlus,
  type LucideIcon,
  Server,
} from 'lucide-react';
import useSWR from 'swr';
import {
  DateWidgetPreview,
  type DateWidgetPreviewData,
} from '@/components/widgets/DateWidgetDisplay';
import { widgetsApi } from '@/services/widgets';
import type { WidgetKey } from '@/types';

interface WidgetLibraryProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (key: WidgetKey) => void;
}

/** widget 库元信息（图标 + 主题色 + 模拟预览内容） */
const LIBRARY_META: Record<
  WidgetKey,
  {
    icon: LucideIcon;
    /** 主题色（Tailwind 类，用于图标背景和强调） */
    accent: string;
    /** 模拟预览内容 */
    preview: DateWidgetPreviewData;
  }
> = {
  'nas-status': {
    icon: Server,
    accent: 'text-emerald-500',
    preview: {
      eyebrow: 'NAS 状态',
      title: '容器服务',
      value: '5/8',
      unit: '在线',
      meta: '运行率 63%',
      status: '正常',
      tone: 'success',
    },
  },
  'resource-gauge': {
    icon: Activity,
    accent: 'text-accent',
    preview: {
      eyebrow: '资源水位',
      title: 'CPU',
      value: '32%',
      meta: '内存 64%',
      status: '平稳',
      tone: 'accent',
    },
  },
  countdown: {
    icon: CalendarClock,
    accent: 'text-accent',
    preview: {
      eyebrow: '倒数日',
      title: '春节',
      value: '45',
      unit: '天后',
      meta: '2027年2月6日',
      status: '还有',
      tone: 'accent',
    },
  },
  countup: {
    icon: CalendarPlus,
    accent: 'text-success',
    preview: {
      eyebrow: '正数日',
      title: '结婚纪念',
      value: '365',
      unit: '天',
      meta: '开始于 2025年8月10日',
      status: '已经',
      tone: 'success',
    },
  },
};

/**
 * Widget 库弹窗（iOS 风格大卡片预览）
 *
 * 点「+ 添加 widget」弹出，每个 widget 类型显示一个大卡片：
 * - 顶部：图标 + 名称 + 描述
 * - 中部：用 widget-surface 风格模拟 widget 实际外观
 * - 底部：点击添加
 *
 * 预览区与实际 widget 视觉一致（同 squircle 圆角、阴影、accent 色）
 */
export function WidgetLibrary({
  isOpen,
  onOpenChange,
  onSelect,
}: WidgetLibraryProps) {
  const { data } = useSWR(
    isOpen ? widgetsApi.libraryKey : null,
    widgetsApi.listLibrary,
  );

  const items = data?.items ?? [];

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      width={520}
      purpose="info"
      aria-label="添加 Widget"
    >
      <div className="p-6">
        <VStack gap={4}>
          <VStack gap={1}>
            <Heading level={5}>添加 Widget</Heading>
            <Text size="sm" color="secondary">
              可重复添加同类型，每个实例独立配置
            </Text>
          </VStack>

          <div className="grid grid-cols-2 gap-4">
            {items.map((item) => {
              const meta = LIBRARY_META[item.key];
              const Icon = meta.icon;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onSelect(item.key)}
                  className="text-left group"
                >
                  <div className="rounded-2xl border border-border bg-surface overflow-hidden transition-[box-shadow,transform] duration-200 group-hover:ring-2 group-hover:ring-accent group-hover:shadow-lg group-active:scale-95">
                    {/* 顶部：图标 + 名称 + 描述 */}
                    <div className="p-4 pb-3">
                      <VStack gap={2}>
                        <span
                          className={`inline-flex size-10 items-center justify-center rounded-xl bg-muted/40 ${meta.accent}`}
                        >
                          <Icon size={20} strokeWidth={2} />
                        </span>
                        <Text size="sm" weight="semibold">
                          {item.label}
                        </Text>
                        <Text size="2xs" color="secondary">
                          {item.description}
                        </Text>
                      </VStack>
                    </div>

                    {/* 预览区：用更接近真实 widget 的手机端骨架模拟实际外观 */}
                    <div className="px-4 pb-4">
                      <div className="widget-surface date-widget-surface p-3">
                        <DateWidgetPreview preview={meta.preview} />
                      </div>
                    </div>

                    {/* 底部：添加按钮 */}
                    <div className="px-4 pb-4">
                      <div className="w-full rounded-lg bg-primary/5 py-2 text-center text-xs font-medium text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                        添加
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </VStack>
      </div>
    </Dialog>
  );
}
