import type { TradeCardAsset } from "./trade-card-asset";

export type TradeCardTeam = {
  teamId: string;
  teamName: string;
  incoming: TradeCardAsset[];
  outgoing: TradeCardAsset[];
};
