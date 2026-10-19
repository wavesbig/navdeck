'use client';

import { useCallback, useEffect, useState } from 'react';
import type { DateDurationDisplayMode } from '@/lib/datetime';

const DISPLAY_MODES: DateDurationDisplayMode[] = [
  'day',
  'week',
  'month',
  'year',
  'full',
];

function parseDisplayMode(value: string | null): DateDurationDisplayMode {
  return DISPLAY_MODES.includes(value as DateDurationDisplayMode)
    ? (value as DateDurationDisplayMode)
    : 'day';
}

export function useDateWidgetDisplayMode(instanceId: string) {
  const storageKey = `date-widget-display-mode:${instanceId}`;
  const [displayMode, setDisplayMode] =
    useState<DateDurationDisplayMode>('day');

  useEffect(() => {
    try {
      setDisplayMode(parseDisplayMode(window.localStorage.getItem(storageKey)));
    } catch {
      // 忽略受限环境读取失败
    }
  }, [storageKey]);

  const cycleDisplayMode = useCallback(() => {
    const nextIndex =
      (DISPLAY_MODES.indexOf(displayMode) + 1) % DISPLAY_MODES.length;
    const nextMode = DISPLAY_MODES[nextIndex];
    setDisplayMode(nextMode);
    try {
      window.localStorage.setItem(storageKey, nextMode);
    } catch {
      // 忽略受限环境写入失败
    }
  }, [displayMode, storageKey]);

  return { displayMode, cycleDisplayMode };
}
