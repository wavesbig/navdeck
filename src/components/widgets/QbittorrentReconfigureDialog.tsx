'use client';

import { Dialog } from '@astryxdesign/core/Dialog';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { useEffect, useState } from 'react';
import { QbittorrentConnectionForm } from '@/components/widgets/QbittorrentConnectionForm';
import { DIALOG_WIDTH } from '@/lib/design-tokens';
import { request } from '@/lib/request/request';
import { widgetsApi } from '@/services/widgets';
import type { QbittorrentConfig } from '@/types';

interface QbittorrentReconfigureDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * 设置 qBittorrent 连接弹窗（widget 右键菜单入口）
 *
 * 打开时读取当前配置预填；保存后真实登录验证，失败留在弹窗修正。
 * 保存成功后 widget 轮询自动换用新配置，无需手动刷新。
 */
export function QbittorrentReconfigureDialog({
  isOpen,
  onOpenChange,
}: QbittorrentReconfigureDialogProps) {
  const [initial, setInitial] = useState<QbittorrentConfig | null>(null);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setInitial(null);
    setLoadError('');
    let cancelled = false;
    widgetsApi.getQbittorrentConfig().then(
      (config) => {
        if (!cancelled) setInitial(config);
      },
      (e) => {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : '读取配置失败');
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const handleSave = async (config: QbittorrentConfig) => {
    await request('/api/preferences', {
      method: 'PATCH',
      body: { key: 'qbittorrent', value: config },
    });
    const stats = await widgetsApi.validateQbittorrentConnection();
    if (!stats.available) {
      throw new Error(stats.error ?? '连接失败，请检查配置');
    }
    onOpenChange(false);
  };

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      width={DIALOG_WIDTH.md}
      purpose="form"
      aria-label="设置 qBittorrent"
    >
      <div className="max-h-[85dvh] overflow-y-auto p-2">
        <VStack gap={3}>
          <VStack gap={0.5}>
            <Text as="h2">设置 qBittorrent</Text>
            <Text size="2xs" color="secondary">
              修改 WebUI 地址或账号，保存时验证连接。
            </Text>
          </VStack>

          {loadError && (
            <Text size="sm" className="text-error" role="alert">
              {loadError}
            </Text>
          )}

          {initial ? (
            <QbittorrentConnectionForm
              initial={initial}
              submitLabel="保存"
              onSubmit={handleSave}
            />
          ) : (
            !loadError && (
              <Text size="sm" color="secondary">
                读取中…
              </Text>
            )
          )}
        </VStack>
      </div>
    </Dialog>
  );
}
