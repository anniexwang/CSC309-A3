-- CreateTable
CREATE TABLE "Negotiation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "interest_id" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "candidateDecision" TEXT,
    "businessDecision" TEXT,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Negotiation_interest_id_fkey" FOREIGN KEY ("interest_id") REFERENCES "JobInterest" ("interest_id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Negotiation_interest_id_key" ON "Negotiation"("interest_id");
