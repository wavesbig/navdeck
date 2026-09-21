'use client';

import { Button } from '@astryxdesign/core/Button';
import { HStack } from '@astryxdesign/core/HStack';
import { Switch } from '@astryxdesign/core/Switch';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { useState } from 'react';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { APP_VERSION } from '@/lib/version';
import { preferencesApi, versionApi } from '@/services';
import type { VersionUpdateInfo } from '@/types';

interface VersionCheckSettingProps {
  initialEnabled: boolean;
  /** SSR 读取的最近一次检查缓存（null = 从未检查过） */
  initialUpdate: VersionUpdateInfo | null;
}

/**
 * 版本更新检测设置
 *
 * - Switch 即时保存，失败回滚
 * - 「立即检查」强制请求 GitHub（跳过 24h 节流）
 * - 明确说明出站请求用途，自托管用户对联网行为敏感
 */
export function VersionCheckSetting({
  initialEnabled,
  initialUpdate,
}: VersionCheckSettingProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [update, setUpdate] = useState<VersionUpdateInfo | null>(initialUpdate);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const handleToggle = async (checked: boolean) => {
    const prev = enabled;
    setEnabled(checked);
    try {
      await preferencesApi.update('versionCheckEnabled', checked);
    } catch {
      setEnabled(prev);
    }
  };

  const handleCheck = async () => {
    setChecking(true);
    setMessage(null);
    try {
      const result = await versionApi.check(true);
      setUpdate(result.update ?? null);
      if (result.error) {
        setMessage({ type: 'error', text: result.error });
      } else {
        setMessage({
          type: 'success',
          text: result.updateAvailable
            ? `发现新版本 ${result.update?.tag ?? ''}`
            : '当前已是最新版本',
        });
      }
    } catch {
      setMessage({ type: 'error', text: '检查失败，请稍后重试' });
    } finally {
      setChecking(false);
    }
  };

  return (
    <SettingsSection
      title="版本更新"
      description={`当前版本 v${APP_VERSION}`}
      actions={
        <Button
          label={checking ? '检查中…' : '立即检查'}
          variant="secondary"
          size="sm"
          isDisabled={checking || !enabled}
          onClick={() => void handleCheck()}
        />
      }
    >
      <HStack justify="between" align="center" width="100%">
        <VStack gap={1} align="start">
          <Text size="sm" weight="medium">
            自动检测新版本
          </Text>
          <Text type="supporting" textWrap="pretty">
            每 24 小时请求一次 GitHub Releases 获取最新版本与更新日志；
            关闭后不再发起该请求
          </Text>
        </VStack>
        <Switch
          label="自动检测新版本"
          isLabelHidden
          value={enabled}
          onChange={handleToggle}
        />
      </HStack>
      <VStack gap={1}>
        {update && (
          <Text size="sm" color="secondary">
            上次检查：{update.checkedAt.slice(0, 10)} · 远端最新 {update.tag}
            {update.tag !== `v${APP_VERSION}` && '（非当前运行版本）'}
          </Text>
        )}
        {message && (
          <Text
            size="sm"
            className={
              message.type === 'success' ? 'text-success' : 'text-error'
            }
          >
            {message.text}
          </Text>
        )}
      </VStack>
    </SettingsSection>
  );
}
