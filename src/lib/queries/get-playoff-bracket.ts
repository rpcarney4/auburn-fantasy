import type { LeagueType } from "@prisma/client";
import { prisma } from "../prisma";
import type { PlayoffMatchRow, PlayoffBracketNode } from "../types";

function playoffRoundLabel(placement: number | null, round: number) {
  if (placement === 1) return "Championship";
  if (placement === 3) return "3rd Place";
  if (placement != null) return `${placement}th Place`;
  return `Round ${round}`;
}

// Reconstructs the championship advancement tree by walking backward from
// the title match: a team's "feeder" is whichever previous-round match they
// won. Anything left over (3rd place, 5th place, etc) isn't part of that
// tree and gets returned separately as flat consolation matches.
function buildBracketTree(matches: PlayoffMatchRow[]) {
  const championship =
    matches.find((m) => m.label === "Championship") ??
    [...matches].sort((a, b) => b.round - a.round)[0] ??
    null;
  if (!championship) return { root: null as PlayoffBracketNode | null, consolation: matches };

  const included = new Set<string>();
  const buildNode = (match: PlayoffMatchRow): PlayoffBracketNode => {
    included.add(match.id);
    const feederFor = (teamId: string | undefined) => {
      if (!teamId) return null;
      const feeder = matches.find(
        (m) => m.round === match.round - 1 && m.winnerId === teamId
      );
      return feeder ? buildNode(feeder) : null;
    };
    return {
      match,
      team1Feeder: feederFor(match.team1?.id),
      team2Feeder: feederFor(match.team2?.id),
    };
  };

  const root = buildNode(championship);
  return { root, consolation: matches.filter((m) => !included.has(m.id)) };
}

export async function getPlayoffBracket(type: LeagueType) {
  const leagues = await prisma.league.findMany({
    where: { type },
    orderBy: { season: "desc" },
  });

  const bySeason: Record<
    number,
    { root: PlayoffBracketNode | null; consolation: PlayoffMatchRow[] }
  > = {};
  for (const league of leagues) {
    const matches = await prisma.playoffMatch.findMany({
      where: { leagueId: league.id },
      include: {
        team1: { include: { user: true } },
        team2: { include: { user: true } },
      },
      orderBy: [{ round: "asc" }, { matchNum: "asc" }],
    });
    if (matches.length === 0) continue;

    // Used to link each bracket tile to its box score. Matched by team pair
    // rather than week, since we don't persist which week each round fell
    // on for the bracket itself.
    const playoffGames = await prisma.game.findMany({
      where: { leagueId: league.id, isPlayoffs: true },
    });
    const gameIdByTeamPair = new Map<string, string>();
    for (const g of playoffGames) {
      const key = [g.homeTeamId, g.awayTeamId].sort().join(":");
      gameIdByTeamPair.set(key, g.id);
    }

    const rows: PlayoffMatchRow[] = matches.map((m) => ({
      id: m.id,
      round: m.round,
      label: playoffRoundLabel(m.placement, m.round),
      team1: m.team1
        ? { id: m.team1.id, name: m.team1.teamName || m.team1.user.displayName }
        : null,
      team1Score: m.team1Score,
      team2: m.team2
        ? { id: m.team2.id, name: m.team2.teamName || m.team2.user.displayName }
        : null,
      team2Score: m.team2Score,
      winnerId: m.winnerId,
      gameId:
        m.team1Id && m.team2Id
          ? (gameIdByTeamPair.get([m.team1Id, m.team2Id].sort().join(":")) ?? null)
          : null,
    }));

    bySeason[league.season] = buildBracketTree(rows);
  }

  return {
    seasons: leagues.map((l) => l.season).filter((s) => s in bySeason),
    bySeason,
  };
}
