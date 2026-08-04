'use client';

import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Divider } from '@astryxdesign/core/Divider';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { Switch } from '@astryxdesign/core/Switch';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { VStack } from '@astryxdesign/core/VStack';
import { RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ApiError } from '@/lib/request/ApiError';
import { request } from '@/lib/request/request';
import type { Category, LuckyConfig, LuckySyncResult } from '@/types';

interface LuckyConfigFormProps {
  /** SSR 时从 UserPreference 读取的初始配置 */
  initialConfig: LuckyConfig;
  /** SSR 时从 DB 读取的所有分类（用于默认分类下拉） */
  categories: Category[];
}

/**
 * Lucky 同步配置表单
 *
 * - 启用开关（即时生效）
 * - baseUrl / openToken / defaultCategoryId（底部保存按钮）
 * - 同步按钮（手动触发，显示结果统计）
 * - 上次同步时间显示
 */
export function LuckyConfigForm({
  initialConfig,
  categories,
}: LuckyConfigFormProps) {
  const [config, setConfig] = useState<LuckyConfig>(initialConfig);
  const [originalConfig, setOriginalConfig] =
    useState<LuckyConfig>(initialConfig);

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<LuckySyncResult | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    setConfig(initialConfig);
    setOriginalConfig(initialConfig);
  }, [initialConfig]);

  // 配置是否有改动（用于底部保存按钮 disabled 判断）
  const isDirty = JSON.stringify(config) !== JSON.stringify(originalConfig);

  /** 更新单个字段 */
  const updateField = <K extends keyof LuckyConfig>(
    key: K,
    value: LuckyConfig[K],
  ) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  /** 启用开关：即时保存（Switch 语义） */
  const handleToggleEnabled = async (checked: boolean) => {
    const newConfig = { ...config, enabled: checked };
    setConfig(newConfig);
    setSaving(true);
    setMsg(null);
    try {
      await request('/api/preferences', {
        method: 'PATCH',
        body: { key: 'lucky', value: newConfig },
      });
      setOriginalConfig(newConfig);
      setMsg({ type: 'success', text: '已保存' });
    } catch (e) {
      if (e instanceof ApiError && e.isNetworkError) {
        setMsg({ type: 'error', text: '网络错误' });
      } else {
        setMsg({ type: 'error', text: '保存失败' });
      }
      // 回滚
      setConfig(originalConfig);
    } finally {
      setSaving(false);
    }
  };

  /** 保存配置（baseUrl / openToken / defaultCategoryId） */
  const handleSave = async () => {
    if (!isDirty) return;
    setSaving(true);
    setMsg(null);
    try {
      await request('/api/preferences', {
        method: 'PATCH',
        body: { key: 'lucky', value: config },
      });
      setOriginalConfig(config);
      setMsg({ type: 'success', text: '已保存' });
    } catch (e) {
      if (e instanceof ApiError && e.isNetworkError) {
        setMsg({ type: 'error', text: '网络错误' });
      } else {
        setMsg({ type: 'error', text: '保存失败' });
      }
    } finally {
      setSaving(false);
    }
  };

  /** 触发同步 */
  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    setSyncError(null);
    try {
      const result = await request<LuckySyncResult>('/api/lucky/sync', {
        method: 'POST',
      });
      setSyncResult(result);
      // 同步后重新拉取配置（更新 lastSyncAt）
      try {
        const fresh = await request<LuckyConfig>('/api/lucky/config');
        setConfig(fresh);
        setOriginalConfig(fresh);
      } catch {
        // 拉取失败不影响同步结果展示
      }
    } catch (e) {
      if (e instanceof ApiError) {
        setSyncError(e.message);
      } else {
        setSyncError('同步失败');
      }
    } finally {
      setSyncing(false);
    }
  };

  const canSync =
    config.enabled && !!config.baseUrl && !!config.openToken && !syncing;

  return (
    <Card padding={5} variant="default">
      <VStack gap={5}>
        {/* Section header */}
        <VStack gap={1}>
          <Heading level={5}>Lucky 同步</Heading>
          <Text size="sm" color="secondary">
            从 Lucky 反向代理规则自动生成卡片，免去手动录入
          </Text>
        </VStack>

        <Divider />

        {/* 启用开关（即时生效） */}
        <Switch
          label="启用 Lucky 同步"
          value={config.enabled}
          onChange={handleToggleEnabled}
          isLoading={saving}
          description="开启后可使用同步按钮拉取 Lucky 反代规则"
        />

        <Divider />

        {/* Lucky 连接配置 */}
        <VStack gap={4}>
          <Text size="sm" weight="medium">
            连接配置
          </Text>

          <VStack gap={2}>
            <Text size="sm">Lucky 后台地址</Text>
            <TextInput
              label="Lucky 后台地址"
              isLabelHidden
              value={config.baseUrl}
              onChange={(v) => updateField('baseUrl', v)}
              width="100%"
              placeholder="http://192.168.1.1:16601"
              hasClear
            />
            <Text size="2xs" color="secondary">
              内网地址或域名（如 https://lucky.example.com）
            </Text>
          </VStack>

          <VStack gap={2}>
            <Text size="sm">OpenToken</Text>
            <TextInput
              label="OpenToken"
              isLabelHidden
              type="password"
              value={config.openToken}
              onChange={(v) => updateField('openToken', v)}
              width="100%"
              placeholder="Lucky 后台 → 设置 → 最底部启用后获取"
              hasClear
            />
            <Text size="2xs" color="secondary">
              在 Lucky 后台「设置」页最底部启用 OpenToken
            </Text>
          </VStack>

          <VStack gap={2}>
            <Text size="sm">新卡片默认分类</Text>
            <select
              aria-label="新卡片默认分类"
              value={config.defaultCategoryId ?? ''}
              onChange={(e) =>
                updateField('defaultCategoryId', e.target.value || null)
              }
              className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-primary text-sm"
            >
              <option value="">未分类</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <Text size="2xs" color="secondary">
              同步生成的卡片默认归入此分类，可后续手动调整
            </Text>
          </VStack>
        </VStack>

        <Divider />

        {/* 同步操作 */}
        <VStack gap={3}>
          <HStack gap={2} align="center" justify="between">
            <VStack gap={1}>
              <Text size="sm" weight="medium">
                手动同步
              </Text>
              {config.lastSyncAt ? (
                <Text size="2xs" color="secondary">
                  上次同步：
                  {new Date(config.lastSyncAt).toLocaleString('zh-CN', {
                    timeZone: 'Asia/Shanghai',
                  })}
                </Text>
              ) : (
                <Text size="2xs" color="secondary">
                  尚未同步
                </Text>
              )}
            </VStack>
            <Button
              label={syncing ? '同步中…' : '立即同步'}
              variant="secondary"
              size="sm"
              isDisabled={!canSync}
              isLoading={syncing}
              onClick={handleSync}
              icon={<RefreshCw size={14} strokeWidth={1.5} />}
            />
          </HStack>

          {/* 同步结果 */}
          {syncResult && (
            <VStack gap={1}>
              <Text size="2xs" className="text-success">
                同步完成
              </Text>
              <Text size="2xs" color="secondary">
                新建 {syncResult.created} · 更新 {syncResult.updated} · 标记失效{' '}
                {syncResult.markedMissing} · 跳过 {syncResult.skipped}
              </Text>
              {syncResult.errors.length > 0 && (
                <VStack gap={1}>
                  {syncResult.errors.map((err) => (
                    <Text key={err} size="2xs" className="text-danger">
                      {err}
                    </Text>
                  ))}
                </VStack>
              )}
            </VStack>
          )}

          {syncError && (
            <Text size="2xs" className="text-danger">
              {syncError}
            </Text>
          )}
        </VStack>

        <Divider />

        {/* 底部保存栏（仅连接配置字段） */}
        <HStack gap={2} justify="between" align="center">
          {msg ? (
            <Text
              size="2xs"
              className={
                msg.type === 'success' ? 'text-success' : 'text-danger'
              }
            >
              {msg.text}
            </Text>
          ) : (
            <span />
          )}
          <HStack gap={2}>
            <Button
              label="撤销"
              variant="ghost"
              size="sm"
              isDisabled={!isDirty || saving}
              onClick={() => {
                setConfig(originalConfig);
                setMsg(null);
              }}
            />
            <Button
              label="保存"
              variant="primary"
              size="sm"
              isLoading={saving}
              isDisabled={!isDirty}
              onClick={handleSave}
            />
          </HStack>
        </HStack>
      </VStack>
    </Card>
  );
}
