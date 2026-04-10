-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_UserQualification" (
    "user_qualification_id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "position_type_id" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'created',
    "note" TEXT NOT NULL DEFAULT '',
    "document" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserQualification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "UserQualification_position_type_id_fkey" FOREIGN KEY ("position_type_id") REFERENCES "PositionType" ("position_type_id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_UserQualification" ("createdAt", "document", "note", "position_type_id", "status", "updatedAt", "user_id", "user_qualification_id") SELECT "createdAt", "document", "note", "position_type_id", "status", "updatedAt", "user_id", "user_qualification_id" FROM "UserQualification";
DROP TABLE "UserQualification";
ALTER TABLE "new_UserQualification" RENAME TO "UserQualification";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
