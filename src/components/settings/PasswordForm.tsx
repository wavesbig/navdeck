'use client';

import { FormLayout } from '@astryxdesign/core/FormLayout';
import { TextInput } from '@astryxdesign/core/TextInput';
import { VStack } from '@astryxdesign/core/VStack';
import { useState } from 'react';
import {
  type FormMessage,
  FormSaveBar,
} from '@/components/settings/FormSaveBar';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { ApiError } from '@/lib/request/ApiError';
import { accountApi } from '@/services';

/**
 * 安全设置
 *
 * 独立区块，专门管理密码修改。
 * 表单校验：新密码 ≥ 6 位，两次一致。
 */
export function PasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<FormMessage | null>(null);

  const isDirty = !!currentPassword || !!newPassword || !!confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) return;
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: '两次输入的新密码不一致' });
      return;
    }
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: '新密码至少 6 位' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await accountApi.update({ currentPassword, newPassword });
      setMessage({ type: 'success', text: '密码已更新' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e) {
      if (e instanceof ApiError && e.isNetworkError) {
        setMessage({ type: 'error', text: '网络错误' });
      } else {
        setMessage({
          type: 'error',
          text: e instanceof ApiError ? e.message : '修改失败',
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setMessage(null);
  };

  return (
    <SettingsSection title="安全" description="修改登录密码">
      <form onSubmit={(e) => void handleSubmit(e)}>
        <VStack gap={5}>
          <FormLayout>
            <TextInput
              label="当前密码"
              type="password"
              value={currentPassword}
              onChange={setCurrentPassword}
              width="100%"
              placeholder="请输入当前密码"
              isRequired
            />
            <TextInput
              label="新密码"
              type="password"
              value={newPassword}
              onChange={setNewPassword}
              width="100%"
              placeholder="至少 6 位"
              isRequired
            />
            <TextInput
              label="确认新密码"
              type="password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              width="100%"
              placeholder="再次输入新密码"
              isRequired
            />
          </FormLayout>

          <FormSaveBar
            message={message}
            isDirty={isDirty}
            saving={saving}
            onReset={handleReset}
          />
        </VStack>
      </form>
    </SettingsSection>
  );
}
