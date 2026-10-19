'use client';

import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Dialog } from '@astryxdesign/core/Dialog';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import {
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  Edit3,
  ExternalLink,
  Layers,
  Network,
  RefreshCw,
  RotateCcw,
  Search,
  Server,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import useSWR from 'swr';
import { WIDGET_CONFIG_OPEN_EVENT } from '@/components/widgets/widget-events';
import { DIALOG_WIDTH } from '@/lib/design-tokens';
import { portsApi } from '@/services/ports';
import { preferencesApi } from '@/services/preferences';
import type { OccupiedPort, PortStatusResult, WidgetSize } from '@/types';

export const PORT_COPY_FORMAT_STORAGE_KEY = 'navdeck:port-copy-format';

interface PortHelperProps {
  instanceId?: string;
  size?: WidgetSize;
  inEditMode?: boolean;
}

export function PortHelper({
  instanceId,
  size = 'M',
  inEditMode = false,
}: PortHelperProps) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [copiedType, setCopiedType] = useState<'ip-port' | 'url' | null>(null);

  // 监听右键菜单「端口速查」唤起弹窗事件
  useEffect(() => {
    const handleOpenModal = (event: Event) => {
      const detail = (event as CustomEvent<{ instanceId?: string }>).detail;
      if (
        !detail?.instanceId ||
        !instanceId ||
        detail.instanceId === instanceId
      ) {
        setModalOpen(true);
      }
    };

    window.addEventListener(WIDGET_CONFIG_OPEN_EVENT, handleOpenModal);
    return () => {
      window.removeEventListener(WIDGET_CONFIG_OPEN_EVENT, handleOpenModal);
    };
  }, [instanceId]);

  // 30 秒自动刷新一次端口状态
  const { data, mutate, isLoading } = useSWR<PortStatusResult>(
    '/api/ports',
    () => portsApi.getStatus(),
    { refreshInterval: 30_000 },
  );

  // 用户首选项（地址复制格式：'ip-port' | 'url'，自定义 IP）
  const { data: prefs, mutate: mutatePrefs } = useSWR(
    preferencesApi.getKey,
    preferencesApi.get,
  );
  const [localFormat, setLocalFormat] = useState<'ip-port' | 'url'>('ip-port');

  useEffect(() => {
    try {
      const cached = window.localStorage.getItem(PORT_COPY_FORMAT_STORAGE_KEY);
      if (cached === 'ip-port' || cached === 'url') {
        setLocalFormat(cached);
      }
    } catch {}
  }, []);

  const addressFormat: 'ip-port' | 'url' =
    prefs?.portAddressFormat ?? localFormat;

  const handleUpdateAddressFormat = useCallback(
    async (format: 'ip-port' | 'url') => {
      setLocalFormat(format);
      try {
        window.localStorage.setItem(PORT_COPY_FORMAT_STORAGE_KEY, format);
      } catch {}
      await preferencesApi.update('portAddressFormat', format);
      await mutatePrefs();
    },
    [mutatePrefs],
  );

  // 智能推断当前生效的 IP/Host（用户自定义优先 > 服务端内网 IP 优先 > 客户端 IP > 兜底 127.0.0.1）
  const effectiveHost = useMemo(() => {
    if (prefs?.portCustomIp?.trim()) {
      return prefs.portCustomIp.trim();
    }
    if (data?.hostIp) {
      return data.hostIp;
    }
    if (typeof window !== 'undefined') {
      const h = window.location.hostname;
      if (h && h !== 'localhost' && h !== '127.0.0.1') {
        return h;
      }
    }
    return '127.0.0.1';
  }, [prefs?.portCustomIp, data?.hostIp]);

  const handleCopy = (
    e: React.MouseEvent | null,
    port: number,
    type: 'ip-port' | 'url' = addressFormat,
  ) => {
    e?.stopPropagation();
    const text =
      type === 'url'
        ? `http://${effectiveHost}:${port}`
        : `${effectiveHost}:${port}`;
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const recommended = data?.recommendedPort ?? '...';
  const totalOccupied = data?.occupiedPorts.length ?? 0;
  const topPorts = (data?.occupiedPorts ?? []).slice(0, 3);

  return (
    <>
      {size === 'S' ? (
        <PortHelperCompact
          recommended={recommended}
          effectiveHost={effectiveHost}
          totalOccupied={totalOccupied}
          isLoading={isLoading}
          copiedType={copiedType}
          addressFormat={addressFormat}
          inEditMode={inEditMode}
          onOpenModal={() => setModalOpen(true)}
          onCopy={(e, type) =>
            data && handleCopy(e, data.recommendedPort, type)
          }
        />
      ) : (
        <PortHelperStandard
          recommended={recommended}
          effectiveHost={effectiveHost}
          totalOccupied={totalOccupied}
          topPorts={topPorts}
          isLoading={isLoading}
          copiedType={copiedType}
          addressFormat={addressFormat}
          inEditMode={inEditMode}
          onOpenModal={() => setModalOpen(true)}
          onCopy={(e, type) =>
            data && handleCopy(e, data.recommendedPort, type)
          }
        />
      )}

      {/* 弹窗：查看完整端口与对应服务 */}
      <PortDetailDialog
        isOpen={modalOpen}
        onOpenChange={setModalOpen}
        data={data ?? null}
        effectiveHost={effectiveHost}
        addressFormat={addressFormat}
        onUpdateAddressFormat={handleUpdateAddressFormat}
        customIp={prefs?.portCustomIp ?? ''}
        onRefresh={() => void mutate()}
        onUpdateCustomIp={async (newIp: string) => {
          await preferencesApi.update('portCustomIp', newIp);
          await mutatePrefs();
          void mutate();
        }}
        onGoToSettings={() => {
          setModalOpen(false);
          router.push('/settings/ports');
        }}
      />
    </>
  );
}

/** 顶栏眉标（M / L 档共享）：无图标，标准 widget-kicker */
function PortHelperHeader({ isLoading }: { isLoading: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="widget-kicker">端口助手</span>
      <HStack gap={1.5} align="center">
        <span
          className={`w-1.5 h-1.5 rounded-full bg-success ${
            isLoading ? 'animate-pulse' : ''
          }`}
        />
        <span className="nas-widget-legend">空闲推荐</span>
      </HStack>
    </div>
  );
}

/** S 档：紧凑小卡（96px），极简双行，避免任何截断 */
function PortHelperCompact({
  recommended,
  effectiveHost,
  totalOccupied,
  isLoading,
  copiedType,
  addressFormat,
  inEditMode,
  onOpenModal,
  onCopy,
}: {
  recommended: string | number;
  effectiveHost: string;
  totalOccupied: number;
  isLoading: boolean;
  copiedType: 'ip-port' | 'url' | null;
  addressFormat: 'ip-port' | 'url';
  inEditMode: boolean;
  onOpenModal: () => void;
  onCopy: (e: React.MouseEvent, type: 'ip-port' | 'url') => void;
}) {
  return (
    <Card
      className="widget-surface cursor-pointer select-none group transition-colors hover:border-accent/40 active:opacity-95"
      elevation="none"
      padding={4}
      onClick={() => {
        if (!inEditMode) onOpenModal();
      }}
    >
      <div className="h-full flex flex-col justify-between">
        {/* 顶栏眉标：无图标，统一为标准 widget-kicker */}
        <div className="flex items-center justify-between">
          <span className="widget-kicker truncate">端口助手</span>
          <HStack gap={1.5} align="center" className="shrink-0">
            <span
              className={`w-1.5 h-1.5 rounded-full bg-success ${
                isLoading ? 'animate-pulse' : ''
              }`}
            />
            <span className="nas-widget-legend">已用 {totalOccupied}</span>
          </HStack>
        </div>

        {/* 主内容行：KWGTDot47 点阵数字 + 统一格式复制按钮 */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-baseline min-w-0">
            <span
              className="nas-widget-value text-foreground group-hover:text-accent transition-colors leading-none"
              style={{ fontSize: '1.9rem' }}
            >
              {recommended}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={(e) => onCopy(e, addressFormat)}
              aria-label={`复制推荐 ${addressFormat === 'url' ? 'URL' : 'IP 和端口'}`}
              className="px-2.5 py-1 text-xs rounded-control bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors font-mono font-medium cursor-pointer"
              title={`复制 ${addressFormat === 'url' ? 'http://' : ''}${effectiveHost}:${recommended}`}
            >
              {copiedType === addressFormat
                ? '已复制'
                : addressFormat === 'url'
                  ? '复制 URL'
                  : '复制 IP:端口'}
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}

/** M 档：标准中卡（200px × 1 列），三段式空间均衡排布 */
function PortHelperStandard({
  recommended,
  effectiveHost,
  totalOccupied,
  topPorts,
  isLoading,
  copiedType,
  addressFormat,
  inEditMode,
  onOpenModal,
  onCopy,
}: {
  recommended: string | number;
  effectiveHost: string;
  totalOccupied: number;
  topPorts: OccupiedPort[];
  isLoading: boolean;
  copiedType: 'ip-port' | 'url' | null;
  addressFormat: 'ip-port' | 'url';
  inEditMode: boolean;
  onOpenModal: () => void;
  onCopy: (e: React.MouseEvent, type: 'ip-port' | 'url') => void;
}) {
  return (
    <Card
      className="widget-surface cursor-pointer select-none group transition-colors hover:border-accent/40 active:opacity-95"
      elevation="none"
      padding={4}
      onClick={() => {
        if (!inEditMode) onOpenModal();
      }}
    >
      <VStack gap={3} className="h-full justify-between">
        <PortHelperHeader isLoading={isLoading} />

        {/* 核心展示区：左右双指标，垂直自然舒展 */}
        <div className="grid grid-cols-2 gap-3 my-auto">
          {/* 左侧：推荐可用端口 */}
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] text-tertiary">推荐可用端口</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span
                className="nas-widget-value text-foreground group-hover:text-accent transition-colors"
                style={{ fontSize: '1.9rem' }}
              >
                {recommended}
              </span>
            </div>
            <span
              className="text-xs font-mono text-tertiary truncate mt-1.5"
              title={`${addressFormat === 'url' ? 'http://' : ''}${effectiveHost}:${recommended}`}
            >
              {addressFormat === 'url' ? 'http://' : ''}
              {effectiveHost}:{recommended}
            </span>
          </div>

          {/* 右侧：当前已占用概览 */}
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] text-tertiary">当前已占用</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span
                className="nas-widget-value text-foreground"
                style={{ fontSize: '1.9rem' }}
              >
                {totalOccupied}
              </span>
              <span className="text-xs text-tertiary">个</span>
            </div>
            <div className="flex gap-1.5 mt-1 overflow-hidden">
              {topPorts.slice(0, 3).map((p) => (
                <span
                  key={p.port}
                  className="px-1.5 py-0.5 rounded-control bg-surface-raised border border-border/50 text-[10px] font-mono text-secondary"
                >
                  {p.port}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* 底部操作与引导栏：充分利用卡片下部空间 */}
        <div className="flex items-center justify-between pt-2 border-t border-border/40">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => onCopy(e, addressFormat)}
              aria-label={`复制推荐 ${addressFormat === 'url' ? 'URL' : 'IP 和端口'}`}
              className="px-2.5 py-1 text-xs rounded-control bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors font-mono font-medium cursor-pointer"
              title={`复制 ${addressFormat === 'url' ? 'http://' : ''}${effectiveHost}:${recommended}`}
            >
              {copiedType === addressFormat
                ? '已复制'
                : addressFormat === 'url'
                  ? '复制 URL'
                  : '复制 IP:端口'}
            </button>
          </div>

          <span className="nas-widget-legend group-hover:text-accent transition-colors cursor-pointer">
            查看详情 &gt;
          </span>
        </div>
      </VStack>
    </Card>
  );
}

/**
 * 轻量内联主机 IP 选择与切换器（基于 React Portal 的毛玻璃浮层，绝不被任何容器截断）
 */
export function HostIpSelector({
  effectiveHost,
  customIp = '',
  suggestedIps = [],
  onUpdateIp,
}: {
  effectiveHost: string;
  customIp?: string;
  suggestedIps?: PortStatusResult['suggestedIps'];
  onUpdateIp?: (ip: string) => Promise<void>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isManualInput, setIsManualInput] = useState(false);
  const [manualValue, setManualValue] = useState(customIp || '');
  const [saving, setSaving] = useState(false);
  const [position, setPosition] = useState<{
    top: number;
    left: number;
    showAbove: boolean;
  }>({
    top: 0,
    left: 0,
    showAbove: false,
  });

  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [mountNode, setMountNode] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setManualValue(customIp || '');
  }, [customIp]);

  // 计算浮层位置与挂载目标（在 <dialog> 内部时必须挂在 <dialog> 上，才能进入浏览器的 Top Layer 避免被遮挡）
  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const showAbove = spaceBelow < 220 && rect.top > 220;

    setPosition({
      top: showAbove ? rect.top - 6 : rect.bottom + 6,
      left: Math.max(12, Math.min(rect.left, window.innerWidth - 330)),
      showAbove,
    });

    const target = buttonRef.current.closest('dialog') || document.body;
    setMountNode(target);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();

    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        buttonRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setIsOpen(false);
      setIsManualInput(false);
    };

    const handleScrollOrResize = () => {
      updatePosition();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, updatePosition]);

  const handleSelect = async (ip: string) => {
    if (!onUpdateIp) return;
    setSaving(true);
    try {
      await onUpdateIp(ip);
      setIsOpen(false);
      setIsManualInput(false);
    } catch (err) {
      console.error('更新 IP 失败', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          if (!isOpen) {
            updatePosition();
            setIsOpen(true);
            setIsManualInput(false);
            setManualValue(customIp || '');
          } else {
            setIsOpen(false);
          }
        }}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-control bg-surface hover:bg-surface-raised border border-border/80 hover:border-accent text-foreground text-sm font-mono font-medium transition-colors cursor-pointer group shadow-2xs"
        title="点击切换或修改局域网主机 IP"
      >
        <span>{effectiveHost}</span>
        <ChevronDown
          size={14}
          className={`text-tertiary group-hover:text-accent transition-transform duration-150 ${
            isOpen ? 'rotate-180 text-accent' : ''
          }`}
        />
      </button>

      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              top: position.showAbove ? undefined : position.top,
              bottom: position.showAbove
                ? window.innerHeight - position.top
                : undefined,
              left: position.left,
              zIndex: 99999,
            }}
            className="w-80 p-3 rounded-panel border border-border bg-surface-raised shadow-xl backdrop-blur-md flex flex-col gap-2.5 text-sm font-sans transition-[opacity,transform] duration-100"
          >
            <div className="flex items-center justify-between text-secondary px-1 pb-2 border-b border-border/50">
              <span className="font-semibold text-foreground text-sm">
                切换目标局域网 IP
              </span>
              {customIp ? (
                <span className="text-xs px-2 py-0.5 rounded-full bg-accent/15 text-accent font-medium border border-accent/20">
                  已自定义
                </span>
              ) : (
                <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success font-medium border border-success/20">
                  智能推断
                </span>
              )}
            </div>

            {/* 候选 IP 列表 */}
            {suggestedIps && suggestedIps.length > 0 && (
              <div className="flex flex-col gap-1 max-h-56 overflow-y-auto pr-0.5">
                {suggestedIps.map((s) => (
                  <button
                    key={`${s.source}-${s.ip}`}
                    type="button"
                    onClick={() => void handleSelect(s.ip)}
                    disabled={saving}
                    className={`w-full text-left px-3 py-2.5 rounded-control text-sm flex items-center justify-between transition-colors cursor-pointer disabled:opacity-50 ${
                      effectiveHost === s.ip
                        ? 'bg-accent/15 text-accent font-medium'
                        : 'hover:bg-surface text-secondary hover:text-foreground'
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      {effectiveHost === s.ip ? (
                        <Check size={16} className="text-accent shrink-0" />
                      ) : (
                        <span className="w-4 shrink-0" />
                      )}
                      <span className="font-mono text-sm font-semibold truncate">
                        {s.ip}
                      </span>
                    </span>
                    <span className="text-xs font-sans px-2 py-0.5 rounded-control bg-border/40 text-tertiary shrink-0 ml-2">
                      {s.label}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* 底部操作区：使用标准 Button 组件，替换下划线链接 */}
            {!isManualInput ? (
              <div className="pt-2.5 border-t border-border/50 flex items-center justify-between gap-2">
                <Button
                  label="手动输入 IP"
                  size="sm"
                  variant="secondary"
                  icon={<Edit3 size={14} />}
                  onClick={() => setIsManualInput(true)}
                />
                {Boolean(customIp) && (
                  <Button
                    label="恢复自动"
                    size="sm"
                    variant="ghost"
                    icon={<RotateCcw size={13} />}
                    onClick={() => void handleSelect('')}
                    isLoading={saving}
                  />
                )}
              </div>
            ) : (
              <div className="pt-2.5 border-t border-border/50 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="如 192.168.1.100"
                  aria-label="手动输入目标局域网 IP"
                  value={manualValue}
                  onChange={(e) => setManualValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void handleSelect(manualValue);
                    if (e.key === 'Escape') setIsManualInput(false);
                  }}
                  className="flex-1 px-3 py-1.5 text-sm font-mono rounded-control border border-border bg-surface outline-none focus:border-accent"
                />
                <Button
                  label="保存"
                  size="sm"
                  variant="primary"
                  onClick={() => void handleSelect(manualValue)}
                  isLoading={saving}
                />
                <Button
                  label="取消"
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsManualInput(false)}
                  isDisabled={saving}
                />
              </div>
            )}
          </div>,
          mountNode || buttonRef.current?.closest('dialog') || document.body,
        )}
    </>
  );
}

/**
 * 点开弹窗：展示所有占用的端口及对应的服务
 */
function PortDetailDialog({
  isOpen,
  onOpenChange,
  data,
  effectiveHost,
  addressFormat = 'ip-port',
  onUpdateAddressFormat,
  customIp = '',
  onRefresh,
  onUpdateCustomIp,
  onGoToSettings,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  data: PortStatusResult | null;
  effectiveHost: string;
  addressFormat?: 'ip-port' | 'url';
  onUpdateAddressFormat?: (format: 'ip-port' | 'url') => void | Promise<void>;
  customIp?: string;
  onRefresh: () => void;
  onUpdateCustomIp?: (newIp: string) => Promise<void>;
  onGoToSettings: () => void;
}) {
  const [search, setSearch] = useState('');
  const [copyFormat, setCopyFormat] = useState<'ip-port' | 'url'>(
    addressFormat ?? 'ip-port',
  );
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    setCopyFormat(addressFormat);
  }, [addressFormat]);

  const handleFormatChange = (fmt: 'ip-port' | 'url') => {
    setCopyFormat(fmt);
    try {
      window.localStorage.setItem(PORT_COPY_FORMAT_STORAGE_KEY, fmt);
    } catch {}
    void onUpdateAddressFormat?.(fmt);
  };

  const handleCopy = (port: number, format: 'ip-port' | 'url' = copyFormat) => {
    const text =
      format === 'url'
        ? `http://${effectiveHost}:${port}`
        : `${effectiveHost}:${port}`;
    navigator.clipboard.writeText(text);
    setCopiedKey(`${port}-${format}`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const filtered = useMemo(() => {
    if (!data?.occupiedPorts) return [];
    if (!search.trim()) return data.occupiedPorts;
    const q = search.toLowerCase().trim();
    return data.occupiedPorts.filter(
      (p) =>
        String(p.port).includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.protocol?.toLowerCase().includes(q),
    );
  }, [data, search]);

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      width={DIALOG_WIDTH.lg}
      aria-label="当前端口与服务速查"
      className="p-0 overflow-hidden"
    >
      <div className="flex flex-col max-h-[85vh] min-h-0">
        {/* 头部 */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-surface-raised/40 shrink-0">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-control bg-accent/10 text-accent">
              <Network size={18} />
            </span>
            <div>
              <h2 className="text-base font-semibold text-foreground">
                当前端口与服务速查
              </h2>
              <p className="text-xs text-tertiary">
                共占用 {data?.occupiedPorts.length ?? 0}{' '}
                个端口，点击条目可快速复制
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onRefresh}
              aria-label="刷新端口状态"
              className="p-1.5 rounded-control hover:bg-surface-raised text-tertiary hover:text-foreground transition-colors cursor-pointer"
              title="刷新"
            >
              <RefreshCw size={15} />
            </button>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              aria-label="关闭速查弹窗"
              className="p-1.5 rounded-control hover:bg-surface-raised text-tertiary hover:text-foreground transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* 推荐端口提示栏 */}
        {data && (
          <div className="mx-4 mt-3 p-3.5 rounded-panel border border-accent/20 bg-accent/5 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <CheckCircle2 size={18} className="text-accent shrink-0" />
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium text-secondary">
                    系统推荐下一个可用端口：
                  </span>
                  <span className="nas-widget-value text-accent text-xl leading-none">
                    {data.recommendedPort}
                  </span>
                </div>
                <div className="text-sm text-secondary font-mono mt-2 flex items-center gap-1.5 flex-wrap">
                  <span className="text-tertiary font-sans text-sm">
                    目标地址：
                  </span>
                  <span>{copyFormat === 'url' ? 'http://' : ''}</span>
                  <HostIpSelector
                    effectiveHost={effectiveHost}
                    customIp={customIp}
                    suggestedIps={data.suggestedIps}
                    onUpdateIp={onUpdateCustomIp}
                  />
                  <span>:{data.recommendedPort}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleCopy(data.recommendedPort, copyFormat)}
                className="px-3 py-1.5 text-xs rounded-control bg-accent/15 text-accent border border-accent/30 hover:bg-accent/25 transition-colors flex items-center gap-1.5 cursor-pointer font-mono font-medium"
                title={`复制 ${copyFormat === 'url' ? 'http://' : ''}${effectiveHost}:${data.recommendedPort}`}
              >
                {copiedKey === `${data.recommendedPort}-${copyFormat}` ? (
                  <>
                    <Check size={13} className="text-success" /> 已复制{' '}
                    {copyFormat === 'url' ? 'URL' : 'IP:端口'}
                  </>
                ) : (
                  <>
                    <Copy size={13} /> 复制{' '}
                    {copyFormat === 'url' ? 'URL' : 'IP:端口'}
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* 搜索框与复制格式切换 */}
        <div className="px-4 py-2 flex items-center justify-between gap-3 shrink-0">
          <div className="relative flex-1">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary"
            />
            <input
              type="text"
              placeholder="搜索端口号或服务名称..."
              aria-label="搜索端口号或服务名称"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8.5 pr-3 py-1.5 text-sm rounded-control border border-border bg-surface outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            />
          </div>

          <div className="flex items-center gap-1 bg-surface-raised p-1 rounded-control border border-border/80 text-xs shrink-0">
            <span className="text-xs text-tertiary pl-1 pr-0.5">复制格式:</span>
            <button
              type="button"
              onClick={() => handleFormatChange('ip-port')}
              className={`px-2 py-0.5 rounded-control transition-colors cursor-pointer ${
                copyFormat === 'ip-port'
                  ? 'bg-accent text-on-accent font-medium shadow-xs'
                  : 'text-secondary hover:text-foreground hover:bg-surface/60'
              }`}
            >
              IP:端口
            </button>
            <button
              type="button"
              onClick={() => handleFormatChange('url')}
              className={`px-2 py-0.5 rounded-control transition-colors cursor-pointer ${
                copyFormat === 'url'
                  ? 'bg-accent text-on-accent font-medium shadow-xs'
                  : 'text-secondary hover:text-foreground hover:bg-surface/60'
              }`}
            >
              http://URL
            </button>
          </div>
        </div>

        {/* 占用清单列表 */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-2 space-y-2 max-h-[380px]">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-tertiary">
              {search ? '没有匹配的端口' : '暂无占用的端口记录'}
            </div>
          ) : (
            filtered.map((item) => (
              <PortDetailRow
                key={`${item.port}-${item.name}`}
                item={item}
                copyFormat={copyFormat}
                effectiveHost={effectiveHost}
                isCopied={copiedKey === `${item.port}-${copyFormat}`}
                onCopy={handleCopy}
              />
            ))
          )}
        </div>

        {/* 底部 */}
        <div className="p-3 border-t border-border bg-surface-raised/40 flex items-center justify-between gap-3 text-xs text-tertiary shrink-0">
          <span className="truncate">
            提示：点击任意条目可按选定格式快速复制
          </span>
          <button
            type="button"
            onClick={onGoToSettings}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-control text-xs font-medium text-accent hover:text-accent-hover hover:bg-accent/10 transition-colors cursor-pointer shrink-0"
          >
            <span>管理面板</span>
            <ExternalLink size={12} />
          </button>
        </div>
      </div>
    </Dialog>
  );
}

function PortDetailRow({
  item,
  copyFormat,
  effectiveHost,
  isCopied,
  onCopy,
}: {
  item: OccupiedPort;
  copyFormat: 'ip-port' | 'url';
  effectiveHost: string;
  isCopied: boolean;
  onCopy: (port: number) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onCopy(item.port)}
      className="group w-full text-left flex items-center justify-between p-3 rounded-panel border border-border/60 hover:border-accent/40 bg-surface hover:bg-surface-raised transition-colors cursor-pointer outline-none focus-ring"
      title={`点击复制 ${
        copyFormat === 'url'
          ? `http://${effectiveHost}:${item.port}`
          : `${effectiveHost}:${item.port}`
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="w-14 px-2 py-1.5 rounded-control bg-surface-raised group-hover:bg-accent/10 border border-border/50 font-mono font-bold text-sm text-center text-accent shrink-0 transition-colors">
          {item.port}
        </span>

        <div className="min-w-0">
          <div className="text-sm font-medium text-foreground truncate group-hover:text-accent transition-colors">
            {item.name}
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-tertiary">
            <span className="inline-flex items-center gap-1">
              {item.type === 'docker' ? (
                <>
                  <Server size={12} />
                  Docker 容器
                </>
              ) : (
                <>
                  <Layers size={12} />
                  服务卡片
                </>
              )}
            </span>
            {item.protocol && (
              <span className="uppercase font-mono px-1.5 py-0.2 rounded-control bg-border/40 text-xs">
                {item.protocol}
              </span>
            )}
            {item.status && (
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  item.status === 'running' ? 'bg-success' : 'bg-warning'
                }`}
              />
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0 pl-2">
        {isCopied ? (
          <span className="text-xs text-success font-medium flex items-center gap-0.5">
            <Check size={13} /> 已复制
          </span>
        ) : (
          <span className="text-tertiary group-hover:text-accent text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
            <Copy size={13} />
            <span>{copyFormat === 'url' ? '复制 URL' : '复制 IP:端口'}</span>
          </span>
        )}
      </div>
    </button>
  );
}
