/*
  Warnings:

  - The primary key for the `BusinessProfile` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `businessName` on the `BusinessProfile` table. All the data in the column will be lost.
  - You are about to drop the column `isVerified` on the `BusinessProfile` table. All the data in the column will be lost.
  - You are about to drop the column `ownerName` on the `BusinessProfile` table. All the data in the column will be lost.
  - You are about to drop the column `phoneNumber` on the `BusinessProfile` table. All the data in the column will be lost.
  - You are about to drop the column `postalAddress` on the `BusinessProfile` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `BusinessProfile` table. All the data in the column will be lost.
  - The primary key for the `JobInterest` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `jobId` on the `JobInterest` table. All the data in the column will be lost.
  - You are about to drop the column `jobInterestId` on the `JobInterest` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `JobInterest` table. All the data in the column will be lost.
  - The primary key for the `JobPosting` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `businessUserId` on the `JobPosting` table. All the data in the column will be lost.
  - You are about to drop the column `endTime` on the `JobPosting` table. All the data in the column will be lost.
  - You are about to drop the column `filledByUserId` on the `JobPosting` table. All the data in the column will be lost.
  - You are about to drop the column `jobId` on the `JobPosting` table. All the data in the column will be lost.
  - You are about to drop the column `maxSalary` on the `JobPosting` table. All the data in the column will be lost.
  - You are about to drop the column `minSalary` on the `JobPosting` table. All the data in the column will be lost.
  - You are about to drop the column `positionTypeId` on the `JobPosting` table. All the data in the column will be lost.
  - You are about to drop the column `startTime` on the `JobPosting` table. All the data in the column will be lost.
  - The primary key for the `PositionType` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `isHidden` on the `PositionType` table. All the data in the column will be lost.
  - You are about to drop the column `positionTypeId` on the `PositionType` table. All the data in the column will be lost.
  - The primary key for the `RegularProfile` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `firstName` on the `RegularProfile` table. All the data in the column will be lost.
  - You are about to drop the column `isAvailable` on the `RegularProfile` table. All the data in the column will be lost.
  - You are about to drop the column `isSuspended` on the `RegularProfile` table. All the data in the column will be lost.
  - You are about to drop the column `lastName` on the `RegularProfile` table. All the data in the column will be lost.
  - You are about to drop the column `phoneNumber` on the `RegularProfile` table. All the data in the column will be lost.
  - You are about to drop the column `postalAddress` on the `RegularProfile` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `RegularProfile` table. All the data in the column will be lost.
  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `activationExpiresAt` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `activationToken` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `isActivated` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `resetExpiresAt` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `User` table. All the data in the column will be lost.
  - The primary key for the `UserQualification` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `positionTypeId` on the `UserQualification` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `UserQualification` table. All the data in the column will be lost.
  - You are about to drop the column `userQualificationId` on the `UserQualification` table. All the data in the column will be lost.
  - Added the required column `business_id` to the `BusinessProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `business_name` to the `BusinessProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `owner_name` to the `BusinessProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `phone_number` to the `BusinessProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `postal_address` to the `BusinessProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `BusinessProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `business_id` to the `JobInterest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `candidate_id` to the `JobInterest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `interest_id` to the `JobInterest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `job_id` to the `JobInterest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `business_id` to the `JobPosting` table without a default value. This is not possible if the table is not empty.
  - Added the required column `end_time` to the `JobPosting` table without a default value. This is not possible if the table is not empty.
  - Added the required column `job_id` to the `JobPosting` table without a default value. This is not possible if the table is not empty.
  - Added the required column `position_type_id` to the `JobPosting` table without a default value. This is not possible if the table is not empty.
  - Added the required column `salary_max` to the `JobPosting` table without a default value. This is not possible if the table is not empty.
  - Added the required column `salary_min` to the `JobPosting` table without a default value. This is not possible if the table is not empty.
  - Added the required column `start_time` to the `JobPosting` table without a default value. This is not possible if the table is not empty.
  - Added the required column `position_type_id` to the `PositionType` table without a default value. This is not possible if the table is not empty.
  - Added the required column `first_name` to the `RegularProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `last_name` to the `RegularProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `regular_id` to the `RegularProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `RegularProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `expiresAt` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `id` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `position_type_id` to the `UserQualification` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `UserQualification` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_qualification_id` to the `UserQualification` table without a default value. This is not possible if the table is not empty.

*/
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
    "avatar" TEXT NOT NULL,
    "biography" TEXT NOT NULL,
    CONSTRAINT "BusinessProfile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_BusinessProfile" ("avatar", "biography", "location") SELECT "avatar", "biography", "location" FROM "BusinessProfile";
DROP TABLE "BusinessProfile";
ALTER TABLE "new_BusinessProfile" RENAME TO "BusinessProfile";
CREATE UNIQUE INDEX "BusinessProfile_user_id_key" ON "BusinessProfile"("user_id");
CREATE TABLE "new_JobInterest" (
    "interest_id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "job_id" INTEGER NOT NULL,
    "candidate_id" INTEGER NOT NULL,
    "candidateInterested" BOOLEAN,
    "business_id" INTEGER NOT NULL,
    "businessInvitation" BOOLEAN,
    "invitationStatus" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JobInterest_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "JobPosting" ("job_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "JobInterest_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "JobInterest_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "BusinessProfile" ("business_id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_JobInterest" ("businessInvitation", "candidateInterested", "createdAt", "invitationStatus", "updatedAt") SELECT "businessInvitation", "candidateInterested", "createdAt", "invitationStatus", "updatedAt" FROM "JobInterest";
DROP TABLE "JobInterest";
ALTER TABLE "new_JobInterest" RENAME TO "JobInterest";
CREATE TABLE "new_JobPosting" (
    "job_id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "business_id" INTEGER NOT NULL,
    "position_type_id" INTEGER NOT NULL,
    "salary_min" INTEGER NOT NULL,
    "salary_max" INTEGER NOT NULL,
    "start_time" DATETIME NOT NULL,
    "end_time" DATETIME NOT NULL,
    "worker_id" INTEGER,
    "note" TEXT,
    "status" TEXT NOT NULL,
    "filledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JobPosting_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "BusinessProfile" ("business_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "JobPosting_position_type_id_fkey" FOREIGN KEY ("position_type_id") REFERENCES "PositionType" ("position_type_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "JobPosting_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_JobPosting" ("createdAt", "filledAt", "note", "status", "updatedAt") SELECT "createdAt", "filledAt", "note", "status", "updatedAt" FROM "JobPosting";
DROP TABLE "JobPosting";
ALTER TABLE "new_JobPosting" RENAME TO "JobPosting";
CREATE UNIQUE INDEX "JobPosting_worker_id_key" ON "JobPosting"("worker_id");
CREATE TABLE "new_PositionType" (
    "position_type_id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "hidden" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_PositionType" ("createdAt", "description", "name", "updatedAt") SELECT "createdAt", "description", "name", "updatedAt" FROM "PositionType";
DROP TABLE "PositionType";
ALTER TABLE "new_PositionType" RENAME TO "PositionType";
CREATE TABLE "new_RegularProfile" (
    "regular_id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "suspended" BOOLEAN NOT NULL DEFAULT false,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "phone_number" TEXT NOT NULL DEFAULT '',
    "postal_address" TEXT NOT NULL DEFAULT '',
    "birthday" TEXT NOT NULL DEFAULT '',
    "avatar" TEXT,
    "resume" TEXT,
    "biography" TEXT,
    CONSTRAINT "RegularProfile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_RegularProfile" ("avatar", "biography", "birthday", "resume") SELECT "avatar", "biography", "birthday", "resume" FROM "RegularProfile";
DROP TABLE "RegularProfile";
ALTER TABLE "new_RegularProfile" RENAME TO "RegularProfile";
CREATE UNIQUE INDEX "RegularProfile_user_id_key" ON "RegularProfile"("user_id");
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "activated" BOOLEAN NOT NULL DEFAULT false,
    "utorid" TEXT,
    "resetToken" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "lastActiveAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_User" ("createdAt", "email", "isAdmin", "lastActiveAt", "password", "resetToken", "role", "updatedAt", "utorid") SELECT "createdAt", "email", "isAdmin", "lastActiveAt", "password", "resetToken", "role", "updatedAt", "utorid" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE TABLE "new_UserQualification" (
    "user_qualification_id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "position_type_id" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "document" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserQualification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "UserQualification_position_type_id_fkey" FOREIGN KEY ("position_type_id") REFERENCES "PositionType" ("position_type_id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_UserQualification" ("createdAt", "document", "note", "status", "updatedAt") SELECT "createdAt", "document", "note", "status", "updatedAt" FROM "UserQualification";
DROP TABLE "UserQualification";
ALTER TABLE "new_UserQualification" RENAME TO "UserQualification";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
