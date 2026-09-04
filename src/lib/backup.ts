import { prisma } from '@/lib/db';
import { type BackupData, backupImportSchema } from '@/lib/validation';

/** 当前备份格式版本 */
export const BACKUP_VERSION = 1 as const;

/** 导出全量数据（不含 users 账号与 data/uploads 文件） */
export async function buildExport() {
  const [
    categories,
    cards,
    widgetInstances,
    dateItems,
    searchEngines,
    wallpapers,
    preferences,
  ] = await Promise.all([
    prisma.category.findMany({ orderBy: { order: 'asc' } }),
    prisma.card.findMany({ orderBy: { order: 'asc' } }),
    prisma.widgetInstance.findMany({ orderBy: { order: 'asc' } }),
    prisma.dateItem.findMany(),
    prisma.searchEngine.findMany({ orderBy: { order: 'asc' } }),
    prisma.wallpaper.findMany(),
    prisma.userPreference.findMany({ orderBy: { key: 'asc' } }),
  ]);

  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    categories,
    cards,
    widgetInstances,
    dateItems,
    searchEngines,
    wallpapers,
    preferences,
  };
}

/**
 * 从备份数据还原（事务内清空重建，保留原 id）
 *
 * - 不触碰 users 表（账号/密码不受影响）
 * - 引擎至少 1 个由 backupImportSchema 保证
 * - 日期字符串 → Date（dateItems.date、cards.createdAt/updatedAt）
 */
export async function applyImport(data: BackupData): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // 清空（FK 依赖倒序）
    await tx.dateItem.deleteMany();
    await tx.widgetInstance.deleteMany();
    await tx.card.deleteMany();
    await tx.category.deleteMany();
    await tx.searchEngine.deleteMany();
    await tx.wallpaper.deleteMany();
    await tx.userPreference.deleteMany();

    // 重建（FK 依赖正序，保留原 id）
    await tx.category.createMany({
      data: data.categories.map((c) => ({
        id: c.id,
        name: c.name,
        icon: c.icon ?? null,
        color: c.color ?? null,
        order: c.order,
      })),
    });
    await tx.card.createMany({
      data: data.cards.map((c) => ({
        id: c.id,
        name: c.name,
        internalUrl: c.internalUrl,
        externalUrl: c.externalUrl,
        icon: c.icon,
        description: c.description ?? null,
        categoryId: c.categoryId ?? null,
        order: c.order,
        createdAt: new Date(c.createdAt),
        updatedAt: new Date(c.updatedAt),
        lucky: c.lucky ?? undefined,
      })),
    });
    await tx.widgetInstance.createMany({
      data: data.widgetInstances.map((w) => ({
        id: w.id,
        widgetKey: w.widgetKey,
        order: w.order,
        size: w.size,
      })),
    });
    await tx.dateItem.createMany({
      data: data.dateItems.map((d) => ({
        id: d.id,
        instanceId: d.instanceId,
        widgetKey: d.widgetKey,
        name: d.name,
        date: new Date(d.date),
        recurUnit: d.recurUnit ?? null,
      })),
    });
    await tx.searchEngine.createMany({
      data: data.searchEngines.map((e) => ({
        id: e.id,
        name: e.name,
        urlTemplate: e.urlTemplate,
        iconPath: e.iconPath ?? null,
        order: e.order,
      })),
    });
    if (data.wallpapers.length > 0) {
      await tx.wallpaper.createMany({
        data: data.wallpapers.map((w) => ({
          id: w.id,
          name: w.name,
          source: w.source,
          path: w.path,
          thumbnail: w.thumbnail ?? null,
        })),
      });
    }
    if (data.preferences.length > 0) {
      await tx.userPreference.createMany({
        data: data.preferences.map((p) => ({
          key: p.key,
          value: p.value,
        })),
      });
    }
  });
}

// ============ ZIP 打包（JSON + data/uploads） ============

import { existsSync } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { join, relative, resolve, sep } from 'node:path';
import AdmZip from 'adm-zip';

const UPLOAD_ROOT = join(process.cwd(), 'data', 'uploads');
const RESOLVED_UPLOAD_ROOT = resolve(UPLOAD_ROOT) + sep;
const BACKUP_JSON_NAME = 'backup.json';

/** 递归收集目录内所有文件（相对 UPLOAD_ROOT 的 posix 路径） */
async function collectUploadFiles(dir: string): Promise<string[]> {
  if (!existsSync(dir)) return [];
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectUploadFiles(full)));
    } else {
      files.push(relative(UPLOAD_ROOT, full).replaceAll('\\', '/'));
    }
  }
  return files;
}

/** 导出 zip：backup.json + data/uploads 全部文件 */
export async function buildZip(): Promise<Buffer> {
  const zip = new AdmZip();
  const data = await buildExport();
  zip.addFile(BACKUP_JSON_NAME, Buffer.from(JSON.stringify(data)));

  for (const rel of await collectUploadFiles(UPLOAD_ROOT)) {
    zip.addLocalFile(join(UPLOAD_ROOT, rel), 'data/uploads');
  }
  return zip.toBuffer();
}

/**
 * 从 zip 恢复：读取 backup.json 走常规导入，并还原 data/uploads 文件
 *
 * - 先校验 JSON 再落库/写文件，格式非法直接抛错不产生半套状态
 * - 上传文件按 zip 内 data/uploads/ 结构覆盖写入
 */
export async function applyZipImport(zipBuffer: Buffer): Promise<void> {
  const zip = new AdmZip(zipBuffer);
  const entry = zip.getEntry(BACKUP_JSON_NAME);
  if (!entry) {
    throw new Error('备份缺少 backup.json');
  }
  const parsed = backupImportSchema.safeParse(
    JSON.parse(entry.getData().toString('utf8')),
  );
  if (!parsed.success) {
    throw new Error('备份 JSON 格式不正确');
  }
  const data: BackupData = parsed.data;

  await applyImport(data);

  // 还原上传文件（zip 内 data/uploads/ 前缀 → UPLOAD_ROOT）
  for (const file of zip.getEntries()) {
    if (file.isDirectory || !file.entryName.startsWith('data/uploads/')) {
      continue;
    }
    const rel = file.entryName.slice('data/uploads/'.length);
    const target = resolve(UPLOAD_ROOT, rel);
    // 防 Zip Slip：解析后的路径必须仍位于上传目录内
    if (!target.startsWith(RESOLVED_UPLOAD_ROOT) || rel === '') continue;
    await mkdir(join(target, '..'), { recursive: true });
    await writeFile(target, file.getData());
  }
}
