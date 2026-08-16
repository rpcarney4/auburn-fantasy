-- CreateEnum
CREATE TYPE "PredictionPick" AS ENUM ('HOME', 'AWAY');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "predictionCode" TEXT;

-- CreateTable
CREATE TABLE "Prediction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "pick" "PredictionPick" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prediction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Prediction_userId_gameId_key" ON "Prediction"("userId", "gameId");

-- CreateIndex
CREATE UNIQUE INDEX "User_predictionCode_key" ON "User"("predictionCode");

-- AddForeignKey
ALTER TABLE "Prediction" ADD CONSTRAINT "Prediction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prediction" ADD CONSTRAINT "Prediction_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

