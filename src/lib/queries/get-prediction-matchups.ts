import type { LeagueType } from "@prisma/client";
import { prisma } from "../prisma";
import { isPredictionDeadlinePassed } from "../prediction-deadline";
import { buildSlotSequence } from "./_shared";
import type { PredictionMatchup, PredictionStarter, PredictionTeamSide } from "../types";

// Orders starters by roster slot (QB, RB1, RB2, ..., FLEX, ...), matching
// the order used on the box score page. There's no score data yet for an
// unplayed week to break ties within an ambiguous slot (e.g. which of two
// RBs is "RB1" vs the FLEX), so ties fall back to the roster's own
// (alphabetical) order for a stable, deterministic result.
function orderStartersBySlot(
  starters: PredictionStarter[],
  leagueType: LeagueType
): PredictionStarter[] {
  const pool = starters.slice();
  const ordered: PredictionStarter[] = [];
  for (const isEligible of buildSlotSequence(leagueType)) {
    const pick = pool.find((p) => isEligible(p.position));
    if (!pick) continue;
    ordered.push(pick);
    pool.splice(pool.indexOf(pick), 1);
  }
  ordered.push(...pool);
  return ordered;
}

// The "current" week for predictions: whatever the earliest regular-season
// week is that still has an unplayed (0-0 placeholder) game. Since the
// whole season's matchups are synced up front, this naturally advances on
// its own as each week's real scores come in — no separate schedule needed.
export async function getPredictionMatchups(type: LeagueType): Promise<{
  season: number | null;
  week: number | null;
  matchups: PredictionMatchup[];
}> {
  const league = await prisma.league.findFirst({
    where: { type },
    orderBy: { season: "desc" },
  });
  if (!league) return { season: null, week: null, matchups: [] };

  const regularSeasonGames = await prisma.game.findMany({
    where: { leagueId: league.id, isPlayoffs: false },
    orderBy: { week: "asc" },
    select: { week: true, homeScore: true, awayScore: true },
  });
  const nextUp = regularSeasonGames.find(
    (g) => g.homeScore === 0 && g.awayScore === 0
  );
  if (!nextUp) return { season: league.season, week: null, matchups: [] };
  const week = nextUp.week;

  const games = await prisma.game.findMany({
    where: { leagueId: league.id, week, isPlayoffs: false },
    include: {
      homeTeam: {
        include: {
          user: true,
          roster: {
            where: { isStarter: true, isTaxi: false },
            include: { player: true },
            orderBy: { player: { fullName: "asc" } },
          },
        },
      },
      awayTeam: {
        include: {
          user: true,
          roster: {
            where: { isStarter: true, isTaxi: false },
            include: { player: true },
            orderBy: { player: { fullName: "asc" } },
          },
        },
      },
    },
  });

  const includeTally = isPredictionDeadlinePassed();
  const tallyByGameId = new Map<string, { home: number; away: number }>();
  if (includeTally) {
    const counts = await prisma.prediction.groupBy({
      by: ["gameId", "pick"],
      where: { gameId: { in: games.map((g) => g.id) } },
      _count: { _all: true },
    });
    for (const c of counts) {
      const entry = tallyByGameId.get(c.gameId) ?? { home: 0, away: 0 };
      if (c.pick === "HOME") entry.home = c._count._all;
      else entry.away = c._count._all;
      tallyByGameId.set(c.gameId, entry);
    }
  }

  const toSide = (team: (typeof games)[number]["homeTeam"]): PredictionTeamSide => ({
    id: team.id,
    name: team.user.displayName,
    avatar: team.avatar,
    starters: orderStartersBySlot(
      team.roster.map((r) => r.player),
      league.type
    ),
  });

  const matchups: PredictionMatchup[] = games.map((g) => ({
    gameId: g.id,
    home: toSide(g.homeTeam),
    away: toSide(g.awayTeam),
    tally: includeTally
      ? (tallyByGameId.get(g.id) ?? { home: 0, away: 0 })
      : null,
  }));

  return { season: league.season, week, matchups };
}
