'use client';

import { AlertDialog } from '@astryxdesign/core/AlertDialog';
import { Button } from '@astryxdesign/core/Button';
import { HStack } from '@astryxdesign/core/HStack';
import { Text } from '@astryxdesign/core/Text';
import { useToast } from '@astryxdesign/core/Toast';
import { VStack } from '@astryxdesign/core/VStack';
import { Download, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { ApiError } from '@/lib/request/ApiError';
import { backupApi } from '@/services';

/**
 * 备份与恢复
 *
 * - 导出：下载 zip（backup.json + data/uploads 上传文件）
 * - 恢复：上传 zip，确认后事务内清空重建并还原上传文件
 */
export function BackupManager() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const showToast = useToast();
  const router = useRouter();

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await backupApi.exportBackup();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
      a.href = url;
      a.download = `navdeck-backup-${stamp}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      showToast({ body: '导出失败', type: 'error' });
    } finally {
      setExporting(false);
    }
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setPendingFile(file);
  };

  const confirmImport = async () => {
    if (!pendingFile || importing) return;
    setImporting(true);
    try {
      await backupApi.importBackup(pendingFile);
      setPendingFile(null);
      showToast({ body: '恢复完成，页面即将刷新', type: 'info' });
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        const data = err.data as { error?: string } | undefined;
        showToast({ body: data?.error ?? '导入失败', type: 'error' });
      } else {
        showToast({ body: '恢复失败', type: 'error' });
      }
    } finally {
      setImporting(false);
    }
  };

  return (
    <SettingsSection title="备份与恢复" description="一键导出 / 恢复全部数据">
      <VStack gap={3}>
        <HStack gap={2}>
          <Button
            label="导出备份"
            variant="primary"
            size="sm"
            icon={<Download size={14} />}
            isDisabled={exporting}
            onClick={() => void handleExport()}
          />
          <Button
            label="从备份恢复"
            variant="ghost"
            size="sm"
            icon={<Upload size={14} />}
            isDisabled={importing}
            onClick={() => fileRef.current?.click()}
          />
          <input
            ref={fileRef}
            type="file"
            accept="application/zip,.zip"
            className="hidden"
            onChange={(e) => void handleFileChange(e)}
          />
        </HStack>

        <Text size="2xs" color="secondary">
          不含登录账号与密码（上传的图标与壁纸已一并打包）
        </Text>
      </VStack>

      <AlertDialog
        isOpen={pendingFile !== null}
        onOpenChange={(open) => {
          if (!open && !importing) setPendingFile(null);
        }}
        title="从备份恢复"
        description={`将覆盖当前全部数据，此操作不可撤销。

          文件：${pendingFile?.name ?? ''}（${
            pendingFile ? (pendingFile.size / 1024 / 1024).toFixed(2) : 0
          } MB）`}
        cancelLabel="取消"
        actionLabel="确认恢复"
        isActionLoading={importing}
        onAction={() => void confirmImport()}
        width={440}
      />
    </SettingsSection>
  );
}
