'use client';

import { Dialog } from '@astryxdesign/core/Dialog';
import { HStack } from '@astryxdesign/core/HStack';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { ExternalLink, MoveDiagonal2, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

/** 宽高持久化 key 与边界（右下角拖拽，居中弹框） */
const WIDTH_STORAGE_KEY = 'navdeck.card-preview-width';
const HEIGHT_STORAGE_KEY = 'navdeck.card-preview-height';
const MIN_WIDTH = 480;
const DEFAULT_WIDTH = 1100;
const MIN_IFRAME_HEIGHT = 320;

/** Dialog maxHeight 固定 75dvh，扣除头部/把手条/内边距后的 iframe 上限 */
function maxIframeHeight(): number {
  return window.innerHeight * 0.75 - 144;
}

/** iframe 默认高度（未拖拽过时与原 75dvh-110px 视觉一致） */
function defaultIframeHeight(): number {
  return window.innerHeight * 0.75 - 110;
}

function clampWidth(value: number): number {
  if (typeof window === 'undefined') return DEFAULT_WIDTH;
  return Math.min(Math.max(value, MIN_WIDTH), window.innerWidth - 48);
}

function clampIframeHeight(value: number): number {
  if (typeof window === 'undefined') return MIN_IFRAME_HEIGHT;
  return Math.min(Math.max(value, MIN_IFRAME_HEIGHT), maxIframeHeight());
}

/** 应用并持久化（拖拽结束 / 键盘调整共用） */
function persistWidth(value: number): number {
  const clamped = clampWidth(value);
  localStorage.setItem(WIDTH_STORAGE_KEY, String(clamped));
  return clamped;
}

function persistIframeHeight(value: number): number {
  const clamped = clampIframeHeight(value);
  localStorage.setItem(HEIGHT_STORAGE_KEY, String(clamped));
  return clamped;
}

interface CardPreviewDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  /** 卡片名（标题 + iframe title） */
  name: string;
  /** 嵌入地址（由父组件根据网络模式解析） */
  href: string;
}

/**
 * 卡片弹框预览（iframe 嵌入）
 *
 * 点击 / 右键「弹框打开」时使用，不跳转新标签页直接查看操作目标站点。
 * 右下角手柄支持四向拖拽调整宽高（横向调宽、纵向调高），
 * 尺寸持久化到 localStorage；手柄带移入高亮与拖拽中选中态。
 * 外部站点可能通过 X-Frame-Options / CSP frame-ancestors 拒绝嵌入，
 * 被拒时 iframe 空白，可用「新标签页打开」兜底。
 */
export function CardPreviewDialog({
  isOpen,
  onOpenChange,
  name,
  href,
}: CardPreviewDialogProps) {
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  // iframe 自身高度：null = 未拖拽过，用视口默认值
  const [iframeHeight, setIframeHeight] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragState = useRef<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);

  // 挂载后恢复上次尺寸（避免 SSR 读写 localStorage）
  useEffect(() => {
    const savedW = Number(localStorage.getItem(WIDTH_STORAGE_KEY));
    if (Number.isFinite(savedW) && savedW >= MIN_WIDTH) {
      setWidth(clampWidth(savedW));
    }
    const savedH = Number(localStorage.getItem(HEIGHT_STORAGE_KEY));
    setIframeHeight(
      clampIframeHeight(
        Number.isFinite(savedH) && savedH > 0 ? savedH : defaultIframeHeight(),
      ),
    );
  }, []);

  const onHandlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      dragState.current = {
        x: e.clientX,
        y: e.clientY,
        w: width,
        h: iframeHeight ?? defaultIframeHeight(),
      };
      setDragging(true);
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [width, iframeHeight],
  );

  const onHandlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragState.current;
      if (!drag) return;
      // 居中弹框宽高随光标 2 倍变化，右下缘贴合光标、对称扩展
      setWidth(clampWidth(drag.w + (e.clientX - drag.x) * 2));
      setIframeHeight(clampIframeHeight(drag.h + (e.clientY - drag.y) * 2));
    },
    [],
  );

  const onHandlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      dragState.current = null;
      setDragging(false);
      e.currentTarget.releasePointerCapture(e.pointerId);
      setWidth(persistWidth);
      setIframeHeight((h) => persistIframeHeight(h ?? defaultIframeHeight()));
    },
    [],
  );

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      aria-label={`${name} 弹框预览`}
      purpose="info"
      width={width}
      padding={4}
    >
      <VStack gap={4}>
        <HStack justify="between" align="center">
          <HStack gap={2} align="center" className="min-w-0">
            <Text size="base" weight="semibold" className="text-primary">
              {name}
            </Text>
            <span title={href} className="min-w-0 truncate">
              <Text size="sm" color="secondary">
                {href}
              </Text>
            </span>
          </HStack>
          <HStack gap={1} align="center">
            <IconButton
              label="新标签页打开"
              icon={<ExternalLink size={16} />}
              variant="ghost"
              onClick={() => window.open(href, '_blank', 'noopener,noreferrer')}
            />
            <IconButton
              label="关闭"
              icon={<X size={16} />}
              variant="ghost"
              onClick={() => onOpenChange(false)}
            />
          </HStack>
        </HStack>
        <iframe
          src={href}
          title={name}
          className="min-h-[320px] w-full rounded-widget border border-border bg-surface"
          style={iframeHeight !== null ? { height: iframeHeight } : undefined}
        />
        {/* 底部操作条：右下角拖拽手柄（横向调宽、纵向调高），小屏隐藏 */}
        <div className="flex h-9 items-center justify-end max-md:hidden">
          <div
            role="slider"
            aria-label="拖拽调整弹框大小"
            aria-orientation="horizontal"
            aria-valuemin={MIN_WIDTH}
            aria-valuemax={
              typeof window === 'undefined'
                ? DEFAULT_WIDTH
                : window.innerWidth - 48
            }
            aria-valuenow={width}
            tabIndex={0}
            title="拖拽调整大小（方向键微调）"
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') {
                setWidth((w) => persistWidth(w - 80));
              }
              if (e.key === 'ArrowRight') {
                setWidth((w) => persistWidth(w + 80));
              }
              if (e.key === 'ArrowUp') {
                setIframeHeight((h) =>
                  persistIframeHeight((h ?? defaultIframeHeight()) - 40),
                );
              }
              if (e.key === 'ArrowDown') {
                setIframeHeight((h) =>
                  persistIframeHeight((h ?? defaultIframeHeight()) + 40),
                );
              }
            }}
            onPointerDown={onHandlePointerDown}
            onPointerMove={onHandlePointerMove}
            onPointerUp={onHandlePointerUp}
            onPointerCancel={onHandlePointerUp}
            className={`flex h-9 w-9 cursor-nwse-resize touch-none items-center justify-center rounded-lg transition-[background-color,color,transform] duration-150 hover:bg-accent/10 hover:text-accent focus-visible:outline-2 focus-visible:outline-accent ${
              dragging ? 'scale-105 bg-accent/10 text-accent' : 'text-secondary'
            }`}
          >
            <MoveDiagonal2 size={20} />
          </div>
        </div>
      </VStack>
    </Dialog>
  );
}
