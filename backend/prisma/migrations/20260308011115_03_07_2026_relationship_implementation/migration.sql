/*
  Warnings:

  - You are about to drop the column `PositionTypeId` on the `UserQualification` table. All the data in the column will be lost.
  - Added the required column `positionTypeId` to the `UserQualification` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BusinessProfile" (
    "userId" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "businessName" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "isVerified" BOOLEAN NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "postalAddress" TEXT NOT NULL,
    "location" JSONB NOT NULL,
    "avatar" TEXT NOT NULL,
    "biography" TEXT NOT NULL,
    CONSTRAINT "BusinessProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("userId") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_BusinessProfile" ("avatar", "biography", "businessName", "isVerified", "location", "ownerName", "phoneNumber", "postalAddress", "userId") SELECT "avatar", "biography", "businessName", "isVerified", "location", "ownerName", "phoneNumber", "postalAddress", "userId" FROM "BusinessProfile";
DROP TABLE "BusinessProfile";
ALTER TABLE "new_BusinessProfile" RENAME TO "BusinessProfile";
CREATE TABLE "new_JobInterest" (
    "jobInterestId" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "jobId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "candidateInterested" BOOLEAN NOT NULL,
    "businessInvitation" BOOLEAN NOT NULL,
    "invitationStatus" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JobInterest_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "JobPosting" ("jobId") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "JobInterest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("userId") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_JobInterest" ("businessInvitation", "candidateInterested", "createdAt", "invitationStatus", "jobId", "jobInterestId", "updatedAt", "userId") SELECT "businessInvitation", "candidateInterested", "createdAt", "invitationStatus", "jobId", "jobInterestId", "updatedAt", "userId" FROM "JobInterest";
DROP TABLE "JobInterest";
ALTER TABLE "new_JobInterest" RENAME TO "JobInterest";
CREATE TABLE "new_JobPosting" (
    "jobId" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "businessUserId" INTEGER NOT NULL,
    "positionTypeId" INTEGER NOT NULL,
    "minSalary" INTEGER NOT NULL,
    "maxSalary" INTEGER NOT NULL,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME NOT NULL,
    "note" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "filledByUserId" INTEGER,
    "filledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JobPosting_businessUserId_fkey" FOREIGN KEY ("businessUserId") REFERENCES "BusinessProfile" ("userId") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "JobPosting_positionTypeId_fkey" FOREIGN KEY ("positionTypeId") REFERENCES "PositionType" ("positionTypeId") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "JobPosting_filledByUserId_fkey" FOREIGN KEY ("filledByUserId") REFERENCES "User" ("userId") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_JobPosting" ("businessUserId", "createdAt", "endTime", "filledAt", "filledByUserId", "jobId", "maxSalary", "minSalary", "note", "positionTypeId", "startTime", "status", "updatedAt") SELECT "businessUserId", "createdAt", "endTime", "filledAt", "filledByUserId", "jobId", "maxSalary", "minSalary", "note", "positionTypeId", "startTime", "status", "updatedAt" FROM "JobPosting";
DROP TABLE "JobPosting";
ALTER TABLE "new_JobPosting" RENAME TO "JobPosting";
CREATE UNIQUE INDEX "JobPosting_filledByUserId_key" ON "JobPosting"("filledByUserId");
CREATE TABLE "new_RegularProfile" (
    "userId" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "isSuspended" BOOLEAN NOT NULL,
    "isAvailable" BOOLEAN NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "postalAddress" TEXT NOT NULL,
    "birthday" TEXT NOT NULL,
    "avatar" TEXT NOT NULL,
    "resume" TEXT NOT NULL,
    "biography" TEXT NOT NULL,
    CONSTRAINT "RegularProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("userId") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_RegularProfile" ("avatar", "biography", "birthday", "firstName", "isAvailable", "isSuspended", "lastName", "phoneNumber", "postalAddress", "resume", "userId") SELECT "avatar", "biography", "birthday", "firstName", "isAvailable", "isSuspended", "lastName", "phoneNumber", "postalAddress", "resume", "userId" FROM "RegularProfile";
DROP TABLE "RegularProfile";
ALTER TABLE "new_RegularProfile" RENAME TO "RegularProfile";
CREATE TABLE "new_UserQualification" (
    "userQualificationId" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "positionTypeId" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "document" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserQualification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("userId") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "UserQualification_positionTypeId_fkey" FOREIGN KEY ("positionTypeId") REFERENCES "PositionType" ("positionTypeId") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_UserQualification" ("createdAt", "document", "note", "status", "updatedAt", "userId", "userQualificationId") SELECT "createdAt", "document", "note", "status", "updatedAt", "userId", "userQualificationId" FROM "UserQualification";
DROP TABLE "UserQualification";
ALTER TABLE "new_UserQualification" RENAME TO "UserQualification";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
