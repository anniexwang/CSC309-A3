-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_JobInterest" (
    "interest_id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "job_id" INTEGER NOT NULL,
    "candidate_id" INTEGER NOT NULL,
    "candidateInterested" BOOLEAN,
    "business_id" INTEGER NOT NULL,
    "businessInvitation" BOOLEAN,
    "invitationStatus" TEXT NOT NULL DEFAULT 'open',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JobInterest_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "JobPosting" ("job_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "JobInterest_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "JobInterest_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "BusinessProfile" ("business_id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_JobInterest" ("businessInvitation", "business_id", "candidateInterested", "candidate_id", "createdAt", "interest_id", "invitationStatus", "job_id", "updatedAt") SELECT "businessInvitation", "business_id", "candidateInterested", "candidate_id", "createdAt", "interest_id", "invitationStatus", "job_id", "updatedAt" FROM "JobInterest";
DROP TABLE "JobInterest";
ALTER TABLE "new_JobInterest" RENAME TO "JobInterest";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
