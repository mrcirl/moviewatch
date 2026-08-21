-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_WatchlistItemPerson" (
    "watchlistItemId" INTEGER NOT NULL,
    "personId" INTEGER NOT NULL,
    "watched" BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY ("watchlistItemId", "personId"),
    CONSTRAINT "WatchlistItemPerson_watchlistItemId_fkey" FOREIGN KEY ("watchlistItemId") REFERENCES "WatchlistItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WatchlistItemPerson_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_WatchlistItemPerson" ("personId", "watchlistItemId") SELECT "personId", "watchlistItemId" FROM "WatchlistItemPerson";
DROP TABLE "WatchlistItemPerson";
ALTER TABLE "new_WatchlistItemPerson" RENAME TO "WatchlistItemPerson";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
