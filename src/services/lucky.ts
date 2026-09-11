import type { InputJsonValue } from '@prisma/client/runtime/client';
import { prisma } from '@/lib/db';
import { isGoogleFaviconUrl } from '@/lib/favicon';
import { fetchCachedFavicon } from '@/lib/favicon-cache';
import {
  buildLuckyExternalUrl,
  DEFAULT_LUCKY_CONFIG,
  fetchLuckyRules,
  type LuckyReverseProxyRule,
  type LuckyServiceType,
} from '@/lib/lucky';
import { getUserPreference, setUserPreference } from '@/lib/preferences';
import type {
  CardLuckyState,
  LuckyConfig,
  LuckyMissingCard,
  LuckySyncResult,
} from '@/types';

// 重新导出，方便 server 端代码从单一入口 import
export { DEFAULT_LUCKY_CONFIG };

/**
 * Lucky 同步 service
 *
 * 同步流程（手动触发，全量同步）：
 * 1. 拉 Lucky 规则列表
 * 2. 查 NavDeck 所有带 lucky 字段的卡片，建 ruleId → card 映射
 * 3. 逐条 diff：
 *    - Lucky 有 / NavDeck 无 / 不在 deletedRuleIds → 新建卡片
 *    - Lucky 有 / NavDeck 有 / missing=true → 复活（置 false + 更新地址）
 *    - Lucky 有 / NavDeck 有 / missing=false → 更新名称和地址（仅未手动改名）
 *    - Lucky 无 / NavDeck 有 lucky.ruleId → 置 missing=true（等待用户手动清理）
 *    - 在 deletedRuleIds 里 → 跳过，永不拉回
 * 4. 更新 lastSyncAt
 */

/** 同步时只拉这些 serviceType 的规则（默认只同步反代） */
const SYNC_SERVICE_TYPES: LuckyServiceType[] = ['reverseproxy'];

/** 读取 Lucky 配置 */
export async function getLuckyConfig(): Promise<LuckyConfig> {
  return getUserPreference<LuckyConfig>('lucky', DEFAULT_LUCKY_CONFIG);
}

/** 写入 Lucky 配置 */
async function setLuckyConfig(config: LuckyConfig): Promise<void> {
  await setUserPreference('lucky', config);
}

/** 分类删除后清理默认分类引用，避免同步时外键失败 */
export async function clearLuckyDefaultCategory(
  categoryId: string,
): Promise<void> {
  const config = await getLuckyConfig();
  if (config.defaultCategoryId !== categoryId) return;
  await setLuckyConfig({ ...config, defaultCategoryId: null });
}

/**
 * 触发一次同步
 *
 * @returns 同步结果统计
 * @throws 配置缺失 / Lucky API 调用失败时抛错
 */
export async function syncLuckyCards(): Promise<LuckySyncResult> {
  const config = await getLuckyConfig();

  if (!config.enabled) {
    throw new Error('Lucky 同步未启用');
  }
  if (!config.baseUrl || !config.openToken) {
    throw new Error('Lucky 配置不完整（baseUrl / openToken 必填）');
  }

  // 1. 拉 Lucky 规则
  const allRules = await fetchLuckyRules(config.baseUrl, config.openToken);
  const rules = allRules.filter((r) =>
    SYNC_SERVICE_TYPES.includes(r.serviceType),
  );

  // 2. 查 NavDeck 已有 lucky 卡片，建 ruleId → card 映射
  // 不用 where 过滤 lucky（JsonNullableFilter 的 null 查询在 Prisma 7 + SQLite 较繁琐），
  // 单用户场景卡片数量有限，全量查后在应用层过滤即可
  const allCards = await prisma.card.findMany();
  const ruleIdToCard = new Map<string, (typeof allCards)[number]>();
  for (const card of allCards) {
    if (!card.lucky) continue;
    const state = card.lucky as unknown as CardLuckyState;
    if (state?.ruleId) {
      ruleIdToCard.set(state.ruleId, card);
    }
  }

  const deletedSet = new Set(config.deletedRuleIds);
  const now = new Date().toISOString();
  const result: LuckySyncResult = {
    created: 0,
    updated: 0,
    markedMissing: 0,
    skipped: 0,
    errors: [],
  };

  // 3. 逐条 diff（Lucky 侧有的规则）
  const seenRuleIds = new Set<string>();
  for (const rule of rules) {
    seenRuleIds.add(rule.ruleId);

    // 在已删除列表里 → 跳过
    if (deletedSet.has(rule.ruleId)) {
      result.skipped++;
      continue;
    }

    const existing = ruleIdToCard.get(rule.ruleId);
    const externalUrl = buildLuckyExternalUrl(
      rule.frontendDomain,
      config.baseUrl,
      rule.listenPort,
      rule.enableTLS,
    );
    const preferredName = deriveCardName(rule.frontendDomain, rule.name);
    const legacyName = deriveCardName(rule.frontendDomain);
    const needsRename =
      Boolean(rule.name?.trim()) &&
      existing?.name === legacyName &&
      preferredName !== legacyName;

    if (!existing) {
      // 新建卡片
      try {
        await createLuckyCard(rule, externalUrl, config, now);
        result.created++;
      } catch (e) {
        result.errors.push(
          `新建 ${rule.frontendDomain} 失败: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    } else {
      // 已有卡片：更新地址 + 复活（若 missing=true）
      const state = existing.lucky as unknown as CardLuckyState;
      const wasMissing = state.missing;
      const needsIconRefresh = hasAutoFavicon(existing, [
        rule.backendLocation,
        externalUrl,
      ]);
      const needsUpdate =
        needsRename ||
        wasMissing ||
        needsIconRefresh ||
        existing.internalUrl !== rule.backendLocation ||
        existing.externalUrl !== externalUrl;

      if (needsUpdate) {
        try {
          await prisma.card.update({
            where: { id: existing.id },
            data: {
              name: needsRename ? preferredName : existing.name,
              internalUrl: rule.backendLocation,
              externalUrl,
              lucky: {
                ...state,
                missing: false,
                syncedAt: now,
              } as unknown as InputJsonValue,
            },
          });
          result.updated++;
          if (needsIconRefresh) {
            void tryFetchIcon(rule.backendLocation, externalUrl)
              .then((icon) => {
                if (icon) {
                  return prisma.card.update({
                    where: { id: existing.id },
                    data: { icon },
                  });
                }
              })
              .catch(() => {
                // 保留占位符，等待下次同步或用户手动选择图标
              });
          }
        } catch (e) {
          result.errors.push(
            `更新 ${rule.frontendDomain} 失败: ${e instanceof Error ? e.message : String(e)}`,
          );
        }
      }
    }
  }

  // 4. 标记失效：NavDeck 有但 Lucky 侧已删除或禁用的规则
  for (const [ruleId, card] of ruleIdToCard) {
    if (seenRuleIds.has(ruleId)) continue;
    // 在已删除列表里 → 不处理（这是用户手动删过的卡片）
    if (deletedSet.has(ruleId)) continue;

    const state = card.lucky as unknown as CardLuckyState;
    if (state.missing) continue; // 已标记过

    try {
      await prisma.card.update({
        where: { id: card.id },
        data: {
          lucky: {
            ...state,
            missing: true,
            syncedAt: now,
          } as unknown as InputJsonValue,
        },
      });
      result.markedMissing++;
    } catch (e) {
      result.errors.push(
        `标记失效 ${ruleId} 失败: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  // 5. 更新 lastSyncAt
  // 重新读取最新配置再更新（避免覆盖同步过程中用户的配置变更）
  const freshConfig = await getLuckyConfig();
  await setLuckyConfig({ ...freshConfig, lastSyncAt: now });

  return result;
}

/** 查询 Lucky 已标记失效的卡片 */
export async function getMissingLuckyCards(): Promise<LuckyMissingCard[]> {
  const allCards = await prisma.card.findMany();

  return allCards.flatMap((card) => {
    if (!card.lucky) return [];
    const state = card.lucky as unknown as CardLuckyState;
    if (!state.ruleId || !state.missing) return [];

    return [{ id: card.id, name: card.name, ruleId: state.ruleId }];
  });
}

/**
 * 手动删除已失效的 Lucky 卡片
 *
 * 不写入 deletedRuleIds：若 Lucky 规则后续恢复，下次同步会重新创建。
 */
export async function deleteMissingLuckyCards(): Promise<number> {
  const missingCards = await getMissingLuckyCards();
  if (missingCards.length === 0) return 0;

  await prisma.card.deleteMany({
    where: { id: { in: missingCards.map((card) => card.id) } },
  });

  return missingCards.length;
}

/**
 * 创建 Lucky 同步卡片
 *
 * - name：从子域名前缀生成（alist.example.com → "alist"）
 * - icon：异步抓 favicon，失败用空字符串（前端展示占位符）
 * - categoryId：用配置的默认分类
 */
async function createLuckyCard(
  rule: LuckyReverseProxyRule,
  externalUrl: string,
  config: LuckyConfig,
  syncedAt: string,
): Promise<void> {
  const name = deriveCardName(rule.frontendDomain, rule.name);

  // 新卡片 order = 同分类下最大 order + 1
  const maxOrder = await prisma.card.aggregate({
    _max: { order: true },
    where: { categoryId: config.defaultCategoryId ?? null },
  });
  const order = (maxOrder._max.order ?? -1) + 1;

  const luckyState: CardLuckyState = {
    ruleId: rule.ruleId,
    missing: false,
    syncedAt,
  };

  // 先创建卡片（icon 空字符串），favicon 异步抓取后更新
  // 避免串行抓取 N 个 favicon 阻塞同步流程（每个最多 5s 超时）
  const card = await prisma.card.create({
    data: {
      name,
      internalUrl: rule.backendLocation,
      externalUrl,
      icon: '',
      description: null,
      categoryId: config.defaultCategoryId ?? null,
      order,
      lucky: luckyState as unknown as InputJsonValue,
    },
  });

  // fire-and-forget: 异步抓取 favicon，不阻塞同步流程
  void tryFetchIcon(rule.backendLocation, externalUrl)
    .then((icon) => {
      if (icon) {
        return prisma.card.update({
          where: { id: card.id },
          data: { icon },
        });
      }
    })
    .catch(() => {
      // favicon 抓取失败，忽略（卡片已创建，icon 为空展示占位符）
    });
}

/**
 * 从子域名生成卡片名
 *
 * 优先使用 Lucky 子规则名称；否则用子域名前缀。
 * alist.example.com → "alist"
 * www.example.com → "www"（这种情况下用户大概率会手动改名）
 *
 * 冲突处理留给调用方（多条规则前缀相同时，由 DB unique 约束兜底失败，
 * 当前实现暂不自动追加域名后缀，保持简单）。
 */
function deriveCardName(frontendDomain: string, subRuleName?: string): string {
  const name = subRuleName?.trim();
  if (name) return name;

  // IP 地址（含端口）：用完整地址作为名字（避免 "192" 这种无意义前缀）
  if (/^\d+\.\d+\.\d+\.\d+/.test(frontendDomain)) {
    return frontendDomain;
  }
  const firstDot = frontendDomain.indexOf('.');
  if (firstDot <= 0) return frontendDomain;
  return frontendDomain.slice(0, firstDot);
}

/**
 * 尝试抓 favicon 作为卡片图标
 *
 * 成功时返回站内缓存路径，避免数据库落内网绝对地址。
 * 失败返回空字符串，前端会展示占位符。
 * 不阻塞同步流程。
 */
async function tryFetchIcon(
  backendLocation: string,
  externalUrl: string,
): Promise<string> {
  try {
    const favicon = await fetchCachedFavicon(backendLocation, externalUrl);
    return favicon?.url ?? '';
  } catch {
    return '';
  }
}

/**
 * 判断 Lucky 自动同步卡片的 icon 是否仍是自动抓取结果。
 *
 * 空值和旧 Google S2 图标一定刷新；与内/外网同源的绝对 favicon 是旧版
 * 同步留下的内网地址，也刷新。上传 / 图标库等用户选择不会被覆盖。
 */
function hasAutoFavicon(
  card: { icon: string },
  sourceUrls: [string, string],
): boolean {
  if (!card.icon || isGoogleFaviconUrl(card.icon)) return true;
  if (!/^https?:\/\//i.test(card.icon)) return false;

  try {
    const iconOrigin = new URL(card.icon).origin;
    return sourceUrls.some((sourceUrl) => {
      try {
        return new URL(sourceUrl).origin === iconOrigin;
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
}
