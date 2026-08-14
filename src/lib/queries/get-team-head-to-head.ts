import type { LeagueType } from "@prisma/client";
import { prisma } from "../prisma";
import type { HeadToHeadRecord } from "../types";

// All-time record (regular season + playoffs, across every season of the
// given league type) against every other owner this user has ever played.
export async function getTeamHeadToHead(
  userId: string
): Promise<Record<LeagueType, HeadToHeadRecord[]>> {
  const teams = await prisma.team.findMany({
    where: { userId },
    include: { league: true },
  });
  if (teams.length === 0) return { DYNASTY: [], REDRAFT: [] };

  const teamIds = teams.map((t) => t.id);
  const typeByTeamId = new Map(teams.map((t) => [t.id, t.league.type]));

  const games = await prisma.game.findMany({
    where: { OR: [{ homeTeamId: { in: teamIds } }, { awayTeamId: { in: teamIds } }] },
    include: {
      homeTeam: { include: { user: true } },
      awayTeam: { include: { user: true } },
    },
    orderBy: [{ season: "asc" }, { week: "asc" }],
  });

  const recordsByType: Record<LeagueType, Map<string, HeadToHeadRecord>> = {
    DYNASTY: new Map(),
    REDRAFT: new Map(),
  };

  for (const g of games) {
    // Sleeper pre-generates the full season's matchups with 0-0 placeholder
    // scores before they're actually played.
    if (g.homeScore === 0 && g.awayScore === 0) continue;

    const isHome = teamIds.includes(g.homeTeamId);
    const isAway = teamIds.includes(g.awayTeamId);
    if (isHome === isAway) continue; // not one of ours, or somehow both

    const type = typeByTeamId.get(isHome ? g.homeTeamId : g.awayTeamId);
    if (!type) continue;

    const myScore = isHome ? g.homeScore : g.awayScore;
    const oppScore = isHome ? g.awayScore : g.homeScore;
    const oppTeam = isHome ? g.awayTeam : g.homeTeam;
    if (oppTeam.userId === userId) continue;

    const map = recordsByType[type];
    const record = map.get(oppTeam.userId) ?? {
      opponentUserId: oppTeam.userId,
      opponentName: oppTeam.user.displayName,
      wins: 0,
      losses: 0,
      ties: 0,
    };
    record.opponentName = oppTeam.user.displayName;
    if (myScore > oppScore) record.wins += 1;
    else if (myScore < oppScore) record.losses += 1;
    else record.ties += 1;
    map.set(oppTeam.userId, record);
  }

  const sortRecords = (map: Map<string, HeadToHeadRecord>) =>
    [...map.values()].sort((a, b) => {
      const games = b.wins + b.losses + b.ties - (a.wins + a.losses + a.ties);
      return games !== 0 ? games : b.wins - a.wins;
    });

  return {
    DYNASTY: sortRecords(recordsByType.DYNASTY),
    REDRAFT: sortRecords(recordsByType.REDRAFT),
  };
}
