/**
 * Lucky OpenAPI 客户端
 *
 * 调用 Lucky 后台的 OpenAPI 接口拉取 Web 服务反代规则列表。
 * 认证方式：HTTP 请求头 `openToken: xxxxxxxxxx`。
 *
 * 参考：
 * - Lucky 文档：https://lucky666.cn/docs/modules/web
 * - OpenToken 启用：Lucky 后台 → 设置 → 最底部
 * - 官方前端实际调用：GET /api/webservice/rules
 * - OpenToken 也用于调用后台 API（Lucky 设置页说明）
 */

import type { LuckyConfig } from '@/types';

/** LuckyConfig 默认值（未配置时） */
export const DEFAULT_LUCKY_CONFIG: LuckyConfig = {
  enabled: false,
  baseUrl: '',
  openToken: '',
  defaultCategoryId: null,
  deletedRuleIds: [],
  lastSyncAt: null,
};

/** Lucky Web 服务规则类型（与 Lucky 后台一致） */
export type LuckyServiceType = 'reverseproxy' | 'redirect' | 'urljump';

/**
 * Lucky 反代规则（拉取后的标准化结构）
 *
 * 对应 NavDeck 卡片字段：
 * - ruleId（rule:subRule）→ Card.lucky.ruleId
 * - frontendDomain → Card.externalUrl（外网地址，拼协议后）
 * - backendLocation → Card.internalUrl（内网地址）
 * - serviceType → 过滤用（默认只同步 reverseproxy）
 */
export interface LuckyReverseProxyRule {
  /** Lucky 规则唯一标识（rule:subRule 格式拼起来） */
  ruleId: string;
  /** Lucky 子规则名称（Remark，可留空） */
  name?: string;
  /** 前端域名（如 alist.example.com） */
  frontendDomain: string;
  /** 后端地址（如 http://192.168.1.10:5244） */
  backendLocation: string;
  /** 服务类型（reverseproxy / redirect / urljump） */
  serviceType: LuckyServiceType;
}

interface LuckyRulesResponse {
  ret?: number;
  msg?: string;
  ruleList?: LuckyRule[];
}

interface LuckyRule {
  RuleKey?: string;
  Enable?: boolean;
  DefaultProxy?: LuckySubRule | null;
  ProxyList?: LuckySubRule[] | null;
}

interface LuckySubRule {
  Key?: string;
  Remark?: string;
  WebServiceType?: string | null;
  Enable?: boolean;
  Domains?: string[] | null;
  Locations?: string[] | null;
}

const FETCH_TIMEOUT_MS = 10_000;

/**
 * 拉取 Lucky 反代规则列表
 *
 * @param baseUrl  Lucky 后台地址（内网或域名）
 * @param openToken OpenToken
 * @returns 反代规则列表
 *
 */
export async function fetchLuckyRules(
  baseUrl: string,
  openToken: string,
): Promise<LuckyReverseProxyRule[]> {
  const trimmedBaseUrl = baseUrl.trim().replace(/\/+$/, '');
  const parsedBaseUrl = new URL(trimmedBaseUrl);
  if (
    parsedBaseUrl.protocol !== 'http:' &&
    parsedBaseUrl.protocol !== 'https:'
  ) {
    throw new Error('Lucky 后台地址仅支持 http/https');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${trimmedBaseUrl}/api/webservice/rules`, {
      headers: { openToken },
      signal: controller.signal,
      cache: 'no-store',
    });
  } catch (error) {
    throw new Error(
      `Lucky API 请求失败: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (!response.ok) {
    clearTimeout(timer);
    throw new Error(`Lucky API 响应错误: ${response.status}`);
  }

  let data: LuckyRulesResponse;
  try {
    const timeout = new Promise<never>((_, reject) => {
      controller.signal.addEventListener(
        'abort',
        () => reject(new Error('Lucky API 响应超时')),
        { once: true },
      );
    });
    data = (await Promise.race([
      response.json(),
      timeout,
    ])) as LuckyRulesResponse;
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error('Lucky API 请求超时');
    }
    throw new Error(
      `Lucky API 响应解析失败: ${error instanceof Error ? error.message : String(error)}`,
    );
  } finally {
    clearTimeout(timer);
  }

  if (data.ret !== 0) {
    throw new Error(`Lucky API 错误: ${data.msg ?? data.ret}`);
  }

  return (data.ruleList ?? []).flatMap(normalizeLuckyRule);
}

/**
 * 拼接 Lucky 规则的完整外网地址
 *
 * Lucky 规则里的 Domains 通常只有域名，监听端口在后台地址上。
 * 因此优先保留规则域名自带端口；域名未带端口时继承 baseUrl 端口。
 */
export function buildLuckyExternalUrl(
  frontendDomain: string,
  luckyBaseUrl: string,
): string {
  const normalizedDomain = frontendDomain.trim();
  const domainURL = new URL(
    normalizedDomain.includes('://')
      ? normalizedDomain
      : `https://${normalizedDomain}`,
  );
  const baseURL = new URL(luckyBaseUrl.trim());
  const port = domainURL.port || baseURL.port;

  return `${domainURL.protocol}//${domainURL.hostname}${port ? `:${port}` : ''}`;
}

function normalizeLuckyRule(rule: LuckyRule): LuckyReverseProxyRule[] {
  const ruleKey = rule.RuleKey?.trim();
  if (!ruleKey) return [];
  if (rule.Enable === false) return [];

  const subRules = [rule.DefaultProxy, ...(rule.ProxyList ?? [])].filter(
    (subRule): subRule is LuckySubRule => Boolean(subRule),
  );

  return subRules.flatMap((subRule) => {
    const subRuleKey = subRule.Key?.trim() ?? '';
    if (subRule.Enable === false) return [];
    const frontendDomain = subRule.Domains?.find((domain) => domain.trim());
    const backendLocation = subRule.Locations?.find((location) =>
      location.trim(),
    );

    if (!frontendDomain || !backendLocation) return [];
    const serviceType = parseServiceType(subRule.WebServiceType);
    if (!serviceType) return [];

    return [
      {
        ruleId: `${ruleKey}:${subRuleKey}`,
        name: subRule.Remark?.trim() ?? '',
        frontendDomain: frontendDomain.trim(),
        backendLocation: backendLocation.trim(),
        serviceType,
      },
    ];
  });
}

function parseServiceType(value?: string | null): LuckyServiceType | null {
  if (!value || value === 'reverseproxy') return 'reverseproxy';
  if (value === 'redirect') return 'redirect';
  if (value === 'url' || value === 'urljump') return 'urljump';
  return null;
}
