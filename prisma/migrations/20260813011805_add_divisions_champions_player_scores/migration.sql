-- AlterTable
ALTER TABLE "League" ADD COLUMN     "divisionNames" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "division" INTEGER,
ADD COLUMN     "isChampion" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "PlayerWeekScore" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "points" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "PlayerWeekScore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlayerWeekScore_teamId_playerId_week_key" ON "PlayerWeekScore"("teamId", "playerId", "week");

-- AddForeignKey
ALTER TABLE "PlayerWeekScore" ADD CONSTRAINT "PlayerWeekScore_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerWeekScore" ADD CONSTRAINT "PlayerWeekScore_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerWeekScore" ADD CONSTRAINT "PlayerWeekScore_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
