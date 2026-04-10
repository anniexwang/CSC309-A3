-- CreateTable
CREATE TABLE "User" (
    "userId" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "isAdmin" BOOLEAN NOT NULL,
    "isActivated" BOOLEAN NOT NULL,
    "utorid" TEXT NOT NULL,
    "activationToken" TEXT NOT NULL,
    "activationExpiresAt" DATETIME NOT NULL,
    "resetToken" TEXT NOT NULL,
    "resetExpiresAt" DATETIME NOT NULL,
    "lastActiveAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "RegularProfile" (
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
    "biography" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "BusinessProfile" (
    "userId" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "businessName" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "isVerified" BOOLEAN NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "postalAddress" TEXT NOT NULL,
    "location" JSONB NOT NULL,
    "avatar" TEXT NOT NULL,
    "biography" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "PositionType" (
    "positionTypeId" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isHidden" BOOLEAN NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "UserQualification" (
    "userQualificationId" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "PositionTypeId" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "document" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "JobInterest" (
    "jobInterestId" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "jobId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "candidateInterested" BOOLEAN NOT NULL,
    "businessInvitation" BOOLEAN NOT NULL,
    "invitationStatus" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "JobPosting" (
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
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
