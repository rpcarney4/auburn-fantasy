import type { LeagueType } from "@prisma/client";
import { POSITION_ORDER, ROSTER_SLOTS } from "../constants";

// Shared by getTeamsByType and getTeamDetail, so it lives here rather than
// being colocated with just one of them.
export function compareRosterEntries(
  a: { player: { position: string | null }; avgScore: number | null },
  b: { player: { position: string | null }; avgScore: number | null }
) {
  const rank = (position: string | null) => {
    const idx = position ? POSITION_ORDER.indexOf(position) : -1;
    return idx === -1 ? POSITION_ORDER.length : idx;
  };
  const rankDiff = rank(a.player.position) - rank(b.player.position);
  if (rankDiff !== 0) return rankDiff;
  return (b.avgScore ?? -Infinity) - (a.avgScore ?? -Infinity);
}

// Builds the roster-slot sequence for a league type, e.g. Redraft:
// [QB, RB, RB, WR, WR, TE, FLEX, K, DEF]. Used to order starters by roster
// slot rather than just by position group.
// Shared by getBoxScore and getPredictionMatchups.
export function buildSlotSequence(leagueType: LeagueType) {
  const slots = ROSTER_SLOTS[leagueType];
  const sequence: ((position: string | null) => boolean)[] = [];
  const push = (n: number, predicate: (position: string | null) => boolean) => {
    for (let i = 0; i < n; i++) sequence.push(predicate);
  };
  push(slots.QB, (p) => p === "QB");
  push(slots.RB, (p) => p === "RB");
  push(slots.WR, (p) => p === "WR");
  push(slots.TE, (p) => p === "TE");
  push(slots.FLEX, (p) => ["RB", "WR", "TE"].includes(p ?? ""));
  push(slots.SFLEX, (p) => ["QB", "RB", "WR", "TE"].includes(p ?? ""));
  push(slots.K, (p) => p === "K");
  push(slots.DEF, (p) => p === "DEF");
  return sequence;
}

// Computes the highest-scoring lineup possible for one week given the
// players available and the slot requirements. Filling strict positions
// first, then FLEX, then SFLEX is optimal here because each tier's
// eligibility is a superset of the previous one's.
// Shared by getSeasonSummaries and getTeamDetail.
export function optimalWeekTotal(
  weekEntries: { points: number; position: string | null }[],
  slots: (typeof ROSTER_SLOTS)[LeagueType]
) {
  let pool = weekEntries.slice();
  const takeTop = (
    predicate: (p: { points: number; position: string | null }) => boolean,
    n: number
  ) => {
    if (n <= 0) return 0;
    const eligible = pool
      .filter(predicate)
      .sort((a, b) => b.points - a.points)
      .slice(0, n);
    pool = pool.filter((p) => !eligible.includes(p));
    return eligible.reduce((sum, p) => sum + p.points, 0);
  };

  let total = 0;
  total += takeTop((p) => p.position === "QB", slots.QB);
  total += takeTop((p) => p.position === "RB", slots.RB);
  total += takeTop((p) => p.position === "WR", slots.WR);
  total += takeTop((p) => p.position === "TE", slots.TE);
  total += takeTop((p) => p.position === "K", slots.K);
  total += takeTop((p) => p.position === "DEF", slots.DEF);
  total += takeTop((p) => ["RB", "WR", "TE"].includes(p.position ?? ""), slots.FLEX);
  total += takeTop(
    (p) => ["QB", "RB", "WR", "TE"].includes(p.position ?? ""),
    slots.SFLEX
  );
  return total;
}
