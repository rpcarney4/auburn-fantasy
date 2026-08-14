import { LeagueType } from "@prisma/client";
import { prisma } from "../prisma";

export async function getLeagueSummary() {
  const [userCount, dynastySeasons, redraftSeasons, tradeCount] =
    await Promise.all([
      prisma.user.count(),
      prisma.league.findMany({
        where: { type: LeagueType.DYNASTY },
        select: { season: true },
        orderBy: { season: "desc" },
      }),
      prisma.league.findMany({
        where: { type: LeagueType.REDRAFT },
        select: { season: true },
        orderBy: { season: "desc" },
      }),
      prisma.trade.count(),
    ]);

  return {
    userCount,
    dynastySeasons: dynastySeasons.map((s) => s.season),
    redraftSeasons: redraftSeasons.map((s) => s.season),
    tradeCount,
  };
}
