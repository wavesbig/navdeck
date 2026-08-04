/**
 * Lucky OpenAPI 客户端
 *
 * 调用 Lucky 后台的 OpenAPI 接口拉取 Web 服务反代规则列表。
 * 认证方式：HTTP 请求头 `openToken: xxxxxxxxxx`。
 *
 * 参考：
 * - Lucky 文档：https://lucky666.cn/docs/modules/web
 * - OpenToken 启用：Lucky 后台 → 设置 → 最底部
 * - 已知接口：PUT /openapi/webseivce/update（注意拼写：webseivce 是 Lucky 的笔误）
 *
 * TODO（Lucky 恢复后补全）：
 * - 确认查询接口的路径（推测 GET /openapi/webseivce/list 或类似）
 * - 确认响应 JSON 结构（rule / subRule / serviceType / location / 前端域名等字段）
 * - 确认是否需要按 serviceType 过滤
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
  /** 前端域名（如 alist.example.com） */
  frontendDomain: string;
  /** 后端地址（如 http://192.168.1.10:5244） */
  backendLocation: string;
  /** 服务类型（reverseproxy / redirect / urljump） */
  serviceType: LuckyServiceType;
}

/**
 * 拉取 Lucky 反代规则列表
 *
 * @param baseUrl  Lucky 后台地址（内网或域名）
 * @param openToken OpenToken
 * @returns 反代规则列表
 *
 * TODO: Lucky 恢复后补全实际 HTTP 调用
 */
export async function fetchLuckyRules(
  baseUrl: string,
  openToken: string,
): Promise<LuckyReverseProxyRule[]> {
  // 参数待实现时使用，此处显式引用避免未使用警告
  void baseUrl;
  void openToken;
  // TODO: 实现实际调用
  // 推测路径：GET `${baseUrl}/openapi/webseivce/list`
  // 请求头：`openToken: ${openToken}`
  // 响应结构待确认，标准化为 LuckyReverseProxyRule[]
  //
  // 示例（伪代码）：
  // const res = await fetch(`${baseUrl}/openapi/webseivce/list`, {
  //   headers: { openToken },
  // });
  // if (!res.ok) throw new Error(`Lucky API 响应错误: ${res.status}`);
  // const data = await res.json();
  // return data.map(normalizeLuckyRule);

  throw new Error('Lucky 查询接口未实现（等待 Lucky 服务恢复后补全）');
}
