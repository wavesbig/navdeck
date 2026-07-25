import {describe, it, expect} from 'vitest';
import {searchCards, highlightField} from './search';
import type {Card} from '@/types';

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: 'test-id',
    name: '测试卡片',
    internalUrl: 'http://192.168.1.10:8096',
    externalUrl: 'https://example.com',
    icon: '',
    description: null,
    categoryId: null,
    order: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('searchCards', () => {
  it('空查询返回空数组', () => {
    const cards = [makeCard({name: 'Jellyfin'})];
    expect(searchCards(cards, '')).toEqual([]);
    expect(searchCards(cards, '   ')).toEqual([]);
  });

  it('子串匹配 name（不区分大小写）', () => {
    const cards = [
      makeCard({id: '1', name: 'Jellyfin'}),
      makeCard({id: '2', name: 'Emby'}),
    ];
    const results = searchCards(cards, 'jell');
    expect(results).toHaveLength(1);
    expect(results[0].card.id).toBe('1');
    expect(results[0].matches.some((m) => m.field === 'name')).toBe(true);
  });

  it('子串匹配 url（internalUrl 或 externalUrl）', () => {
    const cards = [
      makeCard({id: '1', externalUrl: 'https://jellyfin.example.com'}),
      makeCard({id: '2', externalUrl: 'https://emby.example.com'}),
    ];
    const results = searchCards(cards, 'jellyfin');
    expect(results).toHaveLength(1);
    expect(results[0].card.id).toBe('1');
    expect(results[0].matches.some((m) => m.field === 'url')).toBe(true);
  });

  it('子串匹配 description', () => {
    const cards = [
      makeCard({id: '1', description: '媒体服务器'}),
      makeCard({id: '2', description: '网盘'}),
    ];
    const results = searchCards(cards, '媒体');
    expect(results).toHaveLength(1);
    expect(results[0].card.id).toBe('1');
    expect(results[0].matches.some((m) => m.field === 'description')).toBe(true);
  });

  it('拼音匹配（全拼）：输入 "beifen" 命中 "备份"', () => {
    const cards = [makeCard({id: '1', name: '备份目录'})];
    const results = searchCards(cards, 'beifen');
    expect(results).toHaveLength(1);
    expect(results[0].card.id).toBe('1');
  });

  it('首字母缩写匹配：输入 "bf" 命中 "备份"', () => {
    const cards = [makeCard({id: '1', name: '备份目录'})];
    const results = searchCards(cards, 'bf');
    expect(results).toHaveLength(1);
    expect(results[0].card.id).toBe('1');
  });

  it('按得分降序排序：name 命中 > url 命中 > description 命中', () => {
    const cards = [
      makeCard({id: 'desc', name: '其他', description: 'jellyfin'}),
      makeCard({id: 'url', name: '其他', externalUrl: 'https://jellyfin.example.com'}),
      makeCard({id: 'name', name: 'Jellyfin'}),
    ];
    const results = searchCards(cards, 'jellyfin');
    expect(results.map((r) => r.card.id)).toEqual(['name', 'url', 'desc']);
  });

  it('多字段同时命中：累计得分更高', () => {
    const cards = [
      makeCard({id: 'multi', name: 'Jellyfin', externalUrl: 'https://jellyfin.example.com'}),
      makeCard({id: 'single', name: 'Jellyfin'}),
    ];
    const results = searchCards(cards, 'jellyfin');
    expect(results[0].card.id).toBe('multi');
    expect(results[0].score).toBeGreaterThan(results[1].score);
  });

  it('无任何命中时返回空数组', () => {
    const cards = [makeCard({name: 'Jellyfin'})];
    expect(searchCards(cards, 'xyz')).toEqual([]);
  });
});

describe('highlightField', () => {
  it('无 match 时返回原文', () => {
    expect(highlightField('Jellyfin', undefined)).toEqual(['Jellyfin']);
  });

  it('有 match 时拆分为 before / highlight / after', () => {
    const result = highlightField('Jellyfin', {start: 0, end: 4});
    expect(result).toEqual([
      '',
      {highlight: 'Jell', key: 'hit'},
      'yfin',
    ]);
  });

  it('match 超出文本长度时安全截断', () => {
    const result = highlightField('Jell', {start: 0, end: 100});
    expect(result).toEqual([
      '',
      {highlight: 'Jell', key: 'hit'},
      '',
    ]);
  });
});
