-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_widget_configs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "widgetKey" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "size" TEXT NOT NULL DEFAULT 'M'
);
INSERT INTO "new_widget_configs" ("enabled", "id", "order", "widgetKey") SELECT "enabled", "id", "order", "widgetKey" FROM "widget_configs";
DROP TABLE "widget_configs";
ALTER TABLE "new_widget_configs" RENAME TO "widget_configs";
CREATE UNIQUE INDEX "widget_configs_widgetKey_key" ON "widget_configs"("widgetKey");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
