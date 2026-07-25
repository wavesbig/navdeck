import 'dotenv/config';
import { prisma } from '../src/lib/db';

async function main() {
  const cats = await prisma.category.findMany({
    include: { cards: true },
    orderBy: { order: 'asc' },
  });
  const uncat = await prisma.card.findMany({
    where: { categoryId: null },
    orderBy: { order: 'asc' },
  });
  console.log('分类数:', cats.length);
  for (const c of cats) {
    console.log('  -', c.name, '卡片数:', c.cards.length);
  }
  console.log('未分类卡片:', uncat.length);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
