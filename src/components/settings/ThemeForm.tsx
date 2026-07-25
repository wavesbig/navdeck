'use client';

import {useState} from 'react';
import {Card} from '@astryxdesign/core/Card';
import {VStack} from '@astryxdesign/core/VStack';
import {HStack} from '@astryxdesign/core/HStack';
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {RadioList} from '@astryxdesign/core/RadioList';
import {RadioListItem} from '@astryxdesign/core/RadioList';
import {useTheme} from '@/hooks/useTheme';
import type {ThemeMode} from '@/types';

interface ThemeFormProps {
  /** SSR 时从 UserPreference 读取的初始值（保留以兼容页面调用，实际值由 useTheme 从 localStorage 读取） */
  initialMode?: ThemeMode;
}

/**
 * 主题切换表单
 *
 * - 三档 radio：light / dark / system
 * - 选中即立即 PATCH /api/preferences 持久化
 * - 通过 useTheme 共享状态：FloatingToolbar 切换时此处也会同步
 *
 * 注：mode 由 useTheme hook 持有（监听 localStorage + 'theme-change' 事件）；
 *     initialMode 仅作 SSR 兜底，client 端 hydrate 后会被 localStorage 覆盖
 */
export function ThemeForm({initialMode}: ThemeFormProps) {
  void initialMode; // 显式忽略：保留 prop 兼容现有调用
  const {mode, setMode} = useTheme();
  const [msg, setMsg] = useState<{type: 'success' | 'error'; text: string} | null>(null);

  const handleChange = async (value: string) => {
    const newMode = value as ThemeMode;
    setMode(newMode);
    setMsg(null);

    try {
      const res = await fetch('/api/preferences', {
        method: 'PATCH',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({key: 'theme', value: newMode}),
      });
      if (!res.ok) {
        setMsg({type: 'error', text: '保存失败'});
        return;
      }
      setMsg({type: 'success', text: '已保存'});
    } catch {
      setMsg({type: 'error', text: '网络错误'});
    }
  };

  return (
    <Card padding={4}>
      <VStack gap={3}>
        <Heading level={5}>主题</Heading>
        <Text size="sm" color="secondary">
          选择界面主题模式（系统模式会跟随操作系统的明暗设置）
        </Text>

        <RadioList
          label="主题模式"
          value={mode}
          onChange={handleChange}
          isLabelHidden
        >
          <RadioListItem
            value="light"
            label="明亮"
            description="始终使用明亮主题"
          />
          <RadioListItem
            value="dark"
            label="暗黑"
            description="始终使用暗黑主题"
          />
          <RadioListItem
            value="system"
            label="跟随系统"
            description="根据系统设置自动切换明暗"
          />
        </RadioList>

        <HStack gap={2} align="center">
          {msg && (
            <Text
              size="sm"
              className={msg.type === 'success' ? 'text-success' : 'text-danger'}
            >
              {msg.text}
            </Text>
          )}
        </HStack>
      </VStack>
    </Card>
  );
}
