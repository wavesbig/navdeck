-- 壁纸简化迁移：一张图适配两种主题
--
-- 1. 数据迁移：把 wallpaperDark（优先）或 wallpaperLight 偏好合并为单个 wallpaper 偏好
-- 2. 删除旧的 wallpaperLight/wallpaperDark 偏好
-- 3. 移除 wallpapers 表的 theme 列

-- 1a. 如果 wallpaperDark 存在，复制到 wallpaper（仅当 wallpaper 不存在时）
INSERT INTO "user_preferences" ("id", "key", "value")
SELECT lower(hex(randomblob(16))), 'wallpaper', "value"
FROM "user_preferences"
WHERE "key" = 'wallpaperDark'
  AND NOT EXISTS (SELECT 1 FROM "user_preferences" WHERE "key" = 'wallpaper');

-- 1b. 如果 wallpaperLight 存在且 wallpaper 仍不存在，复制它
INSERT INTO "user_preferences" ("id", "key", "value")
SELECT lower(hex(randomblob(16))), 'wallpaper', "value"
FROM "user_preferences"
WHERE "key" = 'wallpaperLight'
  AND NOT EXISTS (SELECT 1 FROM "user_preferences" WHERE "key" = 'wallpaper');

-- 2. 删除旧的偏好
DELETE FROM "user_preferences" WHERE "key" IN ('wallpaperLight', 'wallpaperDark');

-- 3. 移除 theme 列（SQLite 3.35.0+ 支持 ALTER TABLE DROP COLUMN）
ALTER TABLE "wallpapers" DROP COLUMN "theme";
