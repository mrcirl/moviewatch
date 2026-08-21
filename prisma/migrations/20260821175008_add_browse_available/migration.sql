-- AlterTable
ALTER TABLE "Movie" ADD COLUMN "genres" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_WatchlistItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "movieId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'WANT_TO_WATCH',
    "notes" TEXT,
    "rating" INTEGER,
    "imported" BOOLEAN NOT NULL DEFAULT false,
    "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "watchedAt" DATETIME,
    CONSTRAINT "WatchlistItem_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_WatchlistItem" ("addedAt", "id", "movieId", "notes", "rating", "status", "watchedAt") SELECT "addedAt", "id", "movieId", "notes", "rating", "status", "watchedAt" FROM "WatchlistItem";
DROP TABLE "WatchlistItem";
ALTER TABLE "new_WatchlistItem" RENAME TO "WatchlistItem";
CREATE UNIQUE INDEX "WatchlistItem_movieId_key" ON "WatchlistItem"("movieId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
