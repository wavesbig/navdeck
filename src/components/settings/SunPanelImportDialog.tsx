'use client';

import { Button } from '@astryxdesign/core/Button';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { HStack } from '@astryxdesign/core/HStack';
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import { useToast } from '@astryxdesign/core/Toast';
import { VStack } from '@astryxdesign/core/VStack';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FileJson,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { DIALOG_WIDTH } from '@/lib/design-tokens';
import { ApiError } from '@/lib/request/ApiError';
import type { SunPanelParseResult } from '@/lib/sun-panel';
import { importApi } from '@/services/import';

interface SunPanelImportDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  file: File | null;
  onSuccess: () => void;
}

export function SunPanelImportDialog({
  isOpen,
  onOpenChange,
  file,
  onSuccess,
}: SunPanelImportDialogProps) {
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<SunPanelParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'append' | 'overwrite'>('append');
  const [showCategories, setShowCategories] = useState(false);
  const showToast = useToast();

  useEffect(() => {
    if (!isOpen || !file) {
      setPreview(null);
      setError(null);
      setLoadingPreview(false);
      setShowCategories(false);
      return;
    }

    let isCancelled = false;
    setLoadingPreview(true);
    setError(null);

    importApi
      .previewSunPanel(file)
      .then((res) => {
        if (isCancelled) return;
        setPreview(res.preview);
      })
      .catch((err) => {
        if (isCancelled) return;
        if (err instanceof ApiError) {
          const data = err.data as { error?: string } | undefined;
          setError(data?.error ?? '解析 Sun-Panel 文件失败');
        } else if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('解析 Sun-Panel 文件失败');
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setLoadingPreview(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [isOpen, file]);

  const handleConfirm = async () => {
    if (!file || importing || !preview) return;
    setImporting(true);
    setError(null);
    try {
      const res = await importApi.importSunPanel(file, mode);
      const { stats } = res;
      showToast({
        body: `导入成功！创建 ${stats.categoriesCreated} 个分类，创建 ${stats.cardsCreated} 张卡片`,
        type: 'info',
      });
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      if (err instanceof ApiError) {
        const data = err.data as { error?: string } | undefined;
        setError(data?.error ?? '导入失败');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('导入失败');
      }
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open && !importing) onOpenChange(false);
      }}
      purpose="form"
      width={DIALOG_WIDTH.md}
    >
      <Layout
        header={
          <DialogHeader
            title="从 Sun-Panel 导入"
            onOpenChange={(open) => {
              if (!importing) onOpenChange(open);
            }}
          />
        }
        content={
          <LayoutContent>
            <VStack gap={4} width="100%">
              {/* 文件信息提示 */}
              <div className="flex items-center gap-2.5 p-3 rounded-panel bg-neutral-subtle/50 border border-border">
                <FileJson size={18} className="text-secondary shrink-0" />
                <div className="min-w-0 flex-1">
                  <Text size="sm" weight="medium" className="truncate">
                    {file?.name ?? 'Sun-Panel 配置文件 / 数据库'}
                  </Text>
                  <Text size="xsm" color="secondary">
                    {file ? `${(file.size / 1024).toFixed(1)} KB` : ''}
                  </Text>
                </div>
              </div>

              {/* 加载中状态 */}
              {loadingPreview && (
                <div className="py-8 flex flex-col items-center justify-center gap-2 text-secondary">
                  <Text size="sm">正在解析 Sun-Panel 配置文件…</Text>
                </div>
              )}

              {/* 错误提示 */}
              {error && (
                <div className="flex items-start gap-2 p-3 rounded-panel bg-error/10 border border-error/20 text-error">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <Text size="sm" color="inherit">
                    {error}
                  </Text>
                </div>
              )}

              {/* 解析成功内容展示 */}
              {!loadingPreview && preview && (
                <VStack gap={4} width="100%">
                  {/* 数据概览 */}
                  <div className="p-3 rounded-panel border border-border bg-surface flex flex-col gap-1.5">
                    <HStack justify="between" align="center">
                      <Text size="sm" weight="medium">
                        解析到 {preview.totalCategories} 个分类，共{' '}
                        {preview.totalCards} 张卡片
                      </Text>
                      <button
                        type="button"
                        onClick={() => setShowCategories(!showCategories)}
                        className="text-xs text-secondary hover:text-primary flex items-center gap-1 cursor-pointer"
                      >
                        {showCategories ? '收起详情' : '展开详情'}
                        {showCategories ? (
                          <ChevronDown size={14} />
                        ) : (
                          <ChevronRight size={14} />
                        )}
                      </button>
                    </HStack>

                    {preview.skippedCards > 0 && (
                      <Text size="xsm" color="secondary">
                        已自动跳过 {preview.skippedCards}{' '}
                        个内外网地址均为空的无效项
                      </Text>
                    )}

                    {/* 折叠分组卡片详情 */}
                    {showCategories && (
                      <div className="mt-2 pt-2 border-t border-border/60 max-h-40 overflow-y-auto flex flex-col gap-1">
                        {preview.categories.map((cat) => (
                          <div
                            key={cat.name}
                            className="flex justify-between items-center text-xs py-1 px-1.5 rounded hover:bg-neutral-subtle"
                          >
                            <span className="font-medium truncate max-w-[200px]">
                              {cat.name}
                            </span>
                            <span className="text-secondary shrink-0">
                              {cat.cards.length} 张卡片
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 导入模式选项 */}
                  <VStack gap={2} width="100%">
                    <Text size="sm" weight="medium">
                      选择导入模式
                    </Text>
                    <div
                      role="radiogroup"
                      aria-label="选择导入模式"
                      className="flex flex-col gap-2"
                    >
                      {/* 追加模式 */}
                      <label
                        className={`flex items-start gap-3 p-3 text-left rounded-panel border transition-colors cursor-pointer ${
                          mode === 'append'
                            ? 'border-accent bg-accent/5'
                            : 'border-border hover:bg-neutral-subtle'
                        }`}
                      >
                        <input
                          type="radio"
                          name="sunpanel-import-mode"
                          value="append"
                          checked={mode === 'append'}
                          onChange={() => setMode('append')}
                          className="sr-only"
                        />
                        <div className="mt-0.5">
                          {mode === 'append' ? (
                            <CheckCircle2 size={16} className="text-accent" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border border-border" />
                          )}
                        </div>
                        <div className="flex-1">
                          <Text size="sm" weight="medium">
                            追加导入（推荐）
                          </Text>
                          <Text size="xsm" color="secondary">
                            保留当前分类与卡片；已有同名分类将自动合并追加，其余分类创建在末尾
                          </Text>
                        </div>
                      </label>

                      {/* 覆盖模式 */}
                      <label
                        className={`flex items-start gap-3 p-3 text-left rounded-panel border transition-colors cursor-pointer ${
                          mode === 'overwrite'
                            ? 'border-error bg-error/5'
                            : 'border-border hover:bg-neutral-subtle'
                        }`}
                      >
                        <input
                          type="radio"
                          name="sunpanel-import-mode"
                          value="overwrite"
                          checked={mode === 'overwrite'}
                          onChange={() => setMode('overwrite')}
                          className="sr-only"
                        />
                        <div className="mt-0.5">
                          {mode === 'overwrite' ? (
                            <CheckCircle2 size={16} className="text-error" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border border-border" />
                          )}
                        </div>
                        <div className="flex-1">
                          <Text size="sm" weight="medium">
                            覆盖导入
                          </Text>
                          <Text size="xsm" color="secondary">
                            清空当前现有所有分类和卡片后重新导入（不影响小组件、壁纸及系统设置）
                          </Text>
                        </div>
                      </label>
                    </div>
                  </VStack>
                </VStack>
              )}
            </VStack>
          </LayoutContent>
        }
        footer={
          <LayoutFooter>
            <HStack justify="end" gap={2} width="100%">
              <Button
                label="取消"
                variant="ghost"
                size="sm"
                isDisabled={importing}
                onClick={() => onOpenChange(false)}
              />
              <Button
                label={importing ? '导入中…' : '确认导入'}
                variant={mode === 'overwrite' ? 'destructive' : 'primary'}
                size="sm"
                isDisabled={
                  loadingPreview ||
                  !preview ||
                  importing ||
                  preview.totalCards === 0
                }
                isLoading={importing}
                onClick={() => void handleConfirm()}
              />
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  );
}
