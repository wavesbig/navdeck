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
      {list.map((release, index) => {
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
                <Text size="2xs" color="secondary" className="ml-auto">
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
    </VStack>
  );
}
