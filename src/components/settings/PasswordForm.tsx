'use client';

import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Divider } from '@astryxdesign/core/Divider';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { VStack } from '@astryxdesign/core/VStack';
import { useState } from 'react';
import { ApiError } from '@/lib/request/ApiError';
import { accountApi } from '@/services';

/**
 * 安全设置（Linear / Vercel 风格）
 *
 * 独立 Card，专门管理密码修改。
 * - 3 个 label-above-input（当前 / 新 / 确认）
 * - 底部保存栏：取消 + 保存密码
 * - 表单校验：新密码 ≥ 6 位，两次一致
 */
export function PasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isDirty = !!currentPassword || !!newPassword || !!confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) return;
    if (newPassword !== confirmPassword) {
      setError('两次输入的新密码不一致');
      return;
    }
    if (newPassword.length < 6) {
      setError('新密码至少 6 位');
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await accountApi.update({ currentPassword, newPassword });
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e) {
      if (e instanceof ApiError && e.isNetworkError) {
        setError('网络错误');
      } else {
        setError(e instanceof ApiError ? e.message : '修改失败');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
    setSuccess(false);
  };

  return (
    <Card padding={5} variant="default">
      <form onSubmit={handleSubmit}>
        <VStack gap={5}>
          {/* Section header */}
          <VStack gap={1}>
            <Heading level={5}>安全</Heading>
            <Text size="sm" color="secondary">
              修改登录密码
            </Text>
          </VStack>

          <Divider />

          {/* 当前密码 */}
          <VStack gap={2}>
            <Text size="sm" weight="medium">
              当前密码
            </Text>
            <TextInput
              label="当前密码"
              isLabelHidden
              type="password"
              value={currentPassword}
              onChange={setCurrentPassword}
              width="100%"
              placeholder="请输入当前密码"
              isRequired
            />
          </VStack>

          {/* 新密码 */}
          <VStack gap={2}>
            <Text size="sm" weight="medium">
              新密码
            </Text>
            <TextInput
              label="新密码"
              isLabelHidden
              type="password"
              value={newPassword}
              onChange={setNewPassword}
              width="100%"
              placeholder="至少 6 位"
              isRequired
            />
          </VStack>

          {/* 确认新密码 */}
          <VStack gap={2}>
            <Text size="sm" weight="medium">
              确认新密码
            </Text>
            <TextInput
              label="确认新密码"
              isLabelHidden
              type="password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              width="100%"
              placeholder="再次输入新密码"
              isRequired
            />
          </VStack>

          <Divider />

          {/* 底部保存栏 */}
          <HStack gap={2} justify="between" align="center">
            {error ? (
              <Text size="2xs" className="text-danger">
                {error}
              </Text>
            ) : success ? (
              <Text size="2xs" className="text-success">
                密码已更新
              </Text>
            ) : (
              <span />
            )}
            <HStack gap={2}>
              <Button
                label="清除"
                variant="ghost"
                size="sm"
                type="button"
                isDisabled={!isDirty || saving}
                onClick={handleReset}
              />
              <Button
                label="保存密码"
                variant="primary"
                size="sm"
                type="submit"
                isLoading={saving}
                isDisabled={
                  !currentPassword || !newPassword || !confirmPassword
                }
              />
            </HStack>
          </HStack>
        </VStack>
      </form>
    </Card>
  );
}
