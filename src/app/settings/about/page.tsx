import { HStack } from '@astryxdesign/core/HStack';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { SettingsSection } from '@/components/settings/SettingsSection';
import changelog from '@/lib/changelog.generated.json';

/**
 * 关于页：当前版本 + 完整更新日志
 *
 * 数据来自 CHANGELOG.md（构建期经 scripts/generate-changelog.ts
 * 解析为 changelog.generated.json），与 GitHub Release、
 * 首页的更新内容弹窗共用同一事实源。
 */
export default function AboutSettingsPage() {
  const current = changelog.releases.find(
    (r) => r.version === changelog.currentVersion,
  );

  return (
    <VStack gap={6}>
      <SettingsSection title="关于" description="NavDeck 版本信息">
        <HStack gap={3} align="center">
          <span className="brand-title">{changelog.currentVersion}</span>
          {current?.date && (
            <Text size="xsm" color="secondary">
              发布于 {current.date}
            </Text>
          )}
        </HStack>
        {current && (
          <VStack gap={1.5}>
            {current.categories.map((category) => (
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
        )}
      </SettingsSection>

      <SettingsSection title="更新日志" description="全部版本变更记录">
        <VStack gap={5}>
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
      </SettingsSection>
    </VStack>
  );
}
