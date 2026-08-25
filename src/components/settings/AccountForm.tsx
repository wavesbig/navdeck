'use client';

import { FormLayout } from '@astryxdesign/core/FormLayout';
import { TextInput } from '@astryxdesign/core/TextInput';
import { VStack } from '@astryxdesign/core/VStack';
import { useEffect, useState } from 'react';
import {
  type FormMessage,
  FormSaveBar,
} from '@/components/settings/FormSaveBar';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { ApiError } from '@/lib/request/ApiError';
import { accountApi } from '@/services';

/**
 * 账号设置
 *
 * 仅管理用户名。密码修改见 PasswordForm。
 */
export function AccountForm() {
  const [username, setUsername] = useState('');
  const [originalUsername, setOriginalUsername] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<FormMessage | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await accountApi.get();
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

  const handleSave = async () => {
    if (!isDirty) return;
    setSaving(true);
    setMessage(null);
    try {
      await accountApi.update({ username: username.trim() });
      setOriginalUsername(username.trim());
      setMessage({ type: 'success', text: '已保存' });
    } catch (e) {
      if (e instanceof ApiError && e.isNetworkError) {
        setMessage({ type: 'error', text: '网络错误' });
      } else {
        setMessage({
          type: 'error',
          text: e instanceof ApiError ? e.message : '保存失败',
        });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsSection title="账号" description="管理登录用户名">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleSave();
        }}
      >
        <VStack gap={5}>
          <FormLayout>
            <TextInput
              label="用户名"
              description="下次登录生效"
              value={username}
              onChange={setUsername}
              width="100%"
              hasClear
            />
          </FormLayout>

          <FormSaveBar
            message={message}
            isDirty={isDirty}
            saving={saving}
            onReset={() => {
              setUsername(originalUsername);
              setMessage(null);
            }}
          />
        </VStack>
      </form>
    </SettingsSection>
  );
}
