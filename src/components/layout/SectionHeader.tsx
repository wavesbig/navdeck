import { HStack } from '@astryxdesign/core/HStack';
import type { ReactNode } from 'react';

interface SectionHeaderProps {
  /** 标题前的识别元素（分类徽章 / 图标 chip） */
  icon?: ReactNode;
  /** 标题内容（排版由调用方决定：点阵 eyebrow / Heading） */
  title: ReactNode;
  /** 标题右侧操作（hover 显隐逻辑由调用方控制） */
  actions?: ReactNode;
  /** actions 紧跟标题（inline）或推到行尾（end） */
  actionsAlign?: 'inline' | 'end';
  className?: string;
}

/**
 * 首页分区标题行统一骨架。
 * 排版（点阵 eyebrow / Heading）保留各分区语言，这里只统一结构。
 */
export function SectionHeader({
  icon,
  title,
  actions,
  actionsAlign = 'inline',
  className,
}: SectionHeaderProps) {
  const leading = (
    <HStack gap={1.5} align="center" className="min-w-0">
      {icon}
      {title}
    </HStack>
  );

  if (actionsAlign === 'end') {
    return (
      <div className={`flex items-center justify-between ${className ?? ''}`}>
        {leading}
        {actions}
      </div>
    );
  }

  return (
    <HStack gap={1.5} align="center" className={className}>
      {icon}
      {title}
      {actions}
    </HStack>
  );
}
