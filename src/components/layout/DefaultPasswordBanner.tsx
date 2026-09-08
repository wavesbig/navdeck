import { HStack } from '@astryxdesign/core/HStack';
import { Text } from '@astryxdesign/core/Text';
import { ShieldAlert } from 'lucide-react';
import Link from 'next/link';

/**
 * 默认密码安全提示横幅
 *
 * 服务端检测到密码仍为初始部署密码时，展示于首页内容区顶部，
 * 引导前往「设置 → 通用 → 安全」修改；修改后密码哈希变化自动消失。
 */
export function DefaultPasswordBanner() {
  return (
    <HStack
      align="center"
      gap={2}
      paddingInline={4}
      paddingBlock={2}
      className="mx-auto w-fit rounded-widget border border-warning/40 bg-surface/85 text-primary shadow-md backdrop-blur-md"
    >
      <ShieldAlert size={16} aria-hidden="true" className="text-warning" />
      <Text type="label">安全提示：当前仍在使用默认密码</Text>
      <Link
        href="/settings/general"
        className="text-sm font-medium text-accent underline-offset-2 hover:underline"
      >
        前往修改
      </Link>
    </HStack>
  );
}
