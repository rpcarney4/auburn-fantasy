export type PredictionStarter = {
  id: string;
  fullName: string;
  position: string | null;
  nflTeam: string | null;
};

export type PredictionTeamSide = {
  id: string;
  name: string;
  avatar: string | null;
  starters: PredictionStarter[];
};

export type PredictionMatchup = {
  gameId: string;
  home: PredictionTeamSide;
  away: PredictionTeamSide;
  // Vote counts, only populated once this week's deadline has passed —
  // otherwise picks stay hidden while voting is still open.
  tally: { home: number; away: number } | null;
};
