'use client';

import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { FormLayout } from '@astryxdesign/core/FormLayout';
import { List, ListItem } from '@astryxdesign/core/List';
import { Switch } from '@astryxdesign/core/Switch';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { VStack } from '@astryxdesign/core/VStack';
import { RefreshCw, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { CategorySelector } from '@/components/categories/CategorySelector';
import {
  type FormMessage,
  FormSaveBar,
} from '@/components/settings/FormSaveBar';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { ApiError } from '@/lib/request/ApiError';
import { request } from '@/lib/request/request';
import type {
  Category,
  LuckyConfig,
  LuckyDeleteMissingResult,
  LuckyMissingCard,
  LuckyMissingCardsResult,
  LuckySyncResult,
} from '@/types';

interface LuckyConfigFormProps {
  /** SSR 时从 UserPreference 读取的初始配置 */
  initialConfig: LuckyConfig;
  /** SSR 时从 DB 读取的所有分类（用于默认分类下拉） */
  categories: Category[];
  /** SSR 时从 DB 读取的 Lucky 失效卡片 */
  initialMissingCards: LuckyMissingCard[];
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
  initialMissingCards,
}: LuckyConfigFormProps) {
  const [config, setConfig] = useState<LuckyConfig>(initialConfig);
  const [originalConfig, setOriginalConfig] =
    useState<LuckyConfig>(initialConfig);

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<FormMessage | null>(null);

  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<LuckySyncResult | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [missingCards, setMissingCards] =
    useState<LuckyMissingCard[]>(initialMissingCards);
  const [deletingMissing, setDeletingMissing] = useState(false);
  const [cleanupMessage, setCleanupMessage] = useState<FormMessage | null>(
    null,
  );

  useEffect(() => {
    setConfig(initialConfig);
    setOriginalConfig(initialConfig);
    setMissingCards(initialMissingCards);
  }, [initialConfig, initialMissingCards]);

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
    setCleanupMessage(null);
    try {
      const result = await request<LuckySyncResult>('/api/lucky/sync', {
        method: 'POST',
      });
      setSyncResult(result);
      // 同步后重新拉取配置（更新 lastSyncAt）
      try {
        const [fresh, missing] = await Promise.all([
          request<LuckyConfig>('/api/lucky/config'),
          request<LuckyMissingCardsResult>('/api/lucky/missing-cards'),
        ]);
        setConfig(fresh);
        setOriginalConfig(fresh);
        setMissingCards(missing.cards);
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

  /** 手动一键删除 Lucky 失效卡片，不记录永久跳过，规则恢复后可重建 */
  const handleDeleteMissing = async () => {
    setDeletingMissing(true);
    setCleanupMessage(null);
    try {
      const result = await request<LuckyDeleteMissingResult>(
        '/api/lucky/missing-cards',
        { method: 'DELETE' },
      );
      setMissingCards([]);
      setCleanupMessage({
        type: 'success',
        text: `已删除 ${result.deleted} 张失效卡片`,
      });
    } catch (e) {
      setCleanupMessage({
        type: 'error',
        text: e instanceof ApiError ? e.message : '删除失效卡片失败',
      });
    } finally {
      setDeletingMissing(false);
    }
  };

  /** 恢复跳过的规则：清空跳过列表并立即重新同步 */
  const handleForceResync = async () => {
    const newConfig = { ...config, deletedRuleIds: [] };
    setConfig(newConfig);
    try {
      await request('/api/preferences', {
        method: 'PATCH',
        body: { key: 'lucky', value: newConfig },
      });
      setOriginalConfig(newConfig);
    } catch {
      setConfig(config);
      return;
    }
    await handleSync();
  };

  const canSync =
    config.enabled && !!config.baseUrl && !!config.openToken && !syncing;

  return (
    <VStack gap={6}>
      <SettingsSection
        title="Lucky 同步"
        description="同步 Lucky 反代规则为卡片"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSave();
          }}
        >
          <VStack gap={5}>
            <FormLayout>
              <Switch
                label="启用 Lucky 同步"
                value={config.enabled}
                onChange={handleToggleEnabled}
                isLoading={saving}
                description="开启后可手动同步"
                labelPosition="start"
                labelSpacing="spread"
                width="100%"
              />

              <TextInput
                label="Lucky 后台地址"
                description="内网地址或域名均可"
                value={config.baseUrl}
                onChange={(v) => updateField('baseUrl', v)}
                width="100%"
                placeholder="http://192.168.1.1:16601"
                hasClear
                isRequired
              />
              <TextInput
                label="OpenToken"
                description="Lucky 后台「设置」页最底部获取"
                type="password"
                value={config.openToken}
                onChange={(v) => updateField('openToken', v)}
                width="100%"
                placeholder="Lucky OpenToken"
                hasClear
                isRequired
              />
              <CategorySelector
                categories={categories}
                label="新卡片默认分类"
                description="仅对之后新建的卡片生效"
                value={config.defaultCategoryId}
                onChange={(value) =>
                  updateField('defaultCategoryId', value || null)
                }
                isOptional
              />
            </FormLayout>

            <FormSaveBar
              message={msg}
              isDirty={isDirty}
              saving={saving}
              onReset={() => {
                setConfig(originalConfig);
                setMsg(null);
              }}
            />
          </VStack>
        </form>
      </SettingsSection>

      <SyncSection
        lastSyncAt={config.lastSyncAt}
        syncing={syncing}
        canSync={canSync}
        onSync={handleSync}
        syncResult={syncResult}
        syncError={syncError}
        onRestore={() => void handleForceResync()}
      />

      {cleanupMessage && (
        <Banner
          status={cleanupMessage.type}
          title={cleanupMessage.text}
          isDismissable
          onDismiss={() => setCleanupMessage(null)}
        />
      )}

      {missingCards.length > 0 && (
        <MissingCardsSection
          cards={missingCards}
          deleting={deletingMissing}
          onDelete={() => void handleDeleteMissing()}
        />
      )}
    </VStack>
  );
}

interface SyncSectionProps {
  /** 上次同步时间（ISO 字符串） */
  lastSyncAt: string | null;
  syncing: boolean;
  canSync: boolean;
  onSync: () => void;
  syncResult: LuckySyncResult | null;
  syncError: string | null;
  onRestore: () => void;
}

/** 手动同步操作 + 结果展示区块 */
function SyncSection({
  lastSyncAt,
  syncing,
  canSync,
  onSync,
  syncResult,
  syncError,
  onRestore,
}: SyncSectionProps) {
  return (
    <SettingsSection
      title="手动同步"
      description={
        lastSyncAt
          ? `上次同步：${new Date(lastSyncAt).toLocaleString('zh-CN', {
              timeZone: 'Asia/Shanghai',
            })}`
          : '尚未同步'
      }
      actions={
        <Button
          label={syncing ? '同步中…' : '立即同步'}
          variant="secondary"
          size="sm"
          isDisabled={!canSync}
          isLoading={syncing}
          onClick={onSync}
          icon={<RefreshCw size={14} strokeWidth={1.5} />}
        />
      }
    >
      <VStack gap={4}>
        {syncResult && (
          <Banner
            collapsible={false}
            status={syncResult.errors.length > 0 ? 'warning' : 'success'}
            title={
              syncResult.errors.length > 0 ? '部分规则同步失败' : '同步完成'
            }
            description={`新建 ${syncResult.created} · 更新 ${syncResult.updated} · 标记失效 ${syncResult.markedMissing} · 跳过 ${syncResult.skipped}`}
          >
            {(syncResult.errors.length > 0 || syncResult.skipped > 0) && (
              <VStack gap={2}>
                {syncResult.errors.length > 0 && (
                  <VStack gap={1}>
                    {syncResult.errors.map((error) => (
                      <Text key={error} type="supporting">
                        {error}
                      </Text>
                    ))}
                  </VStack>
                )}

                {syncResult.skipped > 0 && (
                  <Button
                    label="恢复跳过数据"
                    variant="secondary"
                    size="sm"
                    isDisabled={syncing}
                    onClick={onRestore}
                  />
                )}
              </VStack>
            )}
          </Banner>
        )}

        {syncError && (
          <Banner status="error" title="同步失败" description={syncError} />
        )}
      </VStack>
    </SettingsSection>
  );
}

interface MissingCardsSectionProps {
  cards: LuckyMissingCard[];
  deleting: boolean;
  onDelete: () => void;
}

/** Lucky 失效卡片列表 + 一键删除操作 */
function MissingCardsSection({
  cards,
  deleting,
  onDelete,
}: MissingCardsSectionProps) {
  return (
    <SettingsSection
      title="失效卡片"
      description="Lucky 侧规则已删除或禁用；恢复后同步会重新创建"
      actions={
        <Button
          label={`删除 ${cards.length} 张`}
          variant="destructive"
          size="sm"
          isDisabled={deleting}
          isLoading={deleting}
          onClick={onDelete}
          icon={<Trash2 size={14} strokeWidth={1.5} />}
        />
      }
    >
      <List density="compact" hasDividers>
        {cards.map((card) => (
          <ListItem key={card.id} label={card.name} description={card.ruleId} />
        ))}
      </List>
    </SettingsSection>
  );
}
