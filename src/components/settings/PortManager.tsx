'use client';

import { Button } from '@astryxdesign/core/Button';
import { HStack } from '@astryxdesign/core/HStack';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import {
  Check,
  CheckCircle2,
  Copy,
  Layers,
  RefreshCw,
  Server,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { portsApi } from '@/services/ports';
import { preferencesApi } from '@/services/preferences';
import type { OccupiedPort, PortStatusResult } from '@/types';

export function PortManager() {
  const { mutate } = useSWRConfig();
  const { data: prefs, mutate: mutatePrefs } = useSWR(
    preferencesApi.getKey,
    preferencesApi.get,
  );
  const addressFormat = prefs?.portAddressFormat ?? 'ip-port';

  const [data, setData] = useState<PortStatusResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [startPort, setStartPort] = useState(8000);
  const [searchQuery, setSearchQuery] = useState('');

  const handleAddressFormatChange = async (format: 'ip-port' | 'url') => {
    await preferencesApi.update('portAddressFormat', format);
    void mutatePrefs();
  };

  // 智能推断当前生效的 IP/Host
  const effectiveHost = useMemo(() => {
    if (typeof window !== 'undefined') {
      const h = window.location.hostname;
      if (h && h !== 'localhost' && h !== '127.0.0.1') {
        return h;
      }
    }
    return data?.hostIp || '127.0.0.1';
  }, [data?.hostIp]);

  // 端口即时测试
  const [testPortInput, setTestPortInput] = useState('');
  const [testingPort, setTestingPort] = useState(false);
  const [testResult, setTestResult] = useState<{
    port: number;
    isAvailable: boolean;
    occupiedBy?: string;
  } | null>(null);

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

  const handleCopy = (
    port: number,
    type: 'ip-port' | 'url' = addressFormat,
  ) => {
    const text =
      type === 'url'
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

  const filteredPorts = useMemo(() => {
    if (!data?.occupiedPorts) return [];
    if (!searchQuery.trim()) return data.occupiedPorts;
    const q = searchQuery.toLowerCase().trim();
    return data.occupiedPorts.filter(
      (p) =>
        String(p.port).includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.protocol?.toLowerCase().includes(q),
    );
  }, [data, searchQuery]);

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
          >
            重新探测
          </Button>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <PortRecommendCard
            data={data}
            effectiveHost={effectiveHost}
            startPort={startPort}
            copiedKey={copiedKey}
            addressFormat={addressFormat}
            onStartPortChange={setStartPort}
            onStartPortBlur={() => void fetchStatus(startPort)}
            onAddressFormatChange={handleAddressFormatChange}
            onCopy={handleCopy}
          />
          <PortTestCard
            testPortInput={testPortInput}
            testingPort={testingPort}
            testResult={testResult}
            onTestInputChange={setTestPortInput}
            onTest={handleTestPort}
          />
        </div>
      </SettingsSection>

      {/* 占用清单 */}
      <SettingsSection
        title="当前占用端口与服务清单"
        description={
          data ? `共探测到 ${data.occupiedPorts.length} 个端口` : '探测中...'
        }
        actions={
          <div className="w-full sm:w-56">
            <input
              type="text"
              placeholder="搜索端口或服务名称..."
              aria-label="搜索占用端口或服务名称"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-1 text-xs rounded-control border border-border bg-surface outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            />
          </div>
        }
      >
        {loading && !data ? (
          <div className="py-12 text-center text-sm text-tertiary">
            正在获取 Docker 容器及服务端口...
          </div>
        ) : filteredPorts.length === 0 ? (
          <div className="py-12 text-center text-sm text-tertiary">
            {searchQuery ? '没有找到匹配的端口' : '暂无占用的端口记录'}
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
              />
            ))}
          </div>
        )}
      </SettingsSection>
    </VStack>
  );
}

function PortRecommendCard({
  data,
  effectiveHost,
  startPort,
  copiedKey,
  addressFormat,
  onStartPortChange,
  onStartPortBlur,
  onAddressFormatChange,
  onCopy,
}: {
  data: PortStatusResult | null;
  effectiveHost: string;
  startPort: number;
  copiedKey: string | null;
  addressFormat: 'ip-port' | 'url';
  onStartPortChange: (val: number) => void;
  onStartPortBlur: () => void;
  onAddressFormatChange: (fmt: 'ip-port' | 'url') => void;
  onCopy: (port: number, type?: 'ip-port' | 'url') => void;
}) {
  const recommendedPort = data?.recommendedPort;
  return (
    <div className="p-4 rounded-panel border border-border bg-surface-raised flex flex-col justify-between">
      <div>
        <Text className="text-secondary text-sm">当前推荐可用端口</Text>
        <div className="flex items-baseline gap-3 my-2">
          <span
            className="nas-widget-value text-accent"
            style={{ fontSize: '2.4rem' }}
          >
            {recommendedPort ?? '...'}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success font-medium border border-success/20">
            可直接分配
          </span>
        </div>
        <p className="text-tertiary text-xs font-mono">
          访问地址：{addressFormat === 'url' ? 'http://' : ''}
          {effectiveHost}:{recommendedPort ?? '...'}
        </p>
      </div>

      <div className="mt-4 pt-3 border-t border-border/60 flex flex-wrap items-center justify-between gap-2">
        <HStack gap={3} align="center" className="flex-wrap">
          <HStack gap={1.5} align="center">
            <span className="text-tertiary text-xs">从端口起查:</span>
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
              className="w-20 px-2 py-1 text-xs font-mono rounded-control border border-border bg-surface text-center outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            />
          </HStack>
          <HStack gap={1.5} align="center">
            <span className="text-tertiary text-xs">默认格式:</span>
            <div className="flex items-center gap-1 bg-surface p-0.5 rounded-control border border-border/80 text-[11px]">
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
          </HStack>
        </HStack>

        <div className="flex items-center gap-2">
          <Button
            label={addressFormat === 'url' ? '复制 URL' : '复制 IP:端口'}
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
          >
            {copiedKey === `${recommendedPort}-${addressFormat}`
              ? '已复制'
              : addressFormat === 'url'
                ? '复制 URL'
                : '复制 IP:端口'}
          </Button>
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
}) {
  return (
    <div className="p-4 rounded-panel border border-border bg-surface-raised flex flex-col justify-between">
      <div>
        <Text className="text-secondary text-sm">指定端口占用探测</Text>
        <p className="text-tertiary text-xs mt-0.5">
          输入想要使用的端口号，快速测试是否已被占用
        </p>

        <div className="flex gap-2 mt-3">
          <input
            type="number"
            placeholder="如: 8080"
            aria-label="测试指定端口号"
            value={testPortInput}
            onChange={(e) => onTestInputChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void onTest()}
            className="flex-1 px-3 py-1.5 text-sm font-mono rounded-control border border-border bg-surface outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          />
          <Button
            label="测试"
            size="sm"
            variant="secondary"
            onClick={() => void onTest()}
            isLoading={testingPort}
            isDisabled={!testPortInput}
          >
            测试
          </Button>
        </div>
      </div>

      {testResult && (
        <div
          className={`mt-3 p-2.5 rounded-panel border text-xs flex items-center gap-2 ${
            testResult.isAvailable
              ? 'bg-success/10 border-success/20 text-success'
              : 'bg-error/10 border-error/20 text-error'
          }`}
        >
          {testResult.isAvailable ? (
            <>
              <CheckCircle2 size={16} className="shrink-0" />
              <span>
                端口 <b>{testResult.port}</b> 当前空闲，可以使用！
              </span>
            </>
          ) : (
            <>
              <XCircle size={16} className="shrink-0" />
              <span>
                端口 <b>{testResult.port}</b> 已被占用
                {testResult.occupiedBy ? `（${testResult.occupiedBy}）` : ''}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function PortOccupiedCard({
  item,
  effectiveHost,
  copyFormat,
  onCopy,
}: {
  item: OccupiedPort;
  effectiveHost: string;
  copyFormat: 'ip-port' | 'url';
  onCopy: (port: number) => void;
}) {
  const isDocker = item.type === 'docker';

  return (
    <button
      type="button"
      onClick={() => onCopy(item.port)}
      className="group relative w-full text-left p-3 rounded-panel border border-border/80 bg-surface hover:bg-surface-raised transition-colors cursor-pointer flex items-center justify-between shadow-xs hover:border-accent/40 outline-none focus-ring"
      title={`点击复制 ${
        copyFormat === 'url'
          ? `http://${effectiveHost}:${item.port}`
          : `${effectiveHost}:${item.port}`
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        {/* 端口气泡 */}
        <div className="w-12 h-10 rounded-control bg-surface-raised group-hover:bg-accent/10 flex items-center justify-center font-mono font-bold text-sm text-accent border border-border/60 transition-colors shrink-0">
          {item.port}
        </div>

        {/* 服务信息 */}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-sm truncate text-foreground group-hover:text-accent transition-colors">
              {item.name}
            </span>
          </div>

          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-tertiary">
            <span className="inline-flex items-center gap-1">
              {isDocker ? (
                <>
                  <Server size={11} />
                  Docker 容器
                </>
              ) : (
                <>
                  <Layers size={11} />
                  服务卡片
                </>
              )}
            </span>
            {item.protocol && (
              <span className="uppercase px-1 rounded-control bg-border/40 font-mono text-[10px]">
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

      <div className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-tertiary group-hover:text-accent flex items-center gap-1 text-[11px]">
        <Copy size={12} />
        <span>{copyFormat === 'url' ? '复制 URL' : '复制 IP:端口'}</span>
      </div>
    </button>
  );
}
