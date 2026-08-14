import type { TradeCardTeam } from "./trade-card-team";

export type TradeCard = {
  id: string;
  season: number;
  tradeDate: string;
  teams: TradeCardTeam[];
};
