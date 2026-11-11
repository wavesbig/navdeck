import { randomBytes } from 'node:crypto';
import { unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createClient } from '@libsql/client';
import { prisma } from '@/lib/db';

export interface ParsedSunPanelCard {
  name: string;
  internalUrl: string;
  externalUrl: string;
  icon: string;
  description: string | null;
  openInDialog: boolean;
  order: number;
}

export interface ParsedSunPanelCategory {
  name: string;
  order: number;
  cards: ParsedSunPanelCard[];
}

export interface SunPanelParseResult {
  categories: ParsedSunPanelCategory[];
  totalCategories: number;
  totalCards: number;
  skippedCards: number;
}

export interface SunPanelImportStats {
  categoriesCreated: number;
  categoriesReused: number;
  cardsCreated: number;
  skippedCards: number;
}

/** 智能标准化 URL，自动补齐缺失的 http/https 协议前缀 */
export function normalizeUrl(rawUrl: unknown): string {
  if (typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)) {
    return trimmed;
  }
  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`;
  }
  return `http://${trimmed}`;
}

/** 提取并解析 Sun-Panel 图标字段（支持对象、JSON 字符串与直接 URL） */
export function resolveIcon(iconField: unknown): string {
  if (!iconField) return '';
  let target = iconField;
  if (typeof target === 'string') {
    const trimmed = target.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        target = JSON.parse(trimmed);
      } catch {
        return trimmed;
      }
    } else {
      return trimmed;
    }
  }

  if (typeof target === 'object' && target !== null) {
    const raw = target as {
      itemType?: number;
      item_type?: number;
      src?: string;
      text?: string;
      url?: string;
      value?: string;
    };
    const itemType = raw.itemType ?? raw.item_type;
    if (itemType === 2 && (raw.src || raw.url)) {
      return (raw.src || raw.url)?.trim() ?? '';
    }
    if ((itemType === 1 || itemType === 3) && (raw.text || raw.value)) {
      return (raw.text || raw.value)?.trim() ?? '';
    }
    if (raw.src) return raw.src.trim();
    if (raw.url) return raw.url.trim();
    if (raw.text) return raw.text.trim();
    if (raw.value) return raw.value.trim();
  }
  return '';
}

type RawCard = {
  title?: string;
  name?: string;
  url?: string;
  link?: string;
  externalUrl?: string;
  external_url?: string;
  lanUrl?: string;
  lan_url?: string;
  lanURL?: string;
  internalUrl?: string;
  internal_url?: string;
  icon?: unknown;
  description?: string;
  desc?: string;
  remark?: string;
  openMethod?: number;
  open_method?: number;
  sort?: number;
  order?: number;
};

type RawGroup = {
  title?: string;
  groupName?: string;
  group_name?: string;
  name?: string;
  sort?: number;
  order?: number;
  children?: unknown[];
  items?: unknown[];
  cards?: unknown[];
  list?: unknown[];
};

/**
 * 解析 Sun-Panel 导出的 JSON 数据结构
 *
 * 全面兼容：
 * 1. 官方完整导出格式（含 appName: 'Sun-Panel-Config' 与 icons 数组）
 * 2. 任意含 icons / data / list / groups 数组的对象
 * 3. 直接是分组数组: [ { title: '...', children: [...] } ]
 * 4. 直接是扁平卡片数组: [ { title: '...', url: '...' } ]
 * 5. 驼峰与下划线命名兼容（lanUrl vs lan_url, openMethod vs open_method 等）
 * 6. URL 协议缺失自动补齐（如 192.168.1.1:8080 自动补为 http://192.168.1.1:8080）
 */
export function parseSunPanelData(rawInput: unknown): SunPanelParseResult {
  let root: unknown = rawInput;
  if (typeof rawInput === 'string') {
    try {
      root = JSON.parse(rawInput);
    } catch {
      throw new Error('JSON 解析失败，请确认文件是否为合法的 JSON 格式');
    }
  }

  if (!root || typeof root !== 'object') {
    throw new Error('未识别到有效的 Sun-Panel 配置数据');
  }

  let rawGroups: RawGroup[] = [];

  if (Array.isArray(root)) {
    const hasChildren = root.some(
      (item) =>
        item &&
        typeof item === 'object' &&
        ('children' in item ||
          'items' in item ||
          'cards' in item ||
          'list' in item),
    );
    if (hasChildren) {
      rawGroups = root as RawGroup[];
    } else {
      rawGroups = [
        {
          title: '未分类',
          sort: 0,
          children: root,
        },
      ];
    }
  } else if (
    'icons' in root &&
    Array.isArray((root as { icons: unknown }).icons)
  ) {
    rawGroups = (root as { icons: RawGroup[] }).icons;
  } else if (
    'data' in root &&
    Array.isArray((root as { data: unknown }).data)
  ) {
    const dataList = (root as { data: unknown[] }).data;
    const hasChildren = dataList.some(
      (item) =>
        item &&
        typeof item === 'object' &&
        ('children' in item ||
          'items' in item ||
          'cards' in item ||
          'list' in item),
    );
    if (hasChildren) {
      rawGroups = dataList as RawGroup[];
    } else {
      rawGroups = [{ title: '未分类', sort: 0, children: dataList }];
    }
  } else if (
    'groups' in root &&
    Array.isArray((root as { groups: unknown }).groups)
  ) {
    rawGroups = (root as { groups: RawGroup[] }).groups;
  } else {
    throw new Error('未在数据中找到 Sun-Panel 的 icons / 分组卡片列表');
  }

  const sortedGroups = [...rawGroups].sort(
    (a, b) => (a.sort ?? a.order ?? 0) - (b.sort ?? b.order ?? 0),
  );

  const categories: ParsedSunPanelCategory[] = [];
  let skippedCards = 0;
  let totalCards = 0;

  for (let groupIndex = 0; groupIndex < sortedGroups.length; groupIndex++) {
    const group = sortedGroups[groupIndex];
    if (!group || typeof group !== 'object') continue;

    const groupName =
      (typeof group.title === 'string' && group.title.trim()) ||
      (typeof group.groupName === 'string' && group.groupName.trim()) ||
      (typeof group.group_name === 'string' && group.group_name.trim()) ||
      (typeof group.name === 'string' && group.name.trim()) ||
      `分类 ${groupIndex + 1}`;

    const rawChildren = Array.isArray(group.children)
      ? (group.children as RawCard[])
      : Array.isArray(group.items)
        ? (group.items as RawCard[])
        : Array.isArray(group.cards)
          ? (group.cards as RawCard[])
          : Array.isArray(group.list)
            ? (group.list as RawCard[])
            : [];

    const sortedChildren = [...rawChildren].sort(
      (a, b) => (a.sort ?? a.order ?? 0) - (b.sort ?? b.order ?? 0),
    );

    const cards: ParsedSunPanelCard[] = [];

    for (let cardIndex = 0; cardIndex < sortedChildren.length; cardIndex++) {
      const card = sortedChildren[cardIndex];
      if (!card || typeof card !== 'object') continue;

      const rawUrl =
        card.url ?? card.link ?? card.externalUrl ?? card.external_url;
      const rawLanUrl =
        card.lanUrl ??
        card.lan_url ??
        card.lanURL ??
        card.internalUrl ??
        card.internal_url;

      const url = normalizeUrl(rawUrl);
      const lanUrl = normalizeUrl(rawLanUrl);

      // 内外网地址互为回退；若两者皆空，则无法作为有效卡片跳过
      if (!url && !lanUrl) {
        skippedCards++;
        continue;
      }

      const name =
        (typeof card.title === 'string' && card.title.trim()) ||
        (typeof card.name === 'string' && card.name.trim()) ||
        '未命名卡片';

      const internalUrl = lanUrl || url;
      const externalUrl = url || lanUrl;
      const icon = resolveIcon(card.icon);

      const rawDesc =
        (typeof card.description === 'string' && card.description.trim()) ||
        (typeof card.remark === 'string' && card.remark.trim()) ||
        (typeof card.desc === 'string' && card.desc.trim()) ||
        '';
      const description = rawDesc ? rawDesc.slice(0, 200) : null;

      const rawOpenMethod = Number(card.openMethod ?? card.open_method ?? 0);
      const openInDialog = rawOpenMethod === 3;

      cards.push({
        name,
        internalUrl,
        externalUrl,
        icon,
        description,
        openInDialog,
        order: cards.length,
      });
      totalCards++;
    }

    if (cards.length > 0 || groupName) {
      categories.push({
        name: groupName,
        order: categories.length,
        cards,
      });
    }
  }

  return {
    categories,
    totalCategories: categories.length,
    totalCards,
    skippedCards,
  };
}

/**
 * 解析 Sun-Panel 的 SQLite 数据库文件（如 database.db / sun-panel.db）
 */
export async function parseSunPanelSqlite(
  buffer: Buffer,
): Promise<SunPanelParseResult> {
  const tempPath = join(
    tmpdir(),
    `navdeck-sunpanel-${randomBytes(8).toString('hex')}.db`,
  );
  await writeFile(tempPath, buffer);

  try {
    const client = createClient({
      url: `file:${tempPath.replaceAll('\\', '/')}`,
    });

    // 查询分组列表
    let groups: Array<{ id: number; title: string; sort?: number }> = [];
    try {
      const res = await client.execute(
        'SELECT * FROM item_icon_groups ORDER BY sort ASC, id ASC',
      );
      groups = res.rows.map((r) => ({
        id: Number(r.id),
        title: String(r.title ?? r.name ?? ''),
        sort: Number(r.sort ?? 0),
      }));
    } catch {
      // 若无该表或字段不同，忽略
    }

    // 查询卡片列表
    let cards: Array<Record<string, unknown>> = [];
    try {
      const res = await client.execute(
        'SELECT * FROM item_icons ORDER BY sort ASC, id ASC',
      );
      cards = res.rows as Array<Record<string, unknown>>;
    } catch {
      // 容错
    }

    await client.close();

    const groupMap = new Map<number, RawGroup>();
    for (const g of groups) {
      groupMap.set(g.id, {
        title: g.title,
        sort: g.sort,
        children: [],
      });
    }

    const unclassifiedGroup: RawGroup = {
      title: '未分类',
      sort: 99999,
      children: [],
    };

    for (const c of cards) {
      const groupId = Number(c.item_icon_group_id ?? c.itemIconGroupId ?? 0);
      const targetGroup = groupMap.get(groupId) ?? unclassifiedGroup;
      (targetGroup.children as unknown[]).push(c);
    }

    const assembledGroups = [...groupMap.values()];
    if ((unclassifiedGroup.children?.length ?? 0) > 0) {
      assembledGroups.push(unclassifiedGroup);
    }

    return parseSunPanelData({ icons: assembledGroups });
  } finally {
    await unlink(tempPath).catch(() => {});
  }
}

/**
 * 统一文件解析入口（支持 JSON 文本、JSON Buffer 以及 SQLite .db 数据库文件）
 */
export async function parseSunPanelFile(
  content: string | Buffer,
  filename?: string,
): Promise<SunPanelParseResult> {
  const isBuffer = Buffer.isBuffer(content);
  const isSqlite =
    (isBuffer && content.subarray(0, 15).toString() === 'SQLite format 3') ||
    filename?.endsWith('.db') ||
    filename?.endsWith('.sqlite') ||
    filename?.endsWith('.sqlite3');

  if (isSqlite) {
    const buffer = isBuffer ? content : Buffer.from(content);
    return await parseSunPanelSqlite(buffer);
  }

  const text = isBuffer ? content.toString('utf-8') : content;
  return parseSunPanelData(text);
}

/**
 * 将解析后的 Sun-Panel 数据存入数据库
 *
 * - mode = 'overwrite'：清空现有卡片与分类，按导入数据全新建立
 * - mode = 'append'：保留现有卡片与分类，同名分类自动合并追加，新分类排序接在最后
 */
export async function applySunPanelImport(
  parseResult: SunPanelParseResult,
  mode: 'append' | 'overwrite' = 'append',
): Promise<SunPanelImportStats> {
  const { categories, skippedCards } = parseResult;

  return await prisma.$transaction(async (tx) => {
    let categoriesCreated = 0;
    let categoriesReused = 0;
    let cardsCreated = 0;

    if (mode === 'overwrite') {
      await tx.card.deleteMany();
      await tx.category.deleteMany();

      for (let i = 0; i < categories.length; i++) {
        const cat = categories[i];
        const createdCategory = await tx.category.create({
          data: {
            name: cat.name,
            order: i,
          },
        });
        categoriesCreated++;

        if (cat.cards.length > 0) {
          await tx.card.createMany({
            data: cat.cards.map((card, cardIdx) => ({
              name: card.name,
              internalUrl: card.internalUrl,
              externalUrl: card.externalUrl,
              icon: card.icon,
              description: card.description,
              openInDialog: card.openInDialog,
              categoryId: createdCategory.id,
              order: cardIdx,
            })),
          });
          cardsCreated += cat.cards.length;
        }
      }
    } else {
      const existingCategories = await tx.category.findMany({
        orderBy: { order: 'asc' },
      });
      const categoryMap = new Map(existingCategories.map((c) => [c.name, c]));

      let nextCategoryOrder =
        existingCategories.length > 0
          ? Math.max(...existingCategories.map((c) => c.order)) + 1
          : 0;

      for (const cat of categories) {
        let targetCategory = categoryMap.get(cat.name);

        if (!targetCategory) {
          targetCategory = await tx.category.create({
            data: {
              name: cat.name,
              order: nextCategoryOrder++,
            },
          });
          categoryMap.set(cat.name, targetCategory);
          categoriesCreated++;
        } else {
          categoriesReused++;
        }

        if (cat.cards.length > 0) {
          const maxOrderAgg = await tx.card.aggregate({
            _max: { order: true },
            where: { categoryId: targetCategory.id },
          });
          let nextCardOrder = (maxOrderAgg._max.order ?? -1) + 1;

          await tx.card.createMany({
            data: cat.cards.map((card) => ({
              name: card.name,
              internalUrl: card.internalUrl,
              externalUrl: card.externalUrl,
              icon: card.icon,
              description: card.description,
              openInDialog: card.openInDialog,
              categoryId: targetCategory.id,
              order: nextCardOrder++,
            })),
          });
          cardsCreated += cat.cards.length;
        }
      }
    }

    return {
      categoriesCreated,
      categoriesReused,
      cardsCreated,
      skippedCards,
    };
  });
}
