import { HStack } from '@astryxdesign/core/HStack';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import changelog from '@/lib/changelog.generated.json';

/**
 * 完整更新日志时间线（全部版本 + 分类条目）
 *
 * 纯展示组件：关于弹窗与设置内容共用，数据来自 CHANGELOG.md
 * 构建期解析结果。
 */
export function ChangelogTimeline() {
  return (
    <VStack gap={4}>
      {changelog.releases.map((release) => (
        <VStack key={release.version} gap={2}>
          <HStack gap={2} align="center">
            <Text size="sm" weight="semibold" className="text-primary">
              {release.version}
            </Text>
            {release.date && (
              <Text size="2xs" color="secondary">
                {release.date}
              </Text>
            )}
          </HStack>
          {release.categories.map((category) => (
            <VStack key={category.name} gap={1}>
              <Text size="xsm" color="secondary">
                {category.name}
              </Text>
              {category.items.map((item) => (
                <Text key={item} size="sm">
                  {item}
                </Text>
              ))}
            </VStack>
          ))}
        </VStack>
      ))}
    </VStack>
  );
}
