import type { LeagueType } from "@prisma/client";
import { prisma } from "../prisma";
import { ROSTER_SLOTS } from "../constants";
import { compareRosterEntries, optimalWeekTotal } from "./_shared";

type ScheduleEntry = {
  week: number;
  opponentName: string;
  ownScore: number;
  opponentScore: number;
  // null means the game hasn't been played yet (Sleeper pre-generates the
  // full season's matchups with 0-0 placeholder scores).
  result: "W" | "L" | "T" | null;
};

type TeamSeasonStats = {
  gamesPlayed: number;
  weeklyScores: { week: number; points: number; isPlayoffs: boolean }[];
  schedule: ScheduleEntry[];
  pointsForMax: number;
  pointsForAvg: number | null;
  efficiency: number | null;
  benchPoints: number;
  rosterAverage: number | null;
  playerOfSeason: {
    id: string;
    fullName: string;
    position: string | null;
    totalPoints: number;
  } | null;
};

export async function getTeamDetail(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;

  const teams = await prisma.team.findMany({
    where: { userId },
    include: {
      league: true,
      roster: {
        include: { player: true },
        orderBy: [{ isStarter: "desc" }, { player: { position: "asc" } }],
      },
    },
    orderBy: [{ league: { season: "desc" } }],
  });

  const latestSeasonByType = new Map<LeagueType, number>();
  for (const t of teams) {
    const current = latestSeasonByType.get(t.league.type);
    if (current === undefined || t.league.season > current) {
      latestSeasonByType.set(t.league.type, t.league.season);
    }
  }

  // Every player-week score for every team-season this owner has had, plus
  // per-team game counts, used to derive the stat box on the right.
  const statsByTeamId = new Map<string, TeamSeasonStats>();
  const avgScoreByTeamId = new Map<string, Map<string, number>>();
  for (const t of teams) {
    const [scores, games] = await Promise.all([
      prisma.playerWeekScore.findMany({
        where: { teamId: t.id },
        include: { player: true },
      }),
      prisma.game.findMany({
        where: { leagueId: t.leagueId, OR: [{ homeTeamId: t.id }, { awayTeamId: t.id }] },
        include: {
          homeTeam: { include: { user: true } },
          awayTeam: { include: { user: true } },
        },
        orderBy: { week: "asc" },
      }),
    ]);
    // Team.pointsFor (from Sleeper) only ever covers regular-season weeks,
    // so gamesPlayed has to match that scope too, or "Points For (Avg)"
    // silently divides by too many games.
    const gamesPlayed = games.filter((g) => !g.isPlayoffs).length;
    const weeklyScores = games.map((g) => ({
      week: g.week,
      points: g.homeTeamId === t.id ? g.homeScore : g.awayScore,
      isPlayoffs: g.isPlayoffs,
    }));
    const schedule: ScheduleEntry[] = games
      .filter((g) => !g.isPlayoffs)
      .map((g) => {
        const isHome = g.homeTeamId === t.id;
        const ownScore = isHome ? g.homeScore : g.awayScore;
        const opponentScore = isHome ? g.awayScore : g.homeScore;
        const opponentTeam = isHome ? g.awayTeam : g.homeTeam;
        const unplayed = g.homeScore === 0 && g.awayScore === 0;
        return {
          week: g.week,
          opponentName: opponentTeam.user.displayName,
          ownScore,
          opponentScore,
          result: unplayed
            ? null
            : ownScore > opponentScore
              ? ("W" as const)
              : ownScore < opponentScore
                ? ("L" as const)
                : ("T" as const),
        };
      });

    const byPlayer = new Map<
      string,
      { player: { id: string; fullName: string; position: string | null }; total: number; weeks: number }
    >();
    let benchPoints = 0;
    const byWeek = new Map<number, { points: number; position: string | null }[]>();
    for (const s of scores) {
      const entry = byPlayer.get(s.playerId) ?? { player: s.player, total: 0, weeks: 0 };
      entry.total += s.points;
      entry.weeks += 1;
      byPlayer.set(s.playerId, entry);

      if (!s.isStarter) benchPoints += s.points;

      const week = byWeek.get(s.week) ?? [];
      week.push({ points: s.points, position: s.player.position });
      byWeek.set(s.week, week);
    }

    const avgScoreByPlayerId = new Map(
      [...byPlayer].map(([id, v]) => [id, v.total / v.weeks])
    );
    avgScoreByTeamId.set(t.id, avgScoreByPlayerId);

    const playerOfSeason =
      [...byPlayer.values()].sort((a, b) => b.total - a.total)[0] ?? null;

    const rosterAverage =
      byPlayer.size > 0
        ? [...avgScoreByPlayerId.values()].reduce((sum, v) => sum + v, 0) / byPlayer.size
        : null;

    const slots = ROSTER_SLOTS[t.league.type];
    let pointsForMax = 0;
    for (const weekEntries of byWeek.values()) {
      pointsForMax += optimalWeekTotal(weekEntries, slots);
    }

    statsByTeamId.set(t.id, {
      gamesPlayed,
      weeklyScores,
      schedule,
      pointsForMax,
      pointsForAvg: gamesPlayed > 0 ? t.pointsFor / gamesPlayed : null,
      efficiency: pointsForMax > 0 ? t.pointsFor / pointsForMax : null,
      benchPoints,
      rosterAverage,
      playerOfSeason: playerOfSeason
        ? {
            id: playerOfSeason.player.id,
            fullName: playerOfSeason.player.fullName,
            position: playerOfSeason.player.position,
            totalPoints: playerOfSeason.total,
          }
        : null,
    });
  }

  const career = teams.reduce(
    (acc, t) => {
      acc.wins += t.wins;
      acc.losses += t.losses;
      acc.ties += t.ties;
      acc.championships += t.isChampion ? 1 : 0;
      return acc;
    },
    { wins: 0, losses: 0, ties: 0, championships: 0 }
  );

  return {
    user: { id: user.id, displayName: user.displayName, avatar: user.avatar },
    career,
    seasons: teams.map((t) => ({
      teamId: t.id,
      season: t.league.season,
      leagueType: t.league.type,
      isHistorical: t.league.season !== latestSeasonByType.get(t.league.type),
      divisionName:
        t.division != null
          ? (t.league.divisionNames[t.division - 1] ?? `Division ${t.division}`)
          : null,
      teamName: t.teamName,
      wins: t.wins,
      losses: t.losses,
      ties: t.ties,
      pointsFor: t.pointsFor,
      pointsAgainst: t.pointsAgainst,
      isChampion: t.isChampion,
      roster: t.roster
        .filter((r) => !r.isTaxi)
        .map((r) => ({
          isStarter: r.isStarter,
          player: r.player,
          avgScore: avgScoreByTeamId.get(t.id)?.get(r.playerId) ?? null,
        }))
        .sort(compareRosterEntries),
      taxi: t.roster
        .filter((r) => r.isTaxi)
        .map((r) => ({
          isStarter: r.isStarter,
          player: r.player,
          avgScore: avgScoreByTeamId.get(t.id)?.get(r.playerId) ?? null,
        }))
        .sort(compareRosterEntries),
      stats: statsByTeamId.get(t.id) as TeamSeasonStats,
    })),
  };
}
