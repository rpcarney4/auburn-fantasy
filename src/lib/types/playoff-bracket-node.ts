export type PlayoffMatchRow = {
  id: string;
  round: number;
  label: string;
  team1: { id: string; name: string } | null;
  team1Score: number | null;
  team2: { id: string; name: string } | null;
  team2Score: number | null;
  winnerId: string | null;
  gameId: string | null;
};

export type PlayoffBracketNode = {
  match: PlayoffMatchRow;
  team1Feeder: PlayoffBracketNode | null;
  team2Feeder: PlayoffBracketNode | null;
};
