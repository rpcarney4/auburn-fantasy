import type { LeagueType } from "@prisma/client";

export type TeamTransaction = {
  id: string;
  leagueType: LeagueType;
  season: number;
  date: string;
  kind: "TRADE_IN" | "TRADE_OUT" | "WAIVER_ADD" | "DROP" | "DRAFT_PICK";
  assetName: string;
  counterpartyTeamName: string | null;
  pickLabel: string | null;
};
