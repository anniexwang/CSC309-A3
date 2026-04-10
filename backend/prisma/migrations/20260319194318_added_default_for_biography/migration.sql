-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BusinessProfile" (
    "business_id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "business_name" TEXT NOT NULL,
    "owner_name" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "phone_number" TEXT NOT NULL,
    "postal_address" TEXT NOT NULL,
    "location" JSONB NOT NULL,
    "avatar" TEXT,
    "biography" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "BusinessProfile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_BusinessProfile" ("avatar", "biography", "business_id", "business_name", "location", "owner_name", "phone_number", "postal_address", "user_id", "verified") SELECT "avatar", "biography", "business_id", "business_name", "location", "owner_name", "phone_number", "postal_address", "user_id", "verified" FROM "BusinessProfile";
DROP TABLE "BusinessProfile";
ALTER TABLE "new_BusinessProfile" RENAME TO "BusinessProfile";
CREATE UNIQUE INDEX "BusinessProfile_user_id_key" ON "BusinessProfile"("user_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
