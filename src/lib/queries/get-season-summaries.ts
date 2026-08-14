import { prisma } from "../prisma";
import { ROSTER_SLOTS } from "../constants";
import type { SeasonExtremeTeam, SeasonSummary } from "../types";
import { optimalWeekTotal } from "./_shared";

export async function getSeasonSummaries(): Promise<SeasonSummary[]> {
  const leagues = await prisma.league.findMany({
    include: { teams: { include: { user: true } } },
    orderBy: [{ season: "desc" }, { type: "asc" }],
  });

  const summaries: SeasonSummary[] = [];
  for (const league of leagues) {
    const teamsWithGames = league.teams.filter(
      (t) => t.wins + t.losses + t.ties > 0
    );
    if (teamsWithGames.length === 0) continue;

    const scores = await prisma.playerWeekScore.findMany({
      where: { leagueId: league.id },
      include: { player: true },
    });

    const byTeam = new Map<string, typeof scores>();
    for (const s of scores) {
      const arr = byTeam.get(s.teamId) ?? [];
      arr.push(s);
      byTeam.set(s.teamId, arr);
    }

    const slots = ROSTER_SLOTS[league.type];
    const toExtreme = (t: (typeof league.teams)[number]): SeasonExtremeTeam => ({
      name: t.teamName || t.user.displayName,
      username: t.user.displayName,
      wins: t.wins,
      losses: t.losses,
      ties: t.ties,
      pointsFor: t.pointsFor,
    });

    const withEfficiency = teamsWithGames.map((t) => {
      const teamScores = byTeam.get(t.id) ?? [];
      const byWeek = new Map<number, { points: number; position: string | null }[]>();
      for (const s of teamScores) {
        const week = byWeek.get(s.week) ?? [];
        week.push({ points: s.points, position: s.player.position });
        byWeek.set(s.week, week);
      }
      let pointsForMax = 0;
      for (const weekEntries of byWeek.values()) {
        pointsForMax += optimalWeekTotal(weekEntries, slots);
      }
      return {
        team: t,
        efficiency: pointsForMax > 0 ? t.pointsFor / pointsForMax : null,
      };
    });

    const champion = league.teams.find((t) => t.isChampion);
    const mostEfficient = withEfficiency
      .filter((s) => s.efficiency != null)
      .sort((a, b) => (b.efficiency as number) - (a.efficiency as number))[0];
    const highestScoring = [...teamsWithGames].sort(
      (a, b) => b.pointsFor - a.pointsFor
    )[0];
    const lowestScoring = [...teamsWithGames].sort(
      (a, b) => a.pointsFor - b.pointsFor
    )[0];
    const unluckiest = [...teamsWithGames]
      .filter((t) => {
        const games = t.wins + t.losses + t.ties;
        return (t.wins + t.ties * 0.5) / games < 0.5;
      })
      .sort((a, b) => b.pointsFor - a.pointsFor)[0];

    summaries.push({
      leagueId: league.id,
      season: league.season,
      type: league.type,
      champion: champion ? toExtreme(champion) : null,
      mostEfficient: mostEfficient
        ? { ...toExtreme(mostEfficient.team), efficiency: mostEfficient.efficiency as number }
        : null,
      highestScoring: highestScoring ? toExtreme(highestScoring) : null,
      lowestScoring: lowestScoring ? toExtreme(lowestScoring) : null,
      unluckiest: unluckiest ? toExtreme(unluckiest) : null,
    });
  }

  return summaries;
}
