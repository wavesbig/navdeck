'use client';

import { HStack } from '@astryxdesign/core/HStack';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { Bug, CircleDot, Minus, Plus, RefreshCw, Sparkles } from 'lucide-react';
import { useState } from 'react';
import changelog from '@/lib/changelog.generated.json';

/** 更新日志分类 → 语义图标（主流 changelog 惯例：✨ 新增 / 🐛 修复 / 循环 变更） */
const CATEGORY_ICONS: Record<string, { Icon: typeof Bug; className: string }> =
  {
    新增: { Icon: Sparkles, className: 'text-accent' },
    修复: { Icon: Bug, className: 'text-warning' },
    变更: { Icon: RefreshCw, className: 'text-secondary' },
  };

function CategoryIcon({ name }: { name: string }) {
  const meta = CATEGORY_ICONS[name] ?? {
    Icon: CircleDot,
    className: 'text-secondary',
  };
  return <meta.Icon size={13} className={`flex-none ${meta.className}`} />;
}

interface ChangelogEntry {
  categoryName: string;
  text: string;
}

/**
 * 更新日志手风琴（最新版本默认展开，历史版本折叠成单行）
 *
 * 内容多时弹窗保持简洁：折叠行只留版本号 / 最新标签 / 日期，
 * 点击展开该版本的条目（图标 + 文字逐条）。数据来自 CHANGELOG.md
 * 构建期解析结果。
 */
export function ChangelogTimeline() {
  // 默认展开最新版本，历史版本折叠
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(changelog.releases.slice(0, 1).map((r) => r.version)),
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
      {changelog.releases.map((release, index) => {
        const isLatest = index === 0;
        const isOpen = expanded.has(release.version);
        const entries: ChangelogEntry[] = release.categories.flatMap(
          (category) =>
            category.items.map((text) => ({
              categoryName: category.name,
              text,
            })),
        );

        return (
          <VStack key={release.version}>
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => toggle(release.version)}
              className="flex w-full items-center gap-2 rounded-control px-2 py-2 text-left hover:bg-overlay-hover"
            >
              {isOpen ? (
                <Minus size={14} className="flex-none text-secondary" />
              ) : (
                <Plus size={14} className="flex-none text-secondary" />
              )}
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
              <VStack gap={1.5} className="py-1 pl-7 pr-2">
                {entries.map(({ categoryName, text }) => (
                  <HStack key={text} gap={2} align="start">
                    <span className="mt-1 flex-none">
                      <CategoryIcon name={categoryName} />
                    </span>
                    <Text size="sm" color="secondary" className="min-w-0">
                      {text}
                    </Text>
                  </HStack>
                ))}
              </VStack>
            )}
          </VStack>
        );
      })}
    </VStack>
  );
}
