import type { LeagueType } from "@prisma/client";

// Starting lineup requirements per league type, per the site's rules:
//   Redraft: 1 QB, 2 RB, 2 WR, 1 TE, 1 FLEX (RB/WR/TE), 1 K, 1 DEF
//   Dynasty: 1 QB, 2 RB, 2 WR, 1 TE, 2 FLEX (RB/WR/TE), 1 SFLEX (QB/RB/WR/TE), no K/DEF
export const ROSTER_SLOTS: Record<
  LeagueType,
  { QB: number; RB: number; WR: number; TE: number; FLEX: number; SFLEX: number; K: number; DEF: number }
> = {
  REDRAFT: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, SFLEX: 0, K: 1, DEF: 1 },
  DYNASTY: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 2, SFLEX: 1, K: 0, DEF: 0 },
};
