import type { LeagueGlanceStat } from "./league-glance-stat";
import type { LeagueGlanceRecord } from "./league-glance-record";
import type { LeaguePlacement } from "./league-placement";
import type { LeagueGlanceRivalry } from "./league-glance-rivalry";
import type { LeagueGlanceRankingEntry } from "./league-glance-ranking-entry";
import type { LeagueGlanceGame } from "./league-glance-game";

export type LeagueGlance = {
  mostPointsScored: LeagueGlanceStat;
  mostPointsScoredRanking: LeagueGlanceRankingEntry[];
  leastPointsScored: LeagueGlanceStat;
  leagueHole: LeagueGlanceStat;
  leagueHoleRanking: LeagueGlanceRankingEntry[];
  bestManager: LeagueGlanceRecord;
  bestManagerRanking: LeagueGlanceRankingEntry[];
  worstManager: LeagueGlanceRecord;
  hoarder: LeagueGlanceStat;
  hoarderRanking: LeagueGlanceRankingEntry[];
  skillDiff: LeagueGlanceStat;
  skillDiffRanking: LeagueGlanceRankingEntry[];
  whosYourDaddy: LeagueGlanceRivalry;
  whosYourDaddyRanking: LeagueGlanceRankingEntry[];
  placements: LeaguePlacement[];
  historicalBlowouts: LeagueGlanceGame[];
  historicalTardOffs: LeagueGlanceGame[];
};
