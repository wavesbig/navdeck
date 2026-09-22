/**
 * 监听页面级粘贴（Ctrl+V），剪贴板为链接时快速创建卡片
 *
 * 焦点在输入框 / 多行文本 / contentEditable 内时不拦截，
 * 保证表单粘贴等常规行为不受影响。
 */
import { useEffect, useRef } from 'react';
import { extractUrl } from './useExternalDrop';

/** 粘贴释放时回调（仅当剪贴板包含有效 URL 时触发） */
export function useExternalPaste({
  onPasteUrl,
}: {
  onPasteUrl: (url: string) => void;
}) {
  const onPasteUrlRef = useRef(onPasteUrl);
  useEffect(() => {
    onPasteUrlRef.current = onPasteUrl;
  });

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      // 焦点在可编辑元素内：走常规粘贴，不触发快速创建
      if (target?.closest('input, textarea, [contenteditable="true"]')) {
        return;
      }
      const dt = e.clipboardData;
      if (!dt) return;
      const url = extractUrl(dt);
      if (url) onPasteUrlRef.current(url);
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);
}
