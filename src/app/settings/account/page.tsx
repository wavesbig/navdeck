import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {VStack} from '@astryxdesign/core/VStack';
import {AccountForm} from '@/components/settings/AccountForm';

export const dynamic = 'force-dynamic';

/**
 * 账号设置页
 */
export default function AccountSettingsPage() {
  return (
    <VStack gap={4}>
      <Heading level={4}>账号</Heading>
      <Text size="sm" color="secondary">
        修改登录用户名和密码（修改后下次登录生效）
      </Text>
      <AccountForm />
    </VStack>
  );
}
