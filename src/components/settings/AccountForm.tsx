'use client';

import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Divider } from '@astryxdesign/core/Divider';
import { HStack } from '@astryxdesign/core/HStack';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { VStack } from '@astryxdesign/core/VStack';
import { useEffect, useState } from 'react';

/**
 * 账号设置（Linear / Vercel 风格）
 *
 * 仅管理用户名。密码修改见 PasswordForm。
 */
export function AccountForm() {
  const [username, setUsername] = useState('');
  const [originalUsername, setOriginalUsername] = useState('');
  const [usernameSaving, setUsernameSaving] = useState(false);
  const [usernameMsg, setUsernameMsg] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

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

  const isDirty = username.trim() !== originalUsername && !!username.trim();

  const handleSaveUsername = async () => {
    if (!isDirty) return;
    setUsernameSaving(true);
    setUsernameMsg(null);
    try {
      const res = await fetch('/api/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim() }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setUsernameMsg({ type: 'error', text: data.error ?? '保存失败' });
      } else {
        setOriginalUsername(username.trim());
        setUsernameMsg({ type: 'success', text: '已保存' });
      }
    } catch {
      setUsernameMsg({ type: 'error', text: '网络错误' });
    } finally {
      setUsernameSaving(false);
    }
  };

  const handleReset = () => {
    setUsername(originalUsername);
    setUsernameMsg(null);
  };

  return (
    <Card padding={5} variant="default">
      <VStack gap={5}>
        {/* Section header */}
        <VStack gap={1}>
          <Heading level={5}>账号</Heading>
          <Text size="sm" color="secondary">
            管理登录用户名
          </Text>
        </VStack>

        <Divider />

        {/* 用户名 */}
        <VStack gap={2}>
          <Text size="sm" weight="medium">
            用户名
          </Text>
          <TextInput
            label="用户名"
            isLabelHidden
            value={username}
            onChange={setUsername}
            width="100%"
            hasClear
          />
          <Text size="2xs" color="secondary">
            下次登录生效
          </Text>
        </VStack>

        <Divider />

        {/* 底部保存栏 */}
        <HStack gap={2} justify="between" align="center">
          {usernameMsg ? (
            <Text
              size="2xs"
              className={
                usernameMsg.type === 'success'
                  ? 'text-success'
                  : 'text-danger'
              }
            >
              {usernameMsg.text}
            </Text>
          ) : (
            <span />
          )}
          <HStack gap={2}>
            <Button
              label="撤销"
              variant="ghost"
              size="sm"
              isDisabled={!isDirty || usernameSaving}
              onClick={handleReset}
            />
            <Button
              label="保存"
              variant="primary"
              size="sm"
              isLoading={usernameSaving}
              isDisabled={!isDirty}
              onClick={handleSaveUsername}
            />
          </HStack>
        </HStack>
      </VStack>
    </Card>
  );
}
