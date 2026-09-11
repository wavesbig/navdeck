-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_cards" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "internalUrl" TEXT NOT NULL,
    "externalUrl" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "description" TEXT,
    "openInDialog" BOOLEAN NOT NULL DEFAULT false,
    "categoryId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lucky" JSONB,
    CONSTRAINT "cards_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_cards" ("categoryId", "createdAt", "description", "externalUrl", "icon", "id", "internalUrl", "lucky", "name", "order", "updatedAt") SELECT "categoryId", "createdAt", "description", "externalUrl", "icon", "id", "internalUrl", "lucky", "name", "order", "updatedAt" FROM "cards";
DROP TABLE "cards";
ALTER TABLE "new_cards" RENAME TO "cards";
CREATE INDEX "cards_categoryId_idx" ON "cards"("categoryId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
