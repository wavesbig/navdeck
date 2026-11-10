'use client';

import { Button } from '@astryxdesign/core/Button';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { FormLayout } from '@astryxdesign/core/FormLayout';
import { HStack } from '@astryxdesign/core/HStack';
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { VStack } from '@astryxdesign/core/VStack';
import {
  Ban,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Layers,
  LayoutGrid,
  List,
  Plus,
  RefreshCw,
  Server,
  Tag,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { SettingsSection } from '@/components/settings/SettingsSection';
import {
  HostIpSelector,
  PORT_COPY_FORMAT_STORAGE_KEY,
  type PortCopyFormat,
} from '@/components/widgets/PortHelper';
import { DIALOG_WIDTH } from '@/lib/design-tokens';
import { portsApi } from '@/services/ports';
import { preferencesApi } from '@/services/preferences';
import type { OccupiedPort, PortStatusResult } from '@/types';

export function PortManager() {
  const { mutate } = useSWRConfig();
  const { data: prefs, mutate: mutatePrefs } = useSWR(
    preferencesApi.getKey,
    preferencesApi.get,
  );
  const [localFormat, setLocalFormat] = useState<PortCopyFormat>('ip-port');

  useEffect(() => {
    try {
      const cached = window.localStorage.getItem(PORT_COPY_FORMAT_STORAGE_KEY);
      if (cached === 'port' || cached === 'ip-port' || cached === 'url') {
        setLocalFormat(cached);
      }
    } catch {}
  }, []);

  const addressFormat: PortCopyFormat = prefs?.portAddressFormat ?? localFormat;

  const [data, setData] = useState<PortStatusResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [startPort, setStartPort] = useState(8000);
  const [searchQuery, setSearchQuery] = useState('');

  const handleAddressFormatChange = async (format: PortCopyFormat) => {
    setLocalFormat(format);
    try {
      window.localStorage.setItem(PORT_COPY_FORMAT_STORAGE_KEY, format);
    } catch {}
    await preferencesApi.update('portAddressFormat', format);
    void mutatePrefs();
  };

  // 智能推断当前生效的 IP/Host（自定义首选 > 接口返回内网 IP > 客户端实际 IP > 兜底 127.0.0.1）
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

  const handleSaveCustomIp = async (ipToSave: string) => {
    try {
      await preferencesApi.update('portCustomIp', ipToSave.trim());
      await mutatePrefs();
      void fetchStatus();
    } catch (err) {
      console.error('保存自定义 IP 失败', err);
    }
  };

  // 端口即时测试
  const [testPortInput, setTestPortInput] = useState('');
  const [testingPort, setTestingPort] = useState(false);
  const [testResult, setTestResult] = useState<{
    port: number;
    isAvailable: boolean;
    occupiedBy?: string;
  } | null>(null);

  // 手动标记占用端口弹窗
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualDefaultPort, setManualDefaultPort] = useState<number | null>(
    null,
  );

  const handleOpenManualModal = (defaultPort?: number) => {
    setManualDefaultPort(defaultPort ?? null);
    setManualModalOpen(true);
  };

  const handleSaveManualPort = async (item: {
    port?: number;
    portInput?: string;
    name?: string;
    note?: string;
    protocol?: string;
  }) => {
    await portsApi.addManualPort(item);
    await fetchStatus();
    if (item.port && testResult && testResult.port === item.port) {
      setTestResult({
        port: item.port,
        isAvailable: false,
        occupiedBy: item.name || '手动黑名单',
      });
    }
  };

  const handleQuickMark = async (input: number | string) => {
    const portInput = String(input).trim();
    if (!portInput) return;
    try {
      await portsApi.addManualPort({
        portInput,
        name: '手动黑名单',
      });
      await fetchStatus();
      const p = Number.parseInt(portInput, 10);
      if (!Number.isNaN(p)) {
        setTestResult({
          port: p,
          isAvailable: false,
          occupiedBy: '手动黑名单',
        });
      }
    } catch (err) {
      console.error('快速标记端口失败', err);
    }
  };

  const handleDeleteManualPort = async (port: number) => {
    try {
      await portsApi.deleteManualPort(port);
      await fetchStatus();
      if (testResult && testResult.port === port) {
        setTestResult(null);
      }
    } catch (err) {
      console.error('删除手动标记端口失败', err);
    }
  };

  const fetchStatus = useCallback(
    async (start = startPort) => {
      setLoading(true);
      try {
        const res = await portsApi.getStatus({ startPort: start });
        setData(res);
        void mutate('/api/ports');
      } catch (err) {
        console.error('获取端口信息失败', err);
      } finally {
        setLoading(false);
      }
    },
    [startPort, mutate],
  );

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  const handleCopy = (port: number, type: PortCopyFormat = addressFormat) => {
    const text =
      type === 'port'
        ? String(port)
        : type === 'url'
          ? `http://${effectiveHost}:${port}`
          : `${effectiveHost}:${port}`;
    navigator.clipboard.writeText(text);
    setCopiedKey(`${port}-${type}`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleTestPort = async () => {
    const port = Number.parseInt(testPortInput, 10);
    if (Number.isNaN(port) || port < 1 || port > 65535) {
      return;
    }
    setTestingPort(true);
    try {
      const res = await portsApi.getStatus({ checkPort: port });
      if (res.checkResult) {
        setTestResult(res.checkResult);
      }
    } catch (err) {
      console.error('测试端口失败', err);
    } finally {
      setTestingPort(false);
    }
  };

  // 端口列表展示状态：分类、排序、视图模式（表格 vs 卡片）
  const [activeCategory, setActiveCategory] = useState<
    'all' | 'docker' | 'card' | 'manual'
  >('all');
  const [sortOrder, setSortOrder] = useState<
    'port-asc' | 'port-desc' | 'name-asc'
  >('port-asc');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid');

  useEffect(() => {
    try {
      const cached = window.localStorage.getItem('navdeck:port-view-mode');
      if (cached === 'table' || cached === 'grid') {
        setViewMode(cached);
      }
    } catch {}
  }, []);

  const handleViewModeChange = (mode: 'table' | 'grid') => {
    setViewMode(mode);
    try {
      window.localStorage.setItem('navdeck:port-view-mode', mode);
    } catch {}
  };

  const counts = useMemo(() => {
    const list = data?.occupiedPorts ?? [];
    let docker = 0;
    let card = 0;
    let manual = 0;
    for (const item of list) {
      if (item.type === 'docker') docker++;
      else if (item.type === 'card') card++;
      else if (item.type === 'manual') manual++;
    }
    return {
      all: list.length,
      docker,
      card,
      manual,
    };
  }, [data?.occupiedPorts]);

  const filteredPorts = useMemo(() => {
    if (!data?.occupiedPorts) return [];
    let list = data.occupiedPorts;

    if (activeCategory !== 'all') {
      list = list.filter((p) => p.type === activeCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          String(p.port).includes(q) ||
          p.name.toLowerCase().includes(q) ||
          p.protocol?.toLowerCase().includes(q) ||
          p.note?.toLowerCase().includes(q),
      );
    }

    return [...list].sort((a, b) => {
      if (sortOrder === 'port-asc') return a.port - b.port;
      if (sortOrder === 'port-desc') return b.port - a.port;
      return a.name.localeCompare(b.name, 'zh-CN');
    });
  }, [data?.occupiedPorts, activeCategory, searchQuery, sortOrder]);

  return (
    <VStack gap={6}>
      {/* 推荐端口与速测区 */}
      <SettingsSection
        title="空闲端口推荐"
        description="基于当前 Docker 映射、卡片配置及本机网络探活计算"
        actions={
          <Button
            label="重新探测"
            size="sm"
            variant="secondary"
            onClick={() => void fetchStatus(startPort)}
            isLoading={loading}
            icon={<RefreshCw size={14} />}
          />
        }
      >
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <PortRecommendCard
            data={data}
            effectiveHost={effectiveHost}
            customIp={prefs?.portCustomIp}
            suggestedIps={data?.suggestedIps}
            startPort={startPort}
            copiedKey={copiedKey}
            addressFormat={addressFormat}
            onStartPortChange={setStartPort}
            onStartPortBlur={() => void fetchStatus(startPort)}
            onAddressFormatChange={handleAddressFormatChange}
            onUpdateIp={handleSaveCustomIp}
            onCopy={handleCopy}
            onQuickMark={handleQuickMark}
          />
          <PortTestCard
            testPortInput={testPortInput}
            testingPort={testingPort}
            testResult={testResult}
            onTestInputChange={setTestPortInput}
            onTest={handleTestPort}
            onQuickMark={handleQuickMark}
            onMarkAsOccupied={handleOpenManualModal}
            onUnmark={handleDeleteManualPort}
          />
        </div>
      </SettingsSection>

      {/* 占用清单 */}
      <SettingsSection
        title="当前占用端口与服务清单"
        description="汇总 Docker 映射、外部卡片及黑名单占用的全部端口"
        actions={
          <Button
            label="添加黑名单"
            size="sm"
            variant="secondary"
            onClick={() => handleOpenManualModal()}
            icon={<Plus size={14} />}
          />
        }
      >
        {/* 工具栏：分类筛选胶囊、搜索栏、排序与视图切换 */}
        <div className="flex flex-col gap-3 mb-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* 分类筛选胶囊：小屏允许顺畅横向滑动，隐藏原生滚动条 */}
            <div className="w-full lg:w-auto max-w-full overflow-x-auto scrollbar-none py-0.5">
              <div className="inline-flex items-center gap-1 bg-surface-raised p-1 rounded-panel border border-border/70 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveCategory('all')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-control transition-colors cursor-pointer shrink-0 ${
                    activeCategory === 'all'
                      ? 'bg-accent text-on-accent font-medium shadow-xs'
                      : 'text-secondary hover:text-foreground hover:bg-surface'
                  }`}
                >
                  <span>全部</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[11px] font-mono ${
                      activeCategory === 'all'
                        ? 'bg-on-accent/20 text-on-accent'
                        : 'bg-surface text-tertiary'
                    }`}
                  >
                    {counts.all}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCategory('docker')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-control transition-colors cursor-pointer shrink-0 ${
                    activeCategory === 'docker'
                      ? 'bg-accent text-on-accent font-medium shadow-xs'
                      : 'text-secondary hover:text-foreground hover:bg-surface'
                  }`}
                >
                  <Server size={13} />
                  <span>Docker 容器</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[11px] font-mono ${
                      activeCategory === 'docker'
                        ? 'bg-on-accent/20 text-on-accent'
                        : 'bg-surface text-tertiary'
                    }`}
                  >
                    {counts.docker}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCategory('card')}
                  title="首页添加的外部设备或宿主机非 Docker 服务端口"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-control transition-colors cursor-pointer shrink-0 ${
                    activeCategory === 'card'
                      ? 'bg-accent text-on-accent font-medium shadow-xs'
                      : 'text-secondary hover:text-foreground hover:bg-surface'
                  }`}
                >
                  <Layers size={13} />
                  <span>外部 / 其它服务</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[11px] font-mono ${
                      activeCategory === 'card'
                        ? 'bg-on-accent/20 text-on-accent'
                        : 'bg-surface text-tertiary'
                    }`}
                  >
                    {counts.card}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCategory('manual')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-control transition-colors cursor-pointer shrink-0 ${
                    activeCategory === 'manual'
                      ? 'bg-accent text-on-accent font-medium shadow-xs'
                      : 'text-secondary hover:text-foreground hover:bg-surface'
                  }`}
                >
                  <Tag size={13} />
                  <span>手动黑名单</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[11px] font-mono ${
                      activeCategory === 'manual'
                        ? 'bg-on-accent/20 text-on-accent'
                        : 'bg-surface text-tertiary'
                    }`}
                  >
                    {counts.manual}
                  </span>
                </button>
              </div>
            </div>

            {/* 搜索、排序与视图切换：小屏整齐自适应 */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full lg:w-auto">
              <div className="relative w-full sm:w-56">
                <input
                  type="text"
                  placeholder="搜索端口/服务/备注..."
                  aria-label="搜索占用端口或服务名称"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-control border border-border bg-surface outline-none focus:border-accent focus:ring-1 focus:ring-accent pr-7"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="清空搜索"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-tertiary hover:text-foreground cursor-pointer"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={sortOrder}
                  onChange={(e) =>
                    setSortOrder(
                      e.target.value as 'port-asc' | 'port-desc' | 'name-asc',
                    )
                  }
                  className="flex-1 sm:flex-none min-w-0 px-2.5 py-1.5 text-xs rounded-control border border-border bg-surface text-secondary hover:text-foreground outline-none cursor-pointer"
                  aria-label="端口列表排序方式"
                >
                  <option value="port-asc">端口升序 (1024 → 65535)</option>
                  <option value="port-desc">端口降序 (65535 → 1024)</option>
                  <option value="name-asc">服务名称 (A → Z)</option>
                </select>

                <div className="flex items-center bg-surface-raised p-0.5 rounded-control border border-border/80 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleViewModeChange('table')}
                    aria-label="表格列表视图"
                    className={`p-1.5 rounded-control transition-colors cursor-pointer ${
                      viewMode === 'table'
                        ? 'bg-surface text-accent shadow-xs'
                        : 'text-tertiary hover:text-foreground'
                    }`}
                    title="高密度表格视图"
                  >
                    <List size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleViewModeChange('grid')}
                    aria-label="卡片网格视图"
                    className={`p-1.5 rounded-control transition-colors cursor-pointer ${
                      viewMode === 'grid'
                        ? 'bg-surface text-accent shadow-xs'
                        : 'text-tertiary hover:text-foreground'
                    }`}
                    title="卡片网格视图"
                  >
                    <LayoutGrid size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {loading && !data ? (
          <div className="py-12 text-center text-sm text-tertiary">
            正在获取 Docker 容器及服务端口...
          </div>
        ) : filteredPorts.length === 0 ? (
          <div className="py-12 text-center text-sm text-tertiary">
            {searchQuery
              ? '没有找到匹配的端口'
              : activeCategory !== 'all'
                ? '该分类下暂无端口记录'
                : '暂无占用的端口记录'}
          </div>
        ) : viewMode === 'table' ? (
          <div className="rounded-panel border border-border/80 bg-surface divide-y divide-border/60 overflow-hidden shadow-xs">
            {filteredPorts.map((item) => (
              <PortTableRow
                key={`${item.port}-${item.name}`}
                item={item}
                effectiveHost={effectiveHost}
                copyFormat={addressFormat}
                onCopy={handleCopy}
                onDeleteManual={handleDeleteManualPort}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredPorts.map((item) => (
              <PortOccupiedCard
                key={`${item.port}-${item.name}`}
                item={item}
                effectiveHost={effectiveHost}
                copyFormat={addressFormat}
                onCopy={handleCopy}
                onDeleteManual={handleDeleteManualPort}
              />
            ))}
          </div>
        )}
      </SettingsSection>

      <ManualPortDialog
        isOpen={manualModalOpen}
        onOpenChange={setManualModalOpen}
        defaultPort={manualDefaultPort}
        onSave={handleSaveManualPort}
      />
    </VStack>
  );
}

function PortRecommendCard({
  data,
  effectiveHost,
  customIp,
  suggestedIps,
  startPort,
  copiedKey,
  addressFormat,
  onStartPortChange,
  onStartPortBlur,
  onAddressFormatChange,
  onUpdateIp,
  onCopy,
  onQuickMark,
}: {
  data: PortStatusResult | null;
  effectiveHost: string;
  customIp?: string;
  suggestedIps?: PortStatusResult['suggestedIps'];
  startPort: number;
  copiedKey: string | null;
  addressFormat: PortCopyFormat;
  onStartPortChange: (val: number) => void;
  onStartPortBlur: () => void;
  onAddressFormatChange: (fmt: PortCopyFormat) => void;
  onUpdateIp?: (ip: string) => Promise<void>;
  onCopy: (port: number, type?: PortCopyFormat) => void;
  onQuickMark?: (port: number | string) => void;
}) {
  const recommendedPort = data?.recommendedPort;
  return (
    <div className="p-4 sm:p-5 rounded-panel border border-border bg-surface-raised flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between gap-2">
          <Text className="text-secondary text-sm font-medium">
            当前推荐可用端口
          </Text>
          <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success font-medium border border-success/20 shrink-0">
            可直接分配
          </span>
        </div>

        <div className="flex items-baseline gap-3 my-2">
          <span
            className="nas-widget-value text-accent font-bold"
            style={{ fontSize: '2.4rem', lineHeight: 1 }}
          >
            {recommendedPort ?? '...'}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap mt-2">
          <span className="text-tertiary font-sans text-xs shrink-0">
            访问地址：
          </span>
          <div className="inline-flex items-center gap-1 max-w-full flex-wrap font-mono text-xs sm:text-sm bg-surface px-2 py-1 rounded-control border border-border/70">
            {addressFormat === 'url' && (
              <span className="text-tertiary shrink-0">http://</span>
            )}
            <HostIpSelector
              effectiveHost={effectiveHost}
              customIp={customIp}
              suggestedIps={suggestedIps}
              onUpdateIp={onUpdateIp}
            />
            <span className="text-foreground font-semibold shrink-0">
              :{recommendedPort ?? '...'}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-border/60 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-tertiary text-xs shrink-0">从端口起查:</span>
            <input
              type="number"
              min={1024}
              max={65535}
              aria-label="从指定起始端口起查"
              value={startPort}
              onChange={(e) =>
                onStartPortChange(Number(e.target.value) || 1024)
              }
              onBlur={onStartPortBlur}
              className="w-16 px-2 py-1 text-xs font-mono rounded-control border border-border bg-surface text-center outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            />
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-tertiary text-xs shrink-0">默认格式:</span>
            <div className="inline-flex items-center gap-0.5 bg-surface p-0.5 rounded-control border border-border/80 text-xs">
              <button
                type="button"
                onClick={() => onAddressFormatChange('port')}
                className={`px-2 py-0.5 rounded-control transition-colors cursor-pointer ${
                  addressFormat === 'port'
                    ? 'bg-accent text-on-accent font-medium shadow-xs'
                    : 'text-secondary hover:text-foreground hover:bg-surface-raised'
                }`}
                title="仅复制端口号 (例: 5244)"
              >
                端口
              </button>
              <button
                type="button"
                onClick={() => onAddressFormatChange('ip-port')}
                className={`px-2 py-0.5 rounded-control transition-colors cursor-pointer ${
                  addressFormat === 'ip-port'
                    ? 'bg-accent text-on-accent font-medium shadow-xs'
                    : 'text-secondary hover:text-foreground hover:bg-surface-raised'
                }`}
                title="复制纯 IP:端口 (例: 192.168.1.1:5244)"
              >
                IP:端口
              </button>
              <button
                type="button"
                onClick={() => onAddressFormatChange('url')}
                className={`px-2 py-0.5 rounded-control transition-colors cursor-pointer ${
                  addressFormat === 'url'
                    ? 'bg-accent text-on-accent font-medium shadow-xs'
                    : 'text-secondary hover:text-foreground hover:bg-surface-raised'
                }`}
                title="复制带协议完整 URL (例: http://192.168.1.1:5244)"
              >
                http://URL
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 justify-end pt-0.5">
          {data?.recommendedPort && onQuickMark && (
            <Button
              label="拉黑此端口"
              size="sm"
              variant="secondary"
              onClick={() => onQuickMark(data.recommendedPort)}
              icon={<Ban size={14} />}
            />
          )}
          <Button
            label={
              copiedKey === `${recommendedPort}-${addressFormat}`
                ? '已复制'
                : addressFormat === 'port'
                  ? '复制端口'
                  : addressFormat === 'url'
                    ? '复制 URL'
                    : '复制 IP:端口'
            }
            size="sm"
            variant="primary"
            onClick={() => data && onCopy(data.recommendedPort, addressFormat)}
            isDisabled={!data}
            icon={
              copiedKey === `${recommendedPort}-${addressFormat}` ? (
                <Check size={14} />
              ) : (
                <Copy size={14} />
              )
            }
          />
        </div>
      </div>
    </div>
  );
}

function PortTestCard({
  testPortInput,
  testingPort,
  testResult,
  onTestInputChange,
  onTest,
  onQuickMark,
  onMarkAsOccupied,
  onUnmark,
}: {
  testPortInput: string;
  testingPort: boolean;
  testResult: {
    port: number;
    isAvailable: boolean;
    occupiedBy?: string;
  } | null;
  onTestInputChange: (val: string) => void;
  onTest: () => void;
  onQuickMark?: (port: number | string) => void;
  onMarkAsOccupied?: (port: number) => void;
  onUnmark?: (port: number) => void;
}) {
  const isManualOccupied =
    Boolean(testResult?.occupiedBy?.includes('手动')) ||
    Boolean(testResult?.occupiedBy?.includes('黑名单'));

  return (
    <div className="p-4 sm:p-5 rounded-panel border border-border bg-surface-raised flex flex-col justify-between h-full">
      <div>
        <Text className="text-secondary text-sm font-medium">
          指定端口探测与黑名单
        </Text>
        <p className="text-tertiary text-xs mt-0.5">
          输入端口号可快速测试占用状态或加入黑名单
        </p>

        <div className="flex gap-2 mt-3">
          <input
            type="text"
            placeholder="如: 8001 或 8001,8002"
            aria-label="测试指定端口号"
            value={testPortInput}
            onChange={(e) => onTestInputChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void onTest()}
            className="flex-1 min-w-0 px-3 py-1.5 text-sm font-mono rounded-control border border-border bg-surface outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          />
          <Button
            label="探测"
            size="sm"
            variant="secondary"
            onClick={() => void onTest()}
            isLoading={testingPort}
            isDisabled={!testPortInput}
          />
        </div>
      </div>

      {testResult ? (
        <div
          className={`mt-4 p-2.5 rounded-panel border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
            testResult.isAvailable
              ? 'bg-success/10 border-success/20 text-success'
              : 'bg-error/10 border-error/20 text-error'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {testResult.isAvailable ? (
              <>
                <CheckCircle2 size={16} className="shrink-0" />
                <span className="truncate">
                  端口 <b>{testResult.port}</b> 当前空闲，可以使用！
                </span>
              </>
            ) : (
              <>
                <XCircle size={16} className="shrink-0" />
                <span className="truncate">
                  端口 <b>{testResult.port}</b> 已被占用
                  {testResult.occupiedBy ? `（${testResult.occupiedBy}）` : ''}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-1.5 justify-end shrink-0">
            {isManualOccupied ? (
              <Button
                label="移出黑名单"
                size="sm"
                variant="ghost"
                onClick={() => onUnmark?.(testResult.port)}
              />
            ) : (
              <>
                <Button
                  label="快速拉黑"
                  size="sm"
                  variant="secondary"
                  onClick={() => onQuickMark?.(testResult.port)}
                />
                <Button
                  label="详细标记"
                  size="sm"
                  variant="ghost"
                  onClick={() => onMarkAsOccupied?.(testResult.port)}
                />
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-4 pt-3 border-t border-border/30 flex items-center justify-between text-xs text-tertiary">
          <span>支持多端口批量探测（以逗号分隔）</span>
          <span className="font-mono">TCP / UDP</span>
        </div>
      )}
    </div>
  );
}

function PortTableRow({
  item,
  effectiveHost,
  copyFormat,
  onCopy,
  onDeleteManual,
}: {
  item: OccupiedPort;
  effectiveHost: string;
  copyFormat: PortCopyFormat;
  onCopy: (port: number, type?: PortCopyFormat) => void;
  onDeleteManual?: (port: number) => void;
}) {
  const isDocker = item.type === 'docker';
  const isManual = item.type === 'manual';
  const copyTarget =
    copyFormat === 'port'
      ? String(item.port)
      : copyFormat === 'url'
        ? `http://${effectiveHost}:${item.port}`
        : `${effectiveHost}:${item.port}`;

  return (
    <div className="group flex items-center justify-between px-3 sm:px-4 py-2 sm:py-2.5 hover:bg-surface-raised/70 transition-colors text-left border-b border-border/50 last:border-b-0 gap-2">
      <button
        type="button"
        onClick={() => onCopy(item.port)}
        className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 text-left cursor-pointer flex-1"
        title={`点击复制 ${copyTarget}`}
      >
        {/* 端口号 */}
        <span className="w-13 sm:w-16 font-mono font-bold text-xs sm:text-sm text-accent group-hover:underline shrink-0">
          {item.port}
        </span>

        <span className="h-3.5 w-px bg-border/70 shrink-0" />

        {/* 服务名称与备注 */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-xs sm:text-sm font-medium text-foreground truncate group-hover:text-accent transition-colors">
              {item.name}
            </span>
            {item.status && (
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 sm:hidden ${
                  item.status === 'running' ? 'bg-success' : 'bg-warning'
                }`}
                title={item.status === 'running' ? '运行中' : '已停止'}
              />
            )}
          </div>

          {item.note && (
            <span
              className="text-[11px] sm:text-xs text-tertiary truncate max-w-[120px] sm:max-w-[240px]"
              title={item.note}
            >
              · {item.note}
            </span>
          )}
        </div>
      </button>

      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 ml-auto">
        {/* 来源类型标签 */}
        <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-control bg-surface-raised text-secondary border border-border/60">
          {isDocker ? (
            <>
              <Server size={11} className="text-tertiary" />
              <span className="hidden sm:inline">Docker</span>
            </>
          ) : isManual ? (
            <>
              <Tag size={11} className="text-accent" />
              <span className="text-accent font-medium">黑名单</span>
            </>
          ) : (
            <>
              <Layers size={11} className="text-tertiary" />
              <span
                className="hidden sm:inline"
                title="首页添加的外部设备或宿主机非 Docker 服务"
              >
                外部
              </span>
            </>
          )}
        </span>

        {/* 协议（桌面端/中屏显示） */}
        {item.protocol && (
          <span className="hidden sm:inline-block uppercase font-mono text-[11px] sm:text-xs px-1.5 py-0.5 rounded-control bg-surface-raised text-tertiary border border-border/40">
            {item.protocol}
          </span>
        )}

        {/* 状态指示（桌面端显示） */}
        {item.status && (
          <span
            className={`hidden sm:inline-block w-1.5 h-1.5 rounded-full ${
              item.status === 'running' ? 'bg-success' : 'bg-warning'
            }`}
            title={item.status === 'running' ? '运行中' : '已停止'}
          />
        )}

        {/* 操作区 */}
        <div className="flex items-center gap-0.5 sm:gap-1 pl-1">
          <button
            type="button"
            onClick={() => onCopy(item.port)}
            className="p-1 sm:p-1.5 rounded-control text-tertiary hover:text-accent hover:bg-accent/10 transition-colors cursor-pointer"
            title={`复制 ${copyTarget}`}
            aria-label={`复制端口 ${item.port}`}
          >
            <Copy size={13} />
          </button>

          <a
            href={`http://${effectiveHost}:${item.port}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 sm:p-1.5 rounded-control text-tertiary hover:text-accent hover:bg-accent/10 transition-colors"
            title={`在浏览器中打开 http://${effectiveHost}:${item.port}`}
            aria-label={`在浏览器打开端口 ${item.port}`}
          >
            <ExternalLink size={13} />
          </a>

          {isManual && onDeleteManual && (
            <button
              type="button"
              onClick={() => onDeleteManual(item.port)}
              className="p-1 sm:p-1.5 rounded-control text-tertiary hover:text-error hover:bg-error/10 transition-colors cursor-pointer"
              title="移出黑名单"
              aria-label={`移出黑名单端口 ${item.port}`}
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function PortOccupiedCard({
  item,
  effectiveHost,
  copyFormat,
  onCopy,
  onDeleteManual,
}: {
  item: OccupiedPort;
  effectiveHost: string;
  copyFormat: PortCopyFormat;
  onCopy: (port: number, type?: PortCopyFormat) => void;
  onDeleteManual?: (port: number) => void;
}) {
  const isDocker = item.type === 'docker';
  const isManual = item.type === 'manual';
  const copyTarget =
    copyFormat === 'port'
      ? String(item.port)
      : copyFormat === 'url'
        ? `http://${effectiveHost}:${item.port}`
        : `${effectiveHost}:${item.port}`;

  return (
    <div className="group relative w-full p-2.5 sm:p-3 rounded-panel border border-border/80 bg-surface hover:bg-surface-raised transition-colors flex items-center justify-between shadow-xs hover:border-accent/40 gap-2">
      <button
        type="button"
        onClick={() => onCopy(item.port)}
        className="flex items-center gap-2.5 sm:gap-3 min-w-0 text-left cursor-pointer flex-1"
        title={`点击复制 ${copyTarget}`}
      >
        {/* 端口气泡 */}
        <div className="w-11 sm:w-12 h-9 sm:h-10 rounded-control bg-surface-raised group-hover:bg-accent/10 flex items-center justify-center font-mono font-bold text-xs sm:text-sm text-accent border border-border/60 transition-colors shrink-0">
          {item.port}
        </div>

        {/* 服务信息 */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-medium text-xs sm:text-sm truncate text-foreground group-hover:text-accent transition-colors">
              {item.name}
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 text-[11px] sm:text-xs text-tertiary flex-wrap">
            <span className="inline-flex items-center gap-1 shrink-0">
              {isDocker ? (
                <>
                  <Server size={11} />
                  <span>Docker</span>
                </>
              ) : isManual ? (
                <>
                  <Tag size={11} className="text-accent" />
                  <span className="text-accent font-medium">黑名单</span>
                </>
              ) : (
                <>
                  <Layers size={11} />
                  <span title="首页添加的外部设备或宿主机非 Docker 服务">
                    外部
                  </span>
                </>
              )}
            </span>
            {item.note && (
              <span
                className="text-tertiary truncate max-w-[90px] sm:max-w-[140px]"
                title={item.note}
              >
                · {item.note}
              </span>
            )}
            {item.protocol && (
              <span className="uppercase px-1.5 py-0.2 rounded-control bg-border/40 font-mono text-[10px] sm:text-xs">
                {item.protocol}
              </span>
            )}
            {item.status && (
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  item.status === 'running' ? 'bg-success' : 'bg-warning'
                }`}
                title={item.status === 'running' ? '运行中' : '已停止'}
              />
            )}
          </div>
        </div>
      </button>

      <div className="flex items-center gap-0.5 sm:gap-1 shrink-0 ml-1">
        <button
          type="button"
          onClick={() => onCopy(item.port)}
          className="p-1 rounded-control text-tertiary hover:text-accent hover:bg-accent/10 transition-colors cursor-pointer"
          title={`复制 ${copyTarget}`}
          aria-label={`复制端口 ${item.port}`}
        >
          <Copy size={13} />
        </button>

        <a
          href={`http://${effectiveHost}:${item.port}`}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1 rounded-control text-tertiary hover:text-accent hover:bg-accent/10 transition-colors"
          title={`在浏览器中打开 http://${effectiveHost}:${item.port}`}
          aria-label={`在浏览器打开端口 ${item.port}`}
        >
          <ExternalLink size={13} />
        </a>

        {isManual && onDeleteManual && (
          <button
            type="button"
            onClick={() => onDeleteManual(item.port)}
            className="p-1 rounded-control text-tertiary hover:text-error hover:bg-error/10 transition-colors cursor-pointer"
            title="移出黑名单"
            aria-label={`移出黑名单端口 ${item.port}`}
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

function ManualPortDialog({
  isOpen,
  onOpenChange,
  defaultPort,
  onSave,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  defaultPort?: number | null;
  onSave: (data: {
    port?: number;
    portInput?: string;
    name?: string;
    note?: string;
    protocol?: string;
  }) => Promise<void>;
}) {
  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      purpose="form"
      width={DIALOG_WIDTH.md}
    >
      {isOpen && (
        <ManualPortForm
          key={defaultPort ?? 'new'}
          defaultPort={defaultPort}
          onClose={() => onOpenChange(false)}
          onSave={onSave}
        />
      )}
    </Dialog>
  );
}

function ManualPortForm({
  defaultPort,
  onClose,
  onSave,
}: {
  defaultPort?: number | null;
  onClose: () => void;
  onSave: (data: {
    port?: number;
    portInput?: string;
    name?: string;
    note?: string;
    protocol?: string;
  }) => Promise<void>;
}) {
  const [portStr, setPortStr] = useState(
    defaultPort ? String(defaultPort) : '',
  );
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!portStr.trim()) {
      setError('请输入端口号或端口列表');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({
        portInput: portStr.trim(),
        name: note.trim() || '手动黑名单',
        note: note.trim() || undefined,
        protocol: 'tcp',
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="contents">
      <Layout
        contentWidth="100%"
        header={
          <DialogHeader
            title="添加端口至黑名单"
            subtitle="支持单个端口、逗号分隔 (如 8001,8002) 或连续区间 (如 8000-8005)"
            onOpenChange={(open) => {
              if (!open) onClose();
            }}
          />
        }
        content={
          <LayoutContent>
            <FormLayout direction="vertical">
              <TextInput
                label="端口号 / 区间"
                placeholder="如: 8001 或 8001,8002 或 8000-8005"
                value={portStr}
                onChange={(v) => setPortStr(v)}
                isRequired
                width="100%"
              />

              <TextInput
                label="备注说明 (可选)"
                placeholder="如: 宿主机保留 / MySQL 测试"
                value={note}
                onChange={(v) => setNote(v)}
                width="100%"
              />

              {error && (
                <Text size="sm" className="text-error" role="alert">
                  {error}
                </Text>
              )}
            </FormLayout>
          </LayoutContent>
        }
        footer={
          <LayoutFooter hasDivider>
            <HStack gap={2} justify="end">
              <Button
                label="取消"
                variant="ghost"
                type="button"
                onClick={onClose}
                isDisabled={saving}
              />
              <Button
                label="保存至黑名单"
                variant="primary"
                type="submit"
                isLoading={saving}
                isDisabled={saving || !portStr.trim()}
              />
            </HStack>
          </LayoutFooter>
        }
      />
    </form>
  );
}
