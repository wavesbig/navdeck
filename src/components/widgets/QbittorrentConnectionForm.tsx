import { Button } from '@astryxdesign/core/Button';
import { FormLayout } from '@astryxdesign/core/FormLayout';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { useState } from 'react';
import type { QbittorrentConfig } from '@/types';

interface QbittorrentConnectionFormProps {
  /** 预填配置（添加流程传空对象，重新设置传当前值） */
  initial: QbittorrentConfig;
  submitLabel: string;
  /**
   * 保存 + 连接验证由父级提供（两处弹窗的差异逻辑）。
   * 失败时 throw Error，message 就地展示且表单不关闭；
   * 成功后由父级负责关闭所在弹窗。
   */
  onSubmit: (config: QbittorrentConfig) => Promise<void>;
}

/**
 * qBittorrent 连接表单（添加弹窗与重新设置弹窗共用）
 *
 * 用户名 / 密码允许留空：qB 开启「本地绕过认证」时无需凭据。
 */
export function QbittorrentConnectionForm({
  initial,
  submitLabel,
  onSubmit,
}: QbittorrentConnectionFormProps) {
  const [config, setConfig] = useState<QbittorrentConfig>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!config.url.trim() || saving) return;
    setSaving(true);
    setError('');
    try {
      await onSubmit(config);
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败');
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit();
      }}
    >
      <FormLayout direction="vertical">
        <TextInput
          label="WebUI 地址"
          placeholder="http://192.168.1.10:8080"
          value={config.url}
          onChange={(v) => setConfig((p) => ({ ...p, url: v }))}
          width="100%"
          hasAutoFocus
        />
        <TextInput
          label="用户名"
          placeholder="admin"
          value={config.username}
          onChange={(v) => setConfig((p) => ({ ...p, username: v }))}
          width="100%"
        />
        <TextInput
          label="密码"
          type="password"
          placeholder="WebUI 密码"
          value={config.password}
          onChange={(v) => setConfig((p) => ({ ...p, password: v }))}
          width="100%"
        />

        {error && (
          <Text size="sm" className="text-danger" role="alert">
            {error}
          </Text>
        )}

        <div className="flex justify-end pt-1">
          <Button
            label={submitLabel}
            variant="primary"
            size="sm"
            type="submit"
            isLoading={saving}
            isDisabled={!config.url.trim() || saving}
          />
        </div>
      </FormLayout>
    </form>
  );
}
