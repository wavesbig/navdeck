'use client';

import { HStack } from '@astryxdesign/core/HStack';
import { Switch } from '@astryxdesign/core/Switch';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';

interface SwitchSettingRowProps {
  /** 左侧主标签（同时用作 Switch 的无障碍名称兜底） */
  label: string;
  /** 左侧次要说明 */
  description: string;
  /** Switch 的无障碍名称（缺省用 label；可与可见标签不同，如动词句式） */
  switchLabel?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/**
 * 开关设置行（设置区通用骨架）
 *
 * 左侧标签 + 说明，右侧隐藏可见标签的 Switch。
 * CardStatusBadgeSetting / ViewDisplaySetting 等共用，样式调整只改这里。
 */
export function SwitchSettingRow({
  label,
  description,
  switchLabel,
  checked,
  onChange,
}: SwitchSettingRowProps) {
  return (
    <HStack justify="between" align="center" width="100%">
      <VStack gap={1} align="start">
        <Text size="sm" weight="medium">
          {label}
        </Text>
        <Text type="supporting" textWrap="pretty">
          {description}
        </Text>
      </VStack>
      <Switch
        label={switchLabel ?? label}
        isLabelHidden
        value={checked}
        onChange={onChange}
      />
    </HStack>
  );
}
