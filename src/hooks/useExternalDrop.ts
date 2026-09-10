/**
 * 监听浏览器原生拖放（地址栏 / 书签栏 / 网页链接拖入）
 *
 * - dragover / dragenter → 设置 isDragOver（显示放置提示层）
 * - dragleave / drop     → 清除 isDragOver
 * - drop → 从 dataTransfer 提取 URL，回调 onDropUrl
 *
 * 注意：dnd-kit 排序用 pointer events，不触发原生 drag 事件；但卡片本身
 * 是 <a>，普通模式抓取卡片走浏览器原生链接拖拽，drop 携带卡片自身 URL。
 * 用 window dragstart（只有页内元素能发起）标记内部拖拽，drop 时忽略，
 * 只有真正从外部拖入的链接才触发快速创建。
 */
import { useEffect, useRef, useState } from 'react';

/** 从 dataTransfer 提取有效 HTTP(S) URL，无则返回 null */
function extractUrl(dt: DataTransfer): string | null {
  // 优先 text/uri-list（标准链接拖拽 MIME），可能有 # 注释行
  const uriList = dt.getData('text/uri-list');
  if (uriList) {
    const line = uriList
      .split('\n')
      .map((l) => l.trim())
      .find((l) => l && !l.startsWith('#'));
    if (line) {
      try {
        const u = new URL(line);
        if (u.protocol === 'http:' || u.protocol === 'https:') return u.href;
      } catch {
        // 不是合法 URL，继续 fallback
      }
    }
  }

  // fallback: text/plain（部分浏览器拖纯文本链接）
  const text = dt.getData('text/plain');
  if (text) {
    try {
      const u = new URL(text.trim());
      if (u.protocol === 'http:' || u.protocol === 'https:') return u.href;
    } catch {
      // 不是 URL
    }
  }

  return null;
}

interface UseExternalDropOptions {
  /** 拖放释放时回调（仅当包含有效 URL 时触发） */
  onDropUrl: (url: string) => void;
}

/** 返回 isDragOver 供渲染放置提示层 */
export function useExternalDrop({ onDropUrl }: UseExternalDropOptions) {
  const [isDragOver, setIsDragOver] = useState(false);
  // dragenter/dragleave 在子元素间穿梭时会连续触发，用计数器防闪烁
  const dragDepth = useRef(0);
  // 拖拽是否源自页内（如抓取卡片链接）。外部拖入不经过本页 dragstart
  const draggingInternal = useRef(false);
  const onDropUrlRef = useRef(onDropUrl);
  onDropUrlRef.current = onDropUrl;

  useEffect(() => {
    const hasFile = (e: DragEvent) =>
      Array.from(e.dataTransfer?.types ?? []).includes('Files');

    const handleDragStart = () => {
      draggingInternal.current = true;
    };

    const handleDragEnd = () => {
      draggingInternal.current = false;
    };

    const handleDragEnter = (e: DragEvent) => {
      // 含文件的拖入（如图片拖入 IconPicker 上传）不拦截
      // 页内拖拽不显示「放置创建」提示层
      if (hasFile(e) || draggingInternal.current) return;
      e.preventDefault();
      dragDepth.current++;
      setIsDragOver(true);
    };

    const handleDragOver = (e: DragEvent) => {
      if (hasFile(e)) return;
      // 必须阻止默认行为才能触发 drop
      e.preventDefault();
    };

    const handleDragLeave = (e: DragEvent) => {
      if (hasFile(e)) return;
      dragDepth.current--;
      if (dragDepth.current <= 0) {
        dragDepth.current = 0;
        setIsDragOver(false);
      }
    };

    const handleDrop = (e: DragEvent) => {
      if (hasFile(e)) return;
      e.preventDefault();
      dragDepth.current = 0;
      setIsDragOver(false);
      if (draggingInternal.current) {
        // 页内拖拽（如拖动卡片）不是外部链接，不触发快速创建；
        // 仍 preventDefault 阻止浏览器默认的拖放导航
        draggingInternal.current = false;
        return;
      }
      const url = e.dataTransfer ? extractUrl(e.dataTransfer) : null;
      if (url) onDropUrlRef.current(url);
    };

    window.addEventListener('dragstart', handleDragStart);
    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);
    window.addEventListener('dragend', handleDragEnd);
    return () => {
      window.removeEventListener('dragstart', handleDragStart);
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
      window.removeEventListener('dragend', handleDragEnd);
    };
  }, []);

  return { isDragOver };
}
