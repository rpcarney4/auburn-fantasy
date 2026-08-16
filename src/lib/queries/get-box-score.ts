import type { LeagueType } from "@prisma/client";
import { prisma } from "../prisma";
import { POSITION_ORDER } from "../constants";
import { buildSlotSequence } from "./_shared";

// Curated stat lines per position, pulled from the raw Sleeper stat keys
// stored on PlayerWeekScore.stats. Values are rounded since Sleeper reports
// them as floats even though they're always whole counts/yards in practice.
function boxScoreStatLines(
  position: string | null,
  stats: Record<string, number> | null
): { label: string; value: string }[] {
  if (!stats) return [];
  const n = (key: string) => Math.round(stats[key] ?? 0);

  switch (position) {
    case "QB":
      return [
        { label: "Comp/Att", value: `${n("pass_cmp")}/${n("pass_att")}` },
        { label: "Pass Yds", value: `${n("pass_yd")}` },
        { label: "Pass TD", value: `${n("pass_td")}` },
        { label: "INT", value: `${n("pass_int")}` },
        { label: "Rush Yds", value: `${n("rush_yd")}` },
        { label: "Rush TD", value: `${n("rush_td")}` },
      ];
    case "RB":
      return [
        { label: "Rush Att", value: `${n("rush_att")}` },
        { label: "Rush Yds", value: `${n("rush_yd")}` },
        { label: "Rush TD", value: `${n("rush_td")}` },
        { label: "Rec", value: `${n("rec")}` },
        { label: "Rec Yds", value: `${n("rec_yd")}` },
        { label: "Rec TD", value: `${n("rec_td")}` },
      ];
    case "WR":
    case "TE":
      return [
        { label: "Rec", value: `${n("rec")}/${n("rec_tgt")}` },
        { label: "Rec Yds", value: `${n("rec_yd")}` },
        { label: "Rec TD", value: `${n("rec_td")}` },
      ];
    case "K":
      return [
        { label: "FG", value: `${n("fgm")}/${n("fga")}` },
        { label: "XP", value: `${n("xpm")}/${n("xpa")}` },
      ];
    case "DEF":
      return [
        { label: "Sacks", value: `${n("sack")}` },
        { label: "INT", value: `${n("int")}` },
        { label: "Fum Rec", value: `${n("fum_rec")}` },
        { label: "TD", value: `${n("td")}` },
        { label: "Pts Allowed", value: `${n("pts_allow")}` },
      ];
    default:
      return [];
  }
}

// Orders actual starters by roster slot (QB1, RB1, RB2, ..., FLEX, ...)
// rather than by position group. Since we only know who started, not which
// literal slot (WR2 vs FLEX) they were in, each slot in sequence claims the
// highest-scoring remaining eligible starter — a reasonable, deterministic
// stand-in for the real (unrecorded) slot assignment.
function orderStartersBySlot<T extends { position: string | null; points: number }>(
  starters: T[],
  leagueType: LeagueType
): T[] {
  const pool = starters.slice();
  const ordered: T[] = [];
  for (const isEligible of buildSlotSequence(leagueType)) {
    const eligible = pool.filter((p) => isEligible(p.position)).sort((a, b) => b.points - a.points);
    const pick = eligible[0];
    if (!pick) continue;
    ordered.push(pick);
    pool.splice(pool.indexOf(pick), 1);
  }
  ordered.push(...pool); // any leftovers (shouldn't normally happen)
  return ordered;
}

export async function getBoxScore(gameId: string) {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      league: true,
      homeTeam: { include: { user: true } },
      awayTeam: { include: { user: true } },
    },
  });
  if (!game) return null;

  const scores = await prisma.playerWeekScore.findMany({
    where: {
      week: game.week,
      teamId: { in: [game.homeTeamId, game.awayTeamId] },
    },
    include: { player: true },
  });

  const compareBenchEntries = (
    a: { position: string | null; points: number },
    b: { position: string | null; points: number }
  ) => {
    const rank = (position: string | null) => {
      const idx = position ? POSITION_ORDER.indexOf(position) : -1;
      return idx === -1 ? POSITION_ORDER.length : idx;
    };
    const rankDiff = rank(a.position) - rank(b.position);
    if (rankDiff !== 0) return rankDiff;
    return b.points - a.points;
  };

  const buildPlayers = (teamId: string) => {
    const players = scores
      .filter((s) => s.teamId === teamId)
      .map((s) => ({
        id: s.player.id,
        fullName: s.player.fullName,
        position: s.player.position,
        nflTeam: s.player.nflTeam,
        points: s.points,
        isStarter: s.isStarter,
        statLines: boxScoreStatLines(
          s.player.position,
          s.stats as Record<string, number> | null
        ),
      }));
    const starters = orderStartersBySlot(
      players.filter((p) => p.isStarter),
      game.league.type
    );
    const bench = players.filter((p) => !p.isStarter).sort(compareBenchEntries);
    return [...starters, ...bench];
  };

  // Pairs each player against their opposite-team counterpart at the same
  // slot, so the UI can mark whether that slot was won or lost. Starters are
  // paired by roster-slot order (both teams' starters are already ordered
  // QB, RB1, RB2, ..., FLEX, ... by orderStartersBySlot), not by position —
  // otherwise a WR filling the FLEX slot would never get matched against an
  // RB filling the opponent's FLEX slot. Bench players have no slot order,
  // so they're still paired by same-position rank.
  const withMatchupResults = (
    players: ReturnType<typeof buildPlayers>,
    opponents: ReturnType<typeof buildPlayers>
  ) => {
    const opponentStarters = opponents.filter((o) => o.isStarter);
    const benchKey = (p: (typeof players)[number]) => p.position ?? "";
    const opponentBenchSeen = new Map<string, number>();
    const opponentsByBenchSlot = new Map<string, (typeof opponents)[number]>();
    for (const o of opponents) {
      if (o.isStarter) continue;
      const key = benchKey(o);
      const idx = opponentBenchSeen.get(key) ?? 0;
      opponentBenchSeen.set(key, idx + 1);
      opponentsByBenchSlot.set(`${key}#${idx}`, o);
    }

    let starterIdx = 0;
    const benchSeen = new Map<string, number>();
    return players.map((p) => {
      let opponent: (typeof opponents)[number] | undefined;
      if (p.isStarter) {
        opponent = opponentStarters[starterIdx];
        starterIdx += 1;
      } else {
        const key = benchKey(p);
        const idx = benchSeen.get(key) ?? 0;
        benchSeen.set(key, idx + 1);
        opponent = opponentsByBenchSlot.get(`${key}#${idx}`);
      }
      const matchupResult =
        opponent == null
          ? null
          : p.points > opponent.points
            ? ("win" as const)
            : p.points < opponent.points
              ? ("loss" as const)
              : ("tie" as const);
      return { ...p, matchupResult };
    });
  };

  const homePlayers = buildPlayers(game.homeTeamId);
  const awayPlayers = buildPlayers(game.awayTeamId);

  return {
    id: game.id,
    season: game.season,
    week: game.week,
    isPlayoffs: game.isPlayoffs,
    home: {
      id: game.homeTeam.id,
      name: game.homeTeam.user.displayName,
      score: game.homeScore,
      players: withMatchupResults(homePlayers, awayPlayers),
    },
    away: {
      id: game.awayTeam.id,
      name: game.awayTeam.user.displayName,
      score: game.awayScore,
      players: withMatchupResults(awayPlayers, homePlayers),
    },
  };
}
