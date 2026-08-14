import type { LeagueType } from "@prisma/client";
import { prisma } from "../prisma";

export async function getGamesForType(type: LeagueType) {
  const games = await prisma.game.findMany({
    where: {
      league: { type },
      // Sleeper pre-generates the full season's matchups with 0-0
      // placeholder scores before any games are actually played.
      NOT: { homeScore: 0, awayScore: 0 },
    },
    include: {
      league: true,
      homeTeam: { include: { user: true } },
      awayTeam: { include: { user: true } },
    },
    orderBy: [{ season: "desc" }, { week: "desc" }],
  });
  return games;
}
