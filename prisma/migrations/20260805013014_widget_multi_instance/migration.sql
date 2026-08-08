/*
  Warnings:

  - You are about to drop the `widget_configs` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `instanceId` to the `date_items` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "widget_configs_widgetKey_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "widget_configs";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "widget_instances" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "widgetKey" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "size" TEXT NOT NULL DEFAULT 'M'
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_date_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "instanceId" TEXT NOT NULL,
    "widgetKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "recurring" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "date_items_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "widget_instances" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_date_items" ("createdAt", "date", "id", "name", "recurring", "widgetKey") SELECT "createdAt", "date", "id", "name", "recurring", "widgetKey" FROM "date_items";
DROP TABLE "date_items";
ALTER TABLE "new_date_items" RENAME TO "date_items";
CREATE INDEX "date_items_instanceId_idx" ON "date_items"("instanceId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "widget_instances_widgetKey_idx" ON "widget_instances"("widgetKey");
