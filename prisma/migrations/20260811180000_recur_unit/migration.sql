-- 倒数日循环粒度：recurring(Boolean) → recurUnit('week'|'month'|'year'，null=不循环)
-- 保留数据：原 recurring=1 的每年循环项迁为 'year'

ALTER TABLE "date_items" ADD COLUMN "recurUnit" TEXT;

UPDATE "date_items" SET "recurUnit" = 'year' WHERE "recurring" = 1;

ALTER TABLE "date_items" DROP COLUMN "recurring";
