import { HStack } from '@astryxdesign/core/HStack';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { Bug, CircleDot, RefreshCw, Sparkles } from 'lucide-react';
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
  return <meta.Icon size={12} className={`flex-none ${meta.className}`} />;
}

/**
 * 完整更新日志时间线（主流项目风格：左侧轨道 + 版本节点 + 分类图标）
 *
 * 纯展示组件：关于弹窗与更新弹窗的展开视图共用，数据来自
 * CHANGELOG.md 构建期解析结果。第一个版本视为最新，节点与标签高亮。
 */
export function ChangelogTimeline() {
  return (
    <div className="relative ml-1.5 space-y-6 border-l border-border pl-4">
      {changelog.releases.map((release, index) => {
        const isLatest = index === 0;
        return (
          <div key={release.version} className="relative">
            {/* 轨道节点圆点：最新版本 accent 实心，历史版本空心 */}
            <span
              aria-hidden
              className={`absolute -left-4 top-1 h-2.5 w-2.5 rounded-full border-2 ${
                isLatest
                  ? 'border-accent bg-accent'
                  : 'border-border bg-surface'
              }`}
            />
            <VStack gap={2}>
              <HStack gap={2} align="center">
                <Text size="sm" weight="semibold" className="text-primary">
                  {release.version}
                </Text>
                {isLatest && (
                  <span className="rounded-full bg-neutral px-2 py-0.5 text-xs font-medium text-accent">
                    最新
                  </span>
                )}
                {release.date && (
                  <Text size="2xs" color="secondary">
                    {release.date}
                  </Text>
                )}
              </HStack>
              {release.categories.map((category) => (
                <VStack key={category.name} gap={1}>
                  <HStack gap={1.5} align="center">
                    <CategoryIcon name={category.name} />
                    <Text size="xsm" color="secondary">
                      {category.name}
                    </Text>
                  </HStack>
                  <VStack gap={0.5} className="pl-4">
                    {category.items.map((item) => (
                      <Text key={item} size="sm">
                        {item}
                      </Text>
                    ))}
                  </VStack>
                </VStack>
              ))}
            </VStack>
          </div>
        );
      })}
    </div>
  );
}
