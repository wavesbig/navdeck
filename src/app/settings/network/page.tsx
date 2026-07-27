import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { NetworkForm } from '@/components/settings/NetworkForm';
import { getUserPreference } from '@/lib/preferences';
import type { NetworkMode } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * 网络设置页
 */
export default async function NetworkSettingsPage() {
  const networkMode = await getUserPreference<NetworkMode>(
    'networkMode',
    'auto',
  );

  return (
    <VStack gap={4}>
      <Heading level={4}>网络</Heading>
      <Text size="sm" color="secondary">
        设置默认的内外网访问模式
      </Text>
      <NetworkForm initialMode={networkMode} />
    </VStack>
  );
}
