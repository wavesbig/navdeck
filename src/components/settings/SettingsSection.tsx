import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { Section } from '@astryxdesign/core/Section';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';

interface SettingsSectionProps {
  title: string;
  description?: string;
  /** 标题右侧操作（如「新建分类」「上传」按钮） */
  actions?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * 设置区块统一骨架
 *
 * 用 Astryx Section 默认变体（surface 底色）做柔和分区：
 * 比页面底色略亮的 wash + 圆角，有分割感但不像 Card 那样突兀。
 * 标题右侧可挂操作按钮。
 */
export function SettingsSection({
  title,
  description,
  actions,
  children,
}: SettingsSectionProps) {
  return (
    <Section padding={6} className="rounded-lg overflow-hidden">
      <VStack as="section" gap={5}>
        <VStack gap={1}>
          <HStack justify="between" align="center">
            <Heading level={4}>{title}</Heading>
            {actions}
          </HStack>
          {description && (
            <Text size="sm" color="secondary">
              {description}
            </Text>
          )}
        </VStack>
        {children}
      </VStack>
    </Section>
  );
}
