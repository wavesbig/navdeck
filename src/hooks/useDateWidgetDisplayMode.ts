'use client';

import { useCallback, useEffect, useState } from 'react';
import type { DateDurationDisplayMode } from '@/lib/datetime';

const DISPLAY_MODES: DateDurationDisplayMode[] = ['day', 'month', 'year'];

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
    setDisplayMode(parseDisplayMode(window.localStorage.getItem(storageKey)));
  }, [storageKey]);

  const handleDisplayModeChange = useCallback(
    (value: string) => {
      const nextMode = parseDisplayMode(value);
      setDisplayMode(nextMode);
      window.localStorage.setItem(storageKey, nextMode);
    },
    [storageKey],
  );

  return { displayMode, handleDisplayModeChange };
}
