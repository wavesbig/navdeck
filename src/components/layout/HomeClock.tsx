'use client';

import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { useEffect, useState } from 'react';
import { formatClockDate, formatClockTime, getClockGreeting } from '@/lib/time';

/**
 * 首屏安静时钟。
 *
 * 不加装饰线或图形，只靠点阵大时间、次级信息、椭圆柔光和左右留白建立层级。
 */
export function HomeClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 10_000);
    return () => clearInterval(timer);
  }, []);

  return (
    <VStack
      gap={2}
      width="100%"
      maxWidth={640}
      minHeight={76}
      className="mx-auto justify-end"
      aria-label="当前时间"
    >
      {now ? (
        <HStack
          gap={4}
          justify="between"
          align="end"
          padding={2}
          className="home-clock-halo w-full"
        >
          <time className="home-clock-time">{formatClockTime(now)}</time>
          <span className="home-clock-meta">
            {formatClockDate(now)} · {getClockGreeting(now)}
          </span>
        </HStack>
      ) : (
        <span className="sr-only">正在获取当前时间</span>
      )}
    </VStack>
  );
}
