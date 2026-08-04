'use client';

import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Spinner } from '@astryxdesign/core/Spinner';
import { TextInput } from '@astryxdesign/core/TextInput';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useState } from 'react';

/**
 * 登录表单（Client Component）
 *
 * 需要 client 的原因：
 * - useRouter / useSearchParams（next/navigation 客户端 hook）
 * - signIn（next-auth/react 客户端 API）
 * - useState 管理表单字段和 loading 状态
 */
export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get('callbackUrl') || '/';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // 字段失焦/提交后标记为 touched，触发 inline 错误展示
  const [touched, setTouched] = useState({ username: false, password: false });

  const usernameError =
    touched.username && !username.trim() ? '请输入用户名' : '';
  const passwordError =
    touched.password && !password.trim() ? '请输入密码' : '';
  // 整体可提交：字段都非空且无字段错误
  const canSubmit =
    !isLoading && username.trim().length > 0 && password.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // 提交前把所有字段标记 touched，触发字段错误显示
    setTouched({ username: true, password: true });
    if (!canSubmit) return;

    setIsLoading(true);
    setError('');
    try {
      const res = await signIn('credentials', {
        username,
        password,
        redirect: false,
      });
      if (res?.error) {
        setError('用户名或密码错误');
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setError('登录失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-dvh items-center justify-center p-8">
      <Card className="p-8 w-full max-w-sm flex flex-col gap-6">
        <div className="flex flex-col items-center gap-1">
          <h1 className="text-2xl font-bold">NavDeck</h1>
          <p className="text-secondary text-sm">请登录以继续</p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <TextInput
            label="用户名"
            value={username}
            onChange={(v) => setUsername(v)}
            onBlur={() => setTouched((t) => ({ ...t, username: true }))}
            htmlName="username"
            isRequired
            hasAutoFocus
            placeholder="请输入用户名"
            status={usernameError ? { type: 'error', message: usernameError } : undefined}
          />
          <TextInput
            label="密码"
            type="password"
            value={password}
            onChange={(v) => setPassword(v)}
            onBlur={() => setTouched((t) => ({ ...t, password: true }))}
            htmlName="password"
            isRequired
            placeholder="请输入密码"
            status={passwordError ? { type: 'error', message: passwordError } : undefined}
          />
          {error && (
            <p className="text-danger text-sm" role="alert">
              {error}
            </p>
          )}
          <Button
            label="登录"
            type="submit"
            variant="primary"
            width="100%"
            isLoading={isLoading}
            isDisabled={!canSubmit}
          />
        </form>
      </Card>
    </main>
  );
}

/** 登录表单 Suspense fallback（替代 null，避免空白屏） */
export function LoginFormFallback() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-8">
      <Card className="p-8 w-full max-w-sm flex flex-col items-center gap-4">
        <Spinner size="lg" />
        <p className="text-secondary text-sm">加载中…</p>
      </Card>
    </main>
  );
}
