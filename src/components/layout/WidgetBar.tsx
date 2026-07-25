import {VStack} from '@astryxdesign/core/VStack';
import {Card} from '@astryxdesign/core/Card';
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';

/**
 * Widget 栏容器（M1.3 占位）
 *
 * 桌面端：右侧固定 360px，纵向排列 widgets
 * 移动端：移到主体下方（由主页布局控制）
 *
 * M1.7 阶段替换为真实 widget：NasStatus / ResourceGauge / 倒数日 / 正数日
 */
export function WidgetBar() {
  return (
    <VStack gap={3}>
      <WidgetPlaceholder title="NAS 状态" hint="12/14 运行中" />
      <WidgetPlaceholder title="资源水位" hint="CPU · 内存 · IO" />
      <WidgetPlaceholder title="倒数日" hint="距离春节还有 XX 天" />
      <WidgetPlaceholder title="正数日" hint="已运行 XX 天" />
    </VStack>
  );
}

function WidgetPlaceholder({title, hint}: {title: string; hint: string}) {
  return (
    <Card>
      <VStack gap={1}>
        <Heading level={5}>{title}</Heading>
        <Text size="sm" color="secondary">
          {hint}
        </Text>
      </VStack>
    </Card>
  );
}
