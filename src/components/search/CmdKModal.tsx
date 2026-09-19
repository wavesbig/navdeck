'use client';

import {
  CommandPalette,
  CommandPaletteInput,
} from '@astryxdesign/core/CommandPalette';
import { HStack } from '@astryxdesign/core/HStack';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Text } from '@astryxdesign/core/Text';
import { Tooltip } from '@astryxdesign/core/Tooltip';
import type {
  SearchableItem,
  SearchSource,
} from '@astryxdesign/core/Typeahead';
import { VStack } from '@astryxdesign/core/VStack';
import { ExternalLink, X } from 'lucide-react';
import { useCallback, useMemo, useRef } from 'react';
import { DIALOG_WIDTH } from '@/lib/design-tokens';
import { highlightField } from '@/lib/search';
import { type SearchHit, searchApi } from '@/services';
import type { Card } from '@/types';

interface CardSearchItem extends SearchableItem<SearchHit> {}

interface CmdKModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Cmd+K 快捷搜索面板（Astryx CommandPalette）
 *
 * - 全局快捷键 Cmd+K（Mac）/ Ctrl+K（Windows）唤起
 * - 服务端实时搜索（子串 + 拼音 + 首字母缩写），防抖/加载/空态由组件托管
 * - 键盘导航与选中（Enter/点击）由组件托管，选中经 onValueChange 回调跳转
 */
export function CmdKModal({ isOpen, onOpenChange }: CmdKModalProps) {
  // onValueChange 只回传 id，search 时把 id → card 存进 Map 供跳转取用
  const cardsRef = useRef(new Map<string, Card>());

  const searchSource = useMemo<SearchSource<CardSearchItem>>(
    () => ({
      async search(query) {
        const data = await searchApi.search(query);
        cardsRef.current.clear();
        return data.items.map((hit) => {
          cardsRef.current.set(hit.card.id, hit.card);
          return {
            id: hit.card.id,
            label: hit.card.name,
            auxiliaryData: hit,
          };
        });
      },
      bootstrap() {
        return [];
      },
    }),
    [],
  );

  const handleValueChange = useCallback(
    (value: string) => {
      const card = cardsRef.current.get(value);
      if (!card) return;
      const url = card.externalUrl || card.internalUrl;
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
      onOpenChange(false);
    },
    [onOpenChange],
  );

  const renderItem = useCallback((item: CardSearchItem) => {
    const data = item.auxiliaryData;
    if (!data) return null;
    const { card, matches } = data;
    const nameMatch = matches.find((m) => m.field === 'name');
    const urlMatch = matches.find((m) => m.field === 'url');
    const urlText = card.externalUrl || card.internalUrl;
    const nameParts = highlightField(card.name, nameMatch);
    const urlParts = highlightField(urlText, urlMatch);
    return (
      <HStack gap={3} align="center" width="100%">
        <ExternalLink size={14} className="shrink-0 text-secondary" />
        <VStack gap={0.5} className="min-w-0 flex-1 text-left">
          <Tooltip content={card.name}>
            <Text className="truncate">
              {nameParts.map((part) =>
                typeof part === 'string' ? (
                  part
                ) : (
                  <mark
                    key={part.highlight}
                    className="rounded bg-highlight px-0.5"
                  >
                    {part.highlight}
                  </mark>
                ),
              )}
            </Text>
          </Tooltip>
          {urlText && (
            <Tooltip content={urlText}>
              <Text color="secondary" className="truncate text-xs">
                {urlParts.map((part) =>
                  typeof part === 'string' ? (
                    part
                  ) : (
                    <mark
                      key={part.highlight}
                      className="rounded bg-highlight px-0.5"
                    >
                      {part.highlight}
                    </mark>
                  ),
                )}
              </Text>
            </Tooltip>
          )}
          {card.description && (
            <Tooltip content={card.description}>
              <Text color="secondary" className="truncate text-xs">
                {card.description}
              </Text>
            </Tooltip>
          )}
        </VStack>
      </HStack>
    );
  }, []);

  return (
    <CommandPalette
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      label="搜索卡片"
      searchSource={searchSource}
      onValueChange={handleValueChange}
      renderItem={renderItem}
      width={DIALOG_WIDTH.lg}
      maxHeight="60vh"
      emptyBootstrapText="输入关键词搜索卡片，支持拼音 / 首字母缩写"
      emptySearchText="未找到匹配的卡片"
      input={
        <CommandPaletteInput
          placeholder="输入卡片名称、URL 或描述"
          endContent={
            <IconButton
              label="关闭"
              icon={<X size={16} />}
              variant="ghost"
              onClick={() => onOpenChange(false)}
            />
          }
        />
      }
    />
  );
}
