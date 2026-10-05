'use client';

import { useState } from 'react';
import { CARD_STATUS_BADGE_EVENT } from '@/components/layout/card-view-events';
import { SwitchSettingRow } from '@/components/settings/SwitchSettingRow';
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
    <SwitchSettingRow
      label="可达状态"
      description="卡片右上角的服务探测状态点（在线 / 离线）"
      switchLabel="显示卡片可达状态点"
      checked={enabled}
      onChange={handleChange}
    />
  );
}
