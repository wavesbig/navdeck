'use client';

import { HStack } from '@astryxdesign/core/HStack';
import { Switch } from '@astryxdesign/core/Switch';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { useState } from 'react';
import { CARD_STATUS_BADGE_EVENT } from '@/components/layout/card-view-events';
import { preferencesApi } from '@/services';

interface CardStatusBadgeSettingProps {
  initialEnabled: boolean;
}

/**
 * 可达状态设置行（嵌入外观 Card 内）
 *
 * - 左侧标签说明，右侧 Switch，即时保存失败回滚
 * - 派发事件让已挂载的主页即时生效；设置页通常未挂载主页，
 *   导航返回主页时由 SSR 取新值
 */
export function CardStatusBadgeSetting({
  initialEnabled,
}: CardStatusBadgeSettingProps) {
  const [enabled, setEnabled] = useState(initialEnabled);

  const handleChange = async (checked: boolean) => {
    const prev = enabled;
    setEnabled(checked);
    window.dispatchEvent(
      new CustomEvent(CARD_STATUS_BADGE_EVENT, { detail: checked }),
    );
    try {
      await preferencesApi.update('cardStatusBadge', checked);
    } catch {
      setEnabled(prev);
      window.dispatchEvent(
        new CustomEvent(CARD_STATUS_BADGE_EVENT, { detail: prev }),
      );
    }
  };

  return (
    <HStack justify="between" align="center" width="100%">
      <VStack gap={1} align="start">
        <Text size="sm" weight="medium">
          可达状态
        </Text>
        <Text type="supporting" textWrap="pretty">
          卡片右上角的服务探测状态点（在线 / 离线）
        </Text>
      </VStack>
      <Switch
        label="显示卡片可达状态点"
        isLabelHidden
        value={enabled}
        onChange={handleChange}
      />
    </HStack>
  );
}
