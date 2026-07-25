import {pinyin} from 'pinyin-pro';
import type {Card} from '@/types';

/**
 * 搜索匹配工具
 *
 * 匹配规则（按优先级）：
 * 1. 子串匹配（不区分大小写）：name / internalUrl / externalUrl / description
 * 2. 拼音匹配（全拼）：输入 "beifen" 命中 "备份"
 * 3. 首字母缩写匹配：输入 "bf" 命中 "备份"
 *
 * 三种规则任一命中即视为匹配，匹配字段返回命中信息用于高亮。
 */

export interface SearchMatch {
  /** 命中字段：name / url / description */
  field: 'name' | 'url' | 'description';
  /** 命中片段起始位置（用于高亮） */
  start: number;
  /** 命中片段结束位置 */
  end: number;
}

export interface SearchResult {
  card: Card;
  /** 命中信息列表（多个字段可同时命中） */
  matches: SearchMatch[];
  /** 综合得分（用于排序，分数越高越靠前） */
  score: number;
}

/** 字段权重（name 最高，url 次之，description 最低） */
const FIELD_WEIGHT = {
  name: 10,
  url: 5,
  description: 3,
} as const;

/**
 * 单字段匹配：返回首个命中位置（子串优先，其次拼音全拼，最后首字母缩写）
 *
 * @returns 命中区间，未命中返回 null
 */
function matchField(
  text: string,
  query: string
): {start: number; end: number; priority: number} | null {
  if (!text || !query) return null;

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();

  // 1. 子串匹配（最高优先级）
  const idx = lowerText.indexOf(lowerQuery);
  if (idx >= 0) {
    return {start: idx, end: idx + query.length, priority: 3};
  }

  // 2. 首字母缩写匹配（取每个汉字的首字母拼成字符串，再子串匹配）
  // 例如 "备份目录" → "bfdm"，输入 "bf" 命中
  const initials = getPinyinInitials(text);
  const initIdx = initials.toLowerCase().indexOf(lowerQuery);
  if (initIdx >= 0) {
    // 把 initials 的位置映射回原文位置（近似：每个汉字对应 1 个字符）
    return {start: initIdx, end: initIdx + query.length, priority: 2};
  }

  // 3. 全拼匹配（不带声调的拼音字符串子串匹配）
  // 例如 "备份" → "beifen"，输入 "beifen" 命中
  const fullPinyin = getFullPinyin(text);
  const pyIdx = fullPinyin.toLowerCase().indexOf(lowerQuery);
  if (pyIdx >= 0) {
    // 拼音位置无法精确映射回原文，退而求其次高亮前 N 个字符
    return {start: 0, end: Math.min(text.length, query.length), priority: 1};
  }

  return null;
}

/** 获取字符串的全拼（不带声调） */
function getFullPinyin(text: string): string {
  try {
    return pinyin(text, {toneType: 'none', type: 'array'}).join('');
  } catch {
    return '';
  }
}

/** 获取字符串的拼音首字母缩写 */
function getPinyinInitials(text: string): string {
  try {
    return pinyin(text, {pattern: 'first', toneType: 'none', type: 'array'}).join('');
  } catch {
    return '';
  }
}

/**
 * 在卡片列表上执行搜索
 *
 * @param cards 卡片列表
 * @param query 搜索词
 * @returns 命中的卡片（带命中信息），按得分降序排序
 */
export function searchCards(cards: Card[], query: string): SearchResult[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const results: SearchResult[] = [];

  for (const card of cards) {
    const matches: SearchMatch[] = [];
    let score = 0;

    const nameMatch = matchField(card.name, trimmed);
    if (nameMatch) {
      matches.push({field: 'name', ...nameMatch});
      score += FIELD_WEIGHT.name * nameMatch.priority;
    }

    // url 字段：同时尝试 internalUrl 和 externalUrl，任一命中即计入（仅取第一个命中）
    const urlTexts = [card.internalUrl, card.externalUrl].filter(Boolean) as string[];
    for (const urlText of urlTexts) {
      const urlMatch = matchField(urlText, trimmed);
      if (urlMatch) {
        matches.push({field: 'url', ...urlMatch});
        score += FIELD_WEIGHT.url * urlMatch.priority;
        break; // 只取第一个命中
      }
    }

    if (card.description) {
      const descMatch = matchField(card.description, trimmed);
      if (descMatch) {
        matches.push({field: 'description', ...descMatch});
        score += FIELD_WEIGHT.description * descMatch.priority;
      }
    }

    if (matches.length > 0) {
      results.push({card, matches, score});
    }
  }

  return results.sort((a, b) => b.score - a.score);
}

/**
 * 高亮单个字段：把命中区间包成 <mark>
 *
 * @param text 原文
 * @param match 命中区间（来自 SearchResult.matches）
 * @returns React 节点数组（字符串 + mark 标记）
 */
export function highlightField(
  text: string,
  match: {start: number; end: number} | undefined
): Array<string | {highlight: string; key: string}> {
  if (!match || match.start >= text.length) {
    return [text];
  }
  const safeEnd = Math.min(match.end, text.length);
  const before = text.slice(0, match.start);
  const hit = text.slice(match.start, safeEnd);
  const after = text.slice(safeEnd);
  return [
    before,
    {highlight: hit, key: 'hit'},
    after,
  ];
}
