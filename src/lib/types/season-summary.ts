import type { LeagueType } from "@prisma/client";

export type SeasonExtremeTeam = {
  name: string;
  username: string;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
};

export type SeasonSummary = {
  leagueId: string;
  season: number;
  type: LeagueType;
  champion: SeasonExtremeTeam | null;
  mostEfficient: (SeasonExtremeTeam & { efficiency: number }) | null;
  highestScoring: SeasonExtremeTeam | null;
  lowestScoring: SeasonExtremeTeam | null;
  unluckiest: SeasonExtremeTeam | null;
};
