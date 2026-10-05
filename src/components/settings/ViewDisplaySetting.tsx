'use client';

import { useToast } from '@astryxdesign/core/Toast';
import { VStack } from '@astryxdesign/core/VStack';
import { useEffect, useState } from 'react';
import { CARD_SIMPLE_MODE_EVENT } from '@/components/layout/card-view-events';
import { SwitchSettingRow } from '@/components/settings/SwitchSettingRow';
import { useWidgetBarVisibility } from '@/hooks/useWidgetBarVisibility';
import { preferencesApi } from '@/services';

interface ViewDisplaySettingProps {
  /** 卡片简洁模式（SSR 初始值，与工具栏同源） */
  initialCardSimpleMode: boolean;
}

/**
 * 视图显示开关（外观快捷面板「显示」分区）
 *
 * - 卡片简洁模式：乐观更新 + 持久化失败回滚，事件同步主页与工具栏
 * - Widget 横条显隐：localStorage 共享 store，工具栏与 WidgetBar 即时同步
 */
export function ViewDisplaySetting({
  initialCardSimpleMode,
}: ViewDisplaySettingProps) {
  const showToast = useToast();
  const [simpleMode, setSimpleMode] = useState(initialCardSimpleMode);
  const { visible: widgetBarVisible, setVisible: setWidgetBarVisible } =
    useWidgetBarVisibility();

  // 外部（如工具栏按钮）切换后保持开关同步：与 HomeContent/工具栏共用同一事件总线
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<boolean>).detail;
      if (typeof detail === 'boolean') setSimpleMode(detail);
    };
    window.addEventListener(CARD_SIMPLE_MODE_EVENT, handler);
    return () => window.removeEventListener(CARD_SIMPLE_MODE_EVENT, handler);
  }, []);

  const handleSimpleModeChange = async (checked: boolean) => {
    setSimpleMode(checked);
    window.dispatchEvent(
      new CustomEvent(CARD_SIMPLE_MODE_EVENT, { detail: checked }),
    );
    try {
      await preferencesApi.update('cardSimpleMode', checked);
    } catch {
      // 回滚到本次请求的严格反值：prev 可能已被后续请求覆盖
      setSimpleMode(!checked);
      window.dispatchEvent(
        new CustomEvent(CARD_SIMPLE_MODE_EVENT, { detail: !checked }),
      );
      showToast({ body: '简洁模式未保存到服务端', type: 'error' });
    }
  };

  return (
    <VStack gap={4}>
      <SwitchSettingRow
        label="卡片简洁模式"
        description="卡片仅显示图标，隐藏名称"
        switchLabel="切换卡片简洁模式"
        checked={simpleMode}
        onChange={handleSimpleModeChange}
      />
      <SwitchSettingRow
        label="Widget 横条"
        description="显示时钟下方的 widget 状态横条"
        switchLabel="显示 Widget 横条"
        checked={widgetBarVisible}
        onChange={setWidgetBarVisible}
      />
    </VStack>
  );
}
