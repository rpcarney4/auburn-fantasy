-- AlterTable
ALTER TABLE "DraftPick" ADD COLUMN     "originalRosterId" INTEGER;

-- AlterTable
ALTER TABLE "TradeAsset" ADD COLUMN     "pickOriginalRosterId" INTEGER,
ADD COLUMN     "pickRound" INTEGER,
ADD COLUMN     "pickSeason" INTEGER;
