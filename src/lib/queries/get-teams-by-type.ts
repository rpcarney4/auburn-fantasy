import type { LeagueType } from "@prisma/client";
import { prisma } from "../prisma";
import { compareRosterEntries } from "./_shared";

type SeasonTeams = {
  isHistorical: boolean;
  divisionNames: string[];
  teams: {
    id: string;
    teamName: string | null;
    avatar: string | null;
    wins: number;
    losses: number;
    ties: number;
    division: number | null;
    leagueWins: number;
    user: { id: string; displayName: string; avatar: string | null };
    roster: {
      isStarter: boolean;
      player: { id: string; fullName: string; position: string | null; nflTeam: string | null };
      avgScore: number | null;
    }[];
    taxi: {
      isStarter: boolean;
      player: { id: string; fullName: string; position: string | null; nflTeam: string | null };
      avgScore: number | null;
    }[];
  }[];
};

export async function getTeamsByType(type: LeagueType) {
  const leagues = await prisma.league.findMany({
    where: { type },
    orderBy: { season: "desc" },
  });
  if (leagues.length === 0) {
    return { seasons: [] as number[], bySeason: {} as Record<number, SeasonTeams> };
  }
  const latestSeason = leagues[0].season;

  // Number of championships won by each user across every season of this
  // league type, for the "League Wins" badge.
  const championshipCounts = await prisma.team.groupBy({
    by: ["userId"],
    where: { isChampion: true, league: { type } },
    _count: { _all: true },
  });
  const leagueWinsByUserId = new Map(
    championshipCounts.map((c) => [c.userId, c._count._all])
  );

  const bySeason: Record<number, SeasonTeams> = {};
  for (const league of leagues) {
    const isHistorical = league.season !== latestSeason;

    const unsortedTeams = await prisma.team.findMany({
      where: { leagueId: league.id },
      include: {
        user: true,
        roster: {
          include: { player: true },
          orderBy: [{ isStarter: "desc" }, { player: { position: "asc" } }],
        },
      },
    });
    // Best record first within each division (win% then points for, same
    // tiebreak used for standings elsewhere), rather than alphabetical.
    const winPct = (t: { wins: number; losses: number; ties: number }) => {
      const games = t.wins + t.losses + t.ties;
      return games > 0 ? (t.wins + t.ties * 0.5) / games : 0;
    };
    const teams = [...unsortedTeams].sort((a, b) => {
      const divDiff = (a.division ?? 0) - (b.division ?? 0);
      if (divDiff !== 0) return divDiff;
      const pctDiff = winPct(b) - winPct(a);
      if (pctDiff !== 0) return pctDiff;
      return b.pointsFor - a.pointsFor;
    });

    let avgScoreByTeamPlayer = new Map<string, number>();
    if (isHistorical && teams.length > 0) {
      const scores = await prisma.playerWeekScore.groupBy({
        by: ["teamId", "playerId"],
        where: { teamId: { in: teams.map((t) => t.id) } },
        _avg: { points: true },
      });
      avgScoreByTeamPlayer = new Map(
        scores.map((s) => [`${s.teamId}:${s.playerId}`, s._avg.points ?? 0])
      );
    }

    bySeason[league.season] = {
      isHistorical,
      divisionNames: league.divisionNames,
      teams: teams.map((t) => ({
        id: t.id,
        teamName: t.teamName,
        avatar: t.avatar,
        wins: t.wins,
        losses: t.losses,
        ties: t.ties,
        division: t.division,
        leagueWins: leagueWinsByUserId.get(t.userId) ?? 0,
        user: t.user,
        roster: t.roster
          .filter((r) => !r.isTaxi)
          .map((r) => ({
            isStarter: r.isStarter,
            player: r.player,
            avgScore: isHistorical
              ? (avgScoreByTeamPlayer.get(`${t.id}:${r.playerId}`) ?? null)
              : null,
          }))
          .sort(compareRosterEntries),
        taxi: t.roster
          .filter((r) => r.isTaxi)
          .map((r) => ({
            isStarter: r.isStarter,
            player: r.player,
            avgScore: isHistorical
              ? (avgScoreByTeamPlayer.get(`${t.id}:${r.playerId}`) ?? null)
              : null,
          }))
          .sort(compareRosterEntries),
      })),
    };
  }

  return { seasons: leagues.map((l) => l.season), bySeason };
}
