-- CreateTable
CREATE TABLE "search_engines" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "urlTemplate" TEXT NOT NULL,
    "iconPath" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0
);
