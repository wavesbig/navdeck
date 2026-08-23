'use client';

import { Dialog } from '@astryxdesign/core/Dialog';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import {
  Activity,
  ArrowLeft,
  CalendarClock,
  CalendarPlus,
  type LucideIcon,
  Server,
} from 'lucide-react';
import { useState } from 'react';
import useSWR from 'swr';
import { DateItemForm } from '@/components/widgets/DateItemForm';
import type { RecurUnit } from '@/lib/datetime';
import { widgetsApi } from '@/services/widgets';
import type { WidgetKey } from '@/types';

type DateWidgetKey = 'countdown' | 'countup';

interface AddWidgetDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  /** 非日期类：选中即创建实例 */
  onAddInstance: (key: WidgetKey) => Promise<void>;
  /** 日期类：表单保存后原子创建实例 + 首个日期项 */
  onCreateDate: (
    key: DateWidgetKey,
    input: { name: string; date: string; recurUnit?: RecurUnit | null },
  ) => Promise<void>;
}

/** widget 库元信息（图标 + 图标底色） */
const LIBRARY_META: Record<
  WidgetKey,
  {
    icon: LucideIcon;
    /** 图标贴片配色（Tailwind 类：淡底色 + 图标色） */
    tile: string;
  }
> = {
  'nas-status': {
    icon: Server,
    tile: 'bg-emerald-500/10 text-emerald-500',
  },
  'resource-gauge': {
    icon: Activity,
    tile: 'bg-sky-500/10 text-sky-500',
  },
  countdown: {
    icon: CalendarClock,
    tile: 'bg-accent/10 text-accent',
  },
  countup: {
    icon: CalendarPlus,
    tile: 'bg-success/10 text-success',
  },
};

/** 行内迷你预览的 mock 数据（沿用真实 widget 的点阵字体与卡片样式） */
const PREVIEW_META: Record<
  WidgetKey,
  { kicker: string; value: string; unit: string; valueClass: string }
> = {
  'nas-status': {
    kicker: 'NAS 状态',
    value: '5/8',
    unit: '在线',
    valueClass: 'text-emerald-500',
  },
  'resource-gauge': {
    kicker: '资源水位',
    value: '32%',
    unit: 'CPU',
    valueClass: 'text-sky-500',
  },
  countdown: {
    kicker: '倒数日 · 还有',
    value: '45',
    unit: '天',
    valueClass: 'date-widget-value-accent',
  },
  countup: {
    kicker: '正数日 · 已经',
    value: '365',
    unit: '天',
    valueClass: 'date-widget-value-accent',
  },
};

/** 行尾迷你预览：真实 widget 的缩小剪影 */
function WidgetMiniPreview({ widgetKey }: { widgetKey: WidgetKey }) {
  const p = PREVIEW_META[widgetKey];
  return (
    <span className="date-widget-surface pointer-events-none flex h-16 w-28 flex-none flex-col justify-center gap-0.5 px-2.5">
      <span className="truncate text-[10px] text-secondary">{p.kicker}</span>
      <span className="flex items-baseline gap-1">
        <span className={`date-widget-value text-xl ${p.valueClass}`}>
          {p.value}
        </span>
        <span className="text-[10px] text-secondary">{p.unit}</span>
      </span>
    </span>
  );
}

/**
 * 添加 Widget 弹窗（单弹窗两步流程）
 *
 * - 第一步：行式列表选择 widget 类型；非日期类选中即创建
 * - 第二步（仅日期类）：原地切换为表单，保存后才创建实例 + 日期项，
 *   可返回重选，取消不产生空卡片
 * - 关闭时重置步骤与表单 state，下次打开从列表开始
 */
export function AddWidgetDialog({
  isOpen,
  onOpenChange,
  onAddInstance,
  onCreateDate,
}: AddWidgetDialogProps) {
  const [dateKey, setDateKey] = useState<DateWidgetKey | null>(null);

  const { data } = useSWR(
    isOpen ? widgetsApi.libraryKey : null,
    widgetsApi.listLibrary,
  );
  const items = data?.items ?? [];

  const handleOpenChange = (open: boolean) => {
    if (!open) setDateKey(null);
    onOpenChange(open);
  };

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      width={440}
      purpose={dateKey ? 'form' : 'info'}
      aria-label={dateKey ? '填写日期信息' : '添加 Widget'}
    >
      <div className="max-h-[85dvh] overflow-y-auto p-2">
        {dateKey ? (
          <CreateDateForm
            key={dateKey}
            widgetKey={dateKey}
            onBack={() => setDateKey(null)}
            onSubmit={(input) => onCreateDate(dateKey, input)}
            onDone={() => handleOpenChange(false)}
          />
        ) : (
          <VStack gap={4}>
            <VStack gap={1}>
              <Heading level={5}>添加 Widget</Heading>
              <Text size="sm" color="secondary">
                可重复添加同类型，每个实例独立配置
              </Text>
            </VStack>

            <VStack gap={2}>
              {items.map((item) => {
                const meta = LIBRARY_META[item.key];
                const Icon = meta.icon;
                const isDate =
                  item.key === 'countdown' || item.key === 'countup';
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      if (isDate) {
                        setDateKey(item.key as DateWidgetKey);
                      } else {
                        // 即点即加：无需进一步输入，直接关闭弹窗
                        void onAddInstance(item.key);
                        handleOpenChange(false);
                      }
                    }}
                    className="group flex w-full items-center gap-3 rounded-panel border border-border/60 p-3 text-left transition-colors hover:border-accent/40 hover:bg-muted/30"
                  >
                    <span
                      className={`inline-flex size-10 flex-none items-center justify-center rounded-control ${meta.tile}`}
                    >
                      <Icon size={20} strokeWidth={2} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">
                        {item.label}
                      </span>
                      <span className="line-clamp-2 block text-xs text-secondary">
                        {item.description}
                      </span>
                    </span>
                    <WidgetMiniPreview widgetKey={item.key} />
                  </button>
                );
              })}
            </VStack>
          </VStack>
        )}
      </div>
    </Dialog>
  );
}

function CreateDateForm({
  widgetKey,
  onBack,
  onSubmit,
  onDone,
}: {
  widgetKey: DateWidgetKey;
  onBack: () => void;
  onSubmit: (input: {
    name: string;
    date: string;
    recurUnit?: RecurUnit | null;
  }) => Promise<void>;
  onDone: () => void;
}) {
  const isCountdown = widgetKey === 'countdown';

  return (
    <VStack gap={3}>
      <HStack gap={2} className="items-center">
        <IconButton
          label="返回选择类型"
          tooltip="返回"
          icon={<ArrowLeft size={16} />}
          variant="ghost"
          size="sm"
          onClick={onBack}
        />
        <VStack gap={0.5}>
          <Heading level={5}>
            {isCountdown ? '添加倒数日' : '添加正数日'}
          </Heading>
          <Text size="2xs" color="secondary">
            保存后卡片才会出现在 widget 栏。
          </Text>
        </VStack>
      </HStack>

      <DateItemForm
        widgetKey={widgetKey}
        namePlaceholder={isCountdown ? '如：发工资' : '如：在一起'}
        dateLabel="日期"
        requiredHint="请填写名称和日期"
        submitLabel="添加"
        onSubmit={onSubmit}
        onSuccess={onDone}
        onCancel={onDone}
      />
    </VStack>
  );
}
