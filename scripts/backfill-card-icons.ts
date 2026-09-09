import 'dotenv/config';
import { prisma } from '../src/lib/db';
import { fetchCachedFavicon } from '../src/lib/favicon-cache';

const CONCURRENCY = 3;

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function isCachedOrLibraryIcon(value: string): boolean {
  return (
    value.startsWith('/api/icons/file?path=cards/') ||
    value.startsWith('/icons/')
  );
}

function isSameOriginIcon(value: string, sourceUrls: string[]): boolean {
  if (!isHttpUrl(value)) return false;

  try {
    const iconOrigin = new URL(value).origin;
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

/**
 * 只回填“未自定义”的历史 icon：
 * - 空 icon：一定没自定义
 * - 与内/外网同源的绝对 icon：旧版自动抓取留下的内网地址
 * - 旧 Google S2 图标：历史自动兜底
 *
 * 上传、图标库和任意自定义外链都不修改。
 */
function shouldBackfill(
  icon: string,
  internalUrl: string,
  externalUrl: string,
) {
  if (!icon) return true;
  if (isCachedOrLibraryIcon(icon)) return false;
  if (icon.includes('www.google.com/s2/favicons')) return true;
  return isSameOriginIcon(icon, [internalUrl, externalUrl]);
}

async function main() {
  const cards = await prisma.card.findMany({
    select: {
      id: true,
      name: true,
      icon: true,
      internalUrl: true,
      externalUrl: true,
    },
    orderBy: { order: 'asc' },
  });

  const candidates = cards.filter((card) =>
    shouldBackfill(card.icon, card.internalUrl, card.externalUrl),
  );

  console.log(
    `NavDeck icon backfill: ${candidates.length}/${cards.length} 张卡片需要回填`,
  );
  if (candidates.length === 0) return;

  let updated = 0;
  let failed = 0;
  let cursor = 0;

  async function worker() {
    while (cursor < candidates.length) {
      const card = candidates[cursor];
      cursor += 1;

      try {
        const favicon = await fetchCachedFavicon(
          card.internalUrl,
          card.externalUrl,
        );
        if (!favicon) {
          failed += 1;
          console.warn(`icon 回填失败（跳过）：${card.name}`);
          continue;
        }

        await prisma.card.update({
          where: { id: card.id },
          data: { icon: favicon.url },
        });
        updated += 1;
        console.log(`icon 回填成功：${card.name}`);
      } catch (error) {
        failed += 1;
        console.warn(
          `icon 回填异常（跳过）：${card.name}`,
          error instanceof Error ? error.message : error,
        );
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, candidates.length) }, worker),
  );

  console.log(`NavDeck icon backfill: 完成，成功 ${updated}，失败 ${failed}`);
}

main()
  .catch((error) => {
    console.error('NavDeck icon backfill: 执行异常', error);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
