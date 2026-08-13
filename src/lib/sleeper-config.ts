// Starting point for each league chain. Sleeper issues a new league_id every
// season and links seasons together via previous_league_id, so the sync script
// only needs the most recent id for each league type — it walks backwards from
// there to discover every prior season automatically.
//
// When a new season starts, update these two ids to the new season's league_id.
export const SLEEPER_LEAGUE_STARTING_IDS = {
  DYNASTY: "1312123785352073216",
  REDRAFT: "1312123743060910080",
} as const;

export const MAX_WEEKS_PER_SEASON = 18;
