import { VStack } from '@astryxdesign/core/VStack';
import { PortManager } from '@/components/settings/PortManager';

export const dynamic = 'force-dynamic';

/**
 * 端口速查与管理设置页
 */
export default function PortsSettingsPage() {
  return (
    <VStack gap={6}>
      <PortManager />
    </VStack>
  );
}
