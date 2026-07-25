import Link from 'next/link';
import {HStack} from '@astryxdesign/core/HStack';
import {IconButton} from '@astryxdesign/core/IconButton';
import {Settings, PanelRight, Command} from 'lucide-react';

/**
 * 右上角浮动工具栏（floating pill）
 * - position: fixed，脱离居中容器
 * - 贴近视口右上角（top-6 right-6）
 * - 胶囊容器：毛玻璃 + 圆角 999 + hairline 边框 + 阴影
 *
 * 元素从左到右：
 * 1. NAS 状态圆点占位（M1.7 接入真实数据）
 * 2. 网络模式开关占位（M1.6 接入三态切换）
 * 3. hairline 分隔
 * 4. Cmd+K 入口（M1.8 接入 Modal）
 * 5. widget 栏切换
 * 6. 设置
 */
export function FloatingToolbar() {
  return (
    <HStack
      gap={1}
      align="center"
      className="fixed top-6 right-6 z-50 rounded-full bg-surface/80 backdrop-blur-md border border-border shadow-md px-3 py-1.5"
    >
      {/* NAS 状态圆点占位 */}
      <NasStatusDot />

      {/* 网络模式开关占位 */}
      <NetworkModePlaceholder />

      {/* hairline 分隔 */}
      <span className="mx-2 h-5 w-px bg-border" aria-hidden />

      {/* 工具按钮组 */}
      <IconButton
        label="快捷启动器"
        icon={<Command size={16} />}
        variant="ghost"
        tooltip="Cmd+K"
      />
      <IconButton
        label="切换 widget 栏"
        icon={<PanelRight size={16} />}
        variant="ghost"
        tooltip="显示/隐藏 widget 栏"
      />
      <Link href="/settings">
        <IconButton
          label="设置"
          icon={<Settings size={16} />}
          variant="ghost"
          tooltip="设置"
        />
      </Link>
    </HStack>
  );
}

/** NAS 状态圆点占位（M1.7 接入真实数据，绿/灰） */
function NasStatusDot() {
  return (
    <span
      className="inline-block w-2 h-2 rounded-full bg-success"
      title="NAS 状态"
    />
  );
}

/** 网络模式开关占位（M1.6 接入三态 segmented control） */
function NetworkModePlaceholder() {
  return (
    <span className="text-xs text-secondary px-2 py-1 rounded-md" title="网络模式">
      Auto
    </span>
  );
}
