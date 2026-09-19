import { Card } from '@astryxdesign/core/Card';
import { HStack } from '@astryxdesign/core/HStack';
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
 * 用 Astryx Card（default 变体：surface 底 + 可见边框 + low 阴影），
 * 比裸 Section 的纯色 wash 更有卡片感；圆角与边框由主题统一管理。
 *
 * 头部单行：标题 + 内联描述（xsm 次要色，超长截断）+ 右侧操作按钮，
 * 头部与内容区之间用留白分隔，不再加横线。
 */
export function SettingsSection({
  title,
  description,
  actions,
  children,
}: SettingsSectionProps) {
  return (
    <Card padding={6} elevation="low">
      <VStack as="section" gap={5}>
        <HStack justify="between" align="center" gap={3}>
          <HStack gap={2} align="center" className="min-w-0 flex-1">
            <Text
              as="h2"
              className="shrink-0"
              style={{
                fontSize: '1.125rem',
                fontWeight: 600,
                lineHeight: '1.875rem',
              }}
            >
              {title}
            </Text>
            {description && (
              <Text size="xsm" color="secondary" className="min-w-0">
                {description}
              </Text>
            )}
          </HStack>
          {actions}
        </HStack>
        {children}
      </VStack>
    </Card>
  );
}
