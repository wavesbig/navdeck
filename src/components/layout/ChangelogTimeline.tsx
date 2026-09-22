'use client';

import { HStack } from '@astryxdesign/core/HStack';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import {
  ArrowUpCircle,
  Bug,
  ChevronDown,
  CircleDot,
  Sparkles,
} from 'lucide-react';
import { useState } from 'react';
import type { ChangelogRelease } from '@/lib/changelog';
import changelog from '@/lib/changelog.generated.json';

/** 分类 → 语义图标（主流 changelog 惯例：✨ 新增 / 🐛 修复 / ⬆️ 变更） */
const CATEGORY_ICONS: Record<string, { Icon: typeof Bug; className: string }> =
  {
    新增: { Icon: Sparkles, className: 'text-accent' },
    修复: { Icon: Bug, className: 'text-warning' },
    变更: { Icon: ArrowUpCircle, className: 'text-secondary' },
  };

/** 默认渲染的版本数量，更早的版本收进「查看更早版本」 */
const INITIAL_VISIBLE_COUNT = 8;

function CategoryIcon({ name }: { name: string }) {
  const meta = CATEGORY_ICONS[name] ?? {
    Icon: CircleDot,
    className: 'text-secondary',
  };
  return <meta.Icon size={14} className={`flex-none ${meta.className}`} />;
}

interface ChangelogEntryRowProps {
  categoryName: string;
  text: string;
}

/** 单条更新：分类图标 + 文字 */
export function ChangelogEntryRow({
  categoryName,
  text,
}: ChangelogEntryRowProps) {
  return (
    <HStack gap={2} align="start">
      <span className="mt-1.5 flex-none">
        <CategoryIcon name={categoryName} />
      </span>
      <Text size="sm" color="secondary" className="min-w-0">
        {text}
      </Text>
    </HStack>
  );
}

interface ChangelogCategoryBlockProps {
  categoryName: string;
  items: string[];
}

/**
 * 分组日志块：分类图标 + 分类名做小标题，条目缩进对齐
 *
 * 供紧凑浮层（右下角更新提醒）复用，与条目行保持同一图标与字号体系。
 */
export function ChangelogCategoryBlock({
  categoryName,
  items,
}: ChangelogCategoryBlockProps) {
  if (items.length === 0) return null;
  return (
    <VStack gap={1}>
      <HStack gap={2} align="center">
        <CategoryIcon name={categoryName} />
        <Text size="xsm" weight="semibold" color="secondary">
          {categoryName}
        </Text>
      </HStack>
      <VStack gap={1} className="pl-6">
        {items.map((text) => (
          <Text
            key={text}
            size="sm"
            color="secondary"
            className="min-w-0"
            textWrap="pretty"
          >
            {text}
          </Text>
        ))}
      </VStack>
    </VStack>
  );
}

interface ChangelogTimelineProps {
  /** 覆盖展示的版本列表（缺省为全部版本） */
  releases?: ChangelogRelease[];
  /** 默认展开的版本号（缺省为第一个版本，即最新） */
  defaultExpandedVersion?: string;
}

/**
 * 更新日志手风琴（自定义实现，无动画即时展开收起）
 *
 * 最新版本默认展开，历史版本折叠成单行。
 * 数据来自 CHANGELOG.md 构建期解析结果。
 */
export function ChangelogTimeline({
  releases,
  defaultExpandedVersion,
}: ChangelogTimelineProps = {}) {
  const list = releases ?? changelog.releases;
  // 版本越积越多，默认只渲染最近若干个，避免弹窗被历史版本撑长
  const [showAll, setShowAll] = useState(false);
  const visibleList = showAll ? list : list.slice(0, INITIAL_VISIBLE_COUNT);
  const hiddenCount = list.length - visibleList.length;
  const [expanded, setExpanded] = useState<Set<string>>(
    () =>
      new Set(
        defaultExpandedVersion
          ? [defaultExpandedVersion]
          : list.length > 0
            ? [list[0].version]
            : [],
      ),
  );

  const toggle = (version: string) => {
    setExpanded((previous) => {
      const next = new Set(previous);
      if (next.has(version)) {
        next.delete(version);
      } else {
        next.add(version);
      }
      return next;
    });
  };

  return (
    <VStack gap={1}>
      {visibleList.map((release, index) => {
        const isLatest = index === 0;
        const isOpen = expanded.has(release.version);
        const rowId = `changelog-${release.version}`;
        const entries: ChangelogEntryRowProps[] = release.categories.flatMap(
          (category) =>
            category.items.map((text) => ({
              categoryName: category.name,
              text,
            })),
        );

        return (
          <VStack
            key={release.version}
            gap={1}
            className="border-b border-border/60 pb-2 last:border-b-0 last:pb-0"
          >
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={rowId}
              onClick={() => toggle(release.version)}
              className="flex w-full items-center gap-2 rounded-control px-2 py-2 text-left hover:bg-overlay-hover"
            >
              <ChevronDown
                size={14}
                className={`flex-none text-secondary transition-transform ${isOpen ? '' : '-rotate-90'}`}
              />
              <Text size="sm" weight="semibold" className="text-primary">
                {release.version}
              </Text>
              {isLatest && (
                <span className="rounded-full bg-neutral px-2 py-0.5 text-xs font-medium text-accent">
                  最新
                </span>
              )}
              {release.date && (
                <Text size="sm" color="secondary" className="ml-auto">
                  {release.date}
                </Text>
              )}
            </button>
            {isOpen && (
              <VStack id={rowId} gap={2} className="px-4 pb-2">
                {entries.map((entry) => (
                  <ChangelogEntryRow key={entry.text} {...entry} />
                ))}
              </VStack>
            )}
          </VStack>
        );
      })}
      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="rounded-control px-2 py-2 text-center hover:bg-overlay-hover"
        >
          <Text size="sm" color="secondary">
            查看更早版本（{hiddenCount}）
          </Text>
        </button>
      )}
    </VStack>
  );
}
