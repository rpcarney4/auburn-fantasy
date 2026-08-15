export type TradeCardAsset = {
  id: string;
  label: string;
  position: string | null;
  // For picks: "traded" if it moved again in a later trade, or the name of
  // whoever it was actually drafted with. Null for players, and for picks
  // that haven't been re-traded or drafted yet.
  pickNote: string | null;
};
