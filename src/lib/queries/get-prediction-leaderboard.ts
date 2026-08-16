import type { LeagueType } from "@prisma/client";
import { prisma } from "../prisma";
import type { PredictionLeaderboardEntry } from "../types";

// All-time (every season of this league type) accuracy, over every
// decided (non-0-0, regular season) game anyone predicted.
export async function getPredictionLeaderboard(
  type: LeagueType
): Promise<PredictionLeaderboardEntry[]> {
  const predictions = await prisma.prediction.findMany({
    where: {
      game: {
        league: { type },
        isPlayoffs: false,
        NOT: { homeScore: 0, awayScore: 0 },
      },
    },
    include: { game: true, user: true },
  });

  const byUser = new Map<
    string,
    { displayName: string; correct: number; total: number }
  >();
  for (const p of predictions) {
    const entry = byUser.get(p.userId) ?? {
      displayName: p.user.displayName,
      correct: 0,
      total: 0,
    };
    entry.total += 1;
    const actualWinner =
      p.game.homeScore > p.game.awayScore
        ? "HOME"
        : p.game.homeScore < p.game.awayScore
          ? "AWAY"
          : null;
    if (actualWinner && p.pick === actualWinner) entry.correct += 1;
    byUser.set(p.userId, entry);
  }

  return [...byUser.entries()]
    .map(([userId, v]) => ({ userId, ...v }))
    .sort((a, b) => {
      const pctDiff = b.correct / b.total - a.correct / a.total;
      return pctDiff !== 0 ? pctDiff : b.total - a.total;
    });
}
