-- CreateTable
CREATE TABLE "PlayoffMatch" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "matchNum" INTEGER NOT NULL,
    "placement" INTEGER,
    "team1Id" TEXT,
    "team1Score" DOUBLE PRECISION,
    "team2Id" TEXT,
    "team2Score" DOUBLE PRECISION,
    "winnerId" TEXT,

    CONSTRAINT "PlayoffMatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlayoffMatch_leagueId_round_matchNum_key" ON "PlayoffMatch"("leagueId", "round", "matchNum");

-- AddForeignKey
ALTER TABLE "PlayoffMatch" ADD CONSTRAINT "PlayoffMatch_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayoffMatch" ADD CONSTRAINT "PlayoffMatch_team1Id_fkey" FOREIGN KEY ("team1Id") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayoffMatch" ADD CONSTRAINT "PlayoffMatch_team2Id_fkey" FOREIGN KEY ("team2Id") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayoffMatch" ADD CONSTRAINT "PlayoffMatch_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
