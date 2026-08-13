-- CreateEnum
CREATE TYPE "RosterTransactionType" AS ENUM ('ADD', 'DROP');

-- AlterTable
ALTER TABLE "Draft" ADD COLUMN     "startTime" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "RosterTransaction" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "sleeperTransactionId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "type" "RosterTransactionType" NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RosterTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RosterTransaction_sleeperTransactionId_playerId_type_key" ON "RosterTransaction"("sleeperTransactionId", "playerId", "type");

-- AddForeignKey
ALTER TABLE "RosterTransaction" ADD CONSTRAINT "RosterTransaction_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RosterTransaction" ADD CONSTRAINT "RosterTransaction_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RosterTransaction" ADD CONSTRAINT "RosterTransaction_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
