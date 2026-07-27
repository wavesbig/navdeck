'use client';

import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Divider } from '@astryxdesign/core/Divider';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { VStack } from '@astryxdesign/core/VStack';
import { useEffect, useState } from 'react';

/**
 * 账号设置表单
 *
 * - 用户名修改（独立保存）
 * - 密码修改（独立保存，需验证当前密码）
 */
export function AccountForm() {
  const [username, setUsername] = useState('');
  const [originalUsername, setOriginalUsername] = useState('');
  const [usernameSaving, setUsernameSaving] = useState(false);
  const [usernameMsg, setUsernameMsg] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // 拉取当前账号信息
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/account', { cache: 'no-store' });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { username: string };
        if (!cancelled) {
          setUsername(data.username);
          setOriginalUsername(data.username);
        }
      } catch (e) {
        console.error('拉取账号信息失败', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSaveUsername = async () => {
    if (!username.trim() || username === originalUsername) return;
    setUsernameSaving(true);
    setUsernameMsg(null);
    try {
      const res = await fetch('/api/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim() }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setUsernameMsg({ type: 'error', text: data.error ?? '保存失败' });
      } else {
        setOriginalUsername(username.trim());
        setUsernameMsg({ type: 'success', text: '用户名已更新' });
      }
    } catch {
      setUsernameMsg({ type: 'error', text: '网络错误' });
    } finally {
      setUsernameSaving(false);
    }
  };

  const handleSavePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) return;
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: '两次输入的新密码不一致' });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: '新密码至少 6 位' });
      return;
    }
    setPasswordSaving(true);
    setPasswordMsg(null);
    try {
      const res = await fetch('/api/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setPasswordMsg({ type: 'error', text: data.error ?? '修改失败' });
      } else {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setPasswordMsg({ type: 'success', text: '密码已更新' });
      }
    } catch {
      setPasswordMsg({ type: 'error', text: '网络错误' });
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <VStack gap={4}>
      {/* 用户名修改 */}
      <Card padding={4}>
        <VStack gap={3}>
          <Heading level={5}>账号信息</Heading>
          <Text size="sm" color="secondary">
            修改登录用户名（下次登录生效）
          </Text>
          <TextInput
            label="用户名"
            value={username}
            onChange={setUsername}
            width="100%"
            hasClear
          />
          <HStack gap={2} align="center">
            <Button
              label="保存用户名"
              variant="primary"
              size="sm"
              isLoading={usernameSaving}
              isDisabled={!username.trim() || username === originalUsername}
              onClick={handleSaveUsername}
            />
            {usernameMsg && (
              <Text
                size="sm"
                className={
                  usernameMsg.type === 'success'
                    ? 'text-success'
                    : 'text-danger'
                }
              >
                {usernameMsg.text}
              </Text>
            )}
          </HStack>
        </VStack>
      </Card>

      <Divider />

      {/* 密码修改 */}
      <Card padding={4}>
        <VStack gap={3}>
          <Heading level={5}>修改密码</Heading>
          <Text size="sm" color="secondary">
            修改登录密码（下次登录生效）
          </Text>
          <TextInput
            label="当前密码"
            type="password"
            value={currentPassword}
            onChange={setCurrentPassword}
            width="100%"
            placeholder="请输入当前密码"
          />
          <TextInput
            label="新密码"
            type="password"
            value={newPassword}
            onChange={setNewPassword}
            width="100%"
            placeholder="至少 6 位"
          />
          <TextInput
            label="确认新密码"
            type="password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            width="100%"
            placeholder="再次输入新密码"
          />
          <HStack gap={2} align="center">
            <Button
              label="修改密码"
              variant="primary"
              size="sm"
              isLoading={passwordSaving}
              isDisabled={!currentPassword || !newPassword || !confirmPassword}
              onClick={handleSavePassword}
            />
            {passwordMsg && (
              <Text
                size="sm"
                className={
                  passwordMsg.type === 'success'
                    ? 'text-success'
                    : 'text-danger'
                }
              >
                {passwordMsg.text}
              </Text>
            )}
          </HStack>
        </VStack>
      </Card>
    </VStack>
  );
}
