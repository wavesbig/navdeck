'use client';

import { Card } from '@astryxdesign/core/Card';
import { Dialog } from '@astryxdesign/core/Dialog';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import {
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Layers,
  Network,
  RefreshCw,
  Search,
  Server,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { WIDGET_CONFIG_OPEN_EVENT } from '@/components/widgets/widget-events';
import { DIALOG_WIDTH } from '@/lib/design-tokens';
import { portsApi } from '@/services/ports';
import { preferencesApi } from '@/services/preferences';
import type { OccupiedPort, PortStatusResult, WidgetSize } from '@/types';

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

  // 用户首选项（地址复制格式：'ip-port' | 'url'）
  const { data: prefs } = useSWR(preferencesApi.getKey, preferencesApi.get);
  const addressFormat = prefs?.portAddressFormat ?? 'ip-port';

  // 智能推断当前生效的 IP/Host（访问 hostname 优先，localhost 回退服务端局域网 IP）
  const effectiveHost = useMemo(() => {
    if (typeof window !== 'undefined') {
      const h = window.location.hostname;
      if (h && h !== 'localhost' && h !== '127.0.0.1') {
        return h;
      }
    }
    return data?.hostIp || '127.0.0.1';
  }, [data?.hostIp]);

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
        onRefresh={() => void mutate()}
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
 * 点开弹窗：展示所有占用的端口及对应的服务
 */
function PortDetailDialog({
  isOpen,
  onOpenChange,
  data,
  effectiveHost,
  addressFormat = 'ip-port',
  onRefresh,
  onGoToSettings,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  data: PortStatusResult | null;
  effectiveHost: string;
  addressFormat?: 'ip-port' | 'url';
  onRefresh: () => void;
  onGoToSettings: () => void;
}) {
  const [search, setSearch] = useState('');
  const [copyFormat, setCopyFormat] = useState<'ip-port' | 'url'>(
    addressFormat ?? 'ip-port',
  );
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

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
          <div className="mx-4 mt-3 p-3 rounded-panel border border-accent/20 bg-accent/5 flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <CheckCircle2 size={16} className="text-accent shrink-0" />
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xs text-secondary">
                    系统推荐下一个可用端口：
                  </span>
                  <span className="nas-widget-value text-accent text-lg leading-none">
                    {data.recommendedPort}
                  </span>
                </div>
                <div className="text-[11px] text-tertiary font-mono mt-1">
                  {copyFormat === 'url' ? 'http://' : ''}
                  {effectiveHost}:{data.recommendedPort}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleCopy(data.recommendedPort, copyFormat)}
                className="px-2.5 py-1 text-xs rounded-control bg-accent/15 text-accent border border-accent/30 hover:bg-accent/25 transition-colors flex items-center gap-1 cursor-pointer font-mono font-medium"
                title={`复制 ${copyFormat === 'url' ? 'http://' : ''}${effectiveHost}:${data.recommendedPort}`}
              >
                {copiedKey === `${data.recommendedPort}-${copyFormat}` ? (
                  <>
                    <Check size={12} className="text-success" /> 已复制{' '}
                    {copyFormat === 'url' ? 'URL' : 'IP:端口'}
                  </>
                ) : (
                  <>
                    <Copy size={12} /> 复制{' '}
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
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary"
            />
            <input
              type="text"
              placeholder="搜索端口号或服务名称..."
              aria-label="搜索端口号或服务名称"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-control border border-border bg-surface outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            />
          </div>

          <div className="flex items-center gap-1 bg-surface-raised p-0.5 rounded-control border border-border/80 text-[11px] shrink-0">
            <span className="text-[10px] text-tertiary pl-1 pr-0.5">
              复制格式:
            </span>
            <button
              type="button"
              onClick={() => setCopyFormat('ip-port')}
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
              onClick={() => setCopyFormat('url')}
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
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-2 space-y-1.5 max-h-[380px]">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-xs text-tertiary">
              {search ? '没有匹配的端口' : '暂无占用的端口记录'}
            </div>
          ) : (
            filtered.map((item) => (
              <button
                type="button"
                key={`${item.port}-${item.name}`}
                onClick={() => handleCopy(item.port)}
                className="group w-full text-left flex items-center justify-between p-2.5 rounded-panel border border-border/60 hover:border-accent/40 bg-surface hover:bg-surface-raised transition-colors cursor-pointer outline-none focus-ring"
                title={`点击复制 ${
                  copyFormat === 'url'
                    ? `http://${effectiveHost}:${item.port}`
                    : `${effectiveHost}:${item.port}`
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-14 px-2 py-1 rounded-control bg-surface-raised group-hover:bg-accent/10 border border-border/50 font-mono font-bold text-xs text-center text-accent shrink-0 transition-colors">
                    {item.port}
                  </span>

                  <div className="min-w-0">
                    <div className="text-xs font-medium text-foreground truncate group-hover:text-accent transition-colors">
                      {item.name}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-tertiary">
                      <span className="inline-flex items-center gap-1">
                        {item.type === 'docker' ? (
                          <>
                            <Server size={10} />
                            Docker 容器
                          </>
                        ) : (
                          <>
                            <Layers size={10} />
                            服务卡片
                          </>
                        )}
                      </span>
                      {item.protocol && (
                        <span className="uppercase font-mono px-1 rounded-control bg-border/40">
                          {item.protocol}
                        </span>
                      )}
                      {item.status && (
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            item.status === 'running'
                              ? 'bg-success'
                              : 'bg-warning'
                          }`}
                        />
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 pl-2">
                  {copiedKey === `${item.port}-${copyFormat}` ? (
                    <span className="text-[11px] text-success font-medium flex items-center gap-0.5">
                      <Check size={12} /> 已复制
                    </span>
                  ) : (
                    <span className="text-tertiary group-hover:text-accent text-[11px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                      <Copy size={12} />
                      <span>
                        {copyFormat === 'url' ? '复制 URL' : '复制 IP:端口'}
                      </span>
                    </span>
                  )}
                </div>
              </button>
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
