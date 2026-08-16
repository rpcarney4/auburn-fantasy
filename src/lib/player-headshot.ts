// Sleeper serves NFL player headshots directly off their CDN, keyed by
// their own player id — which is what Player.id already is for anyone
// synced from Sleeper. Team defenses (id is a team abbreviation) and the
// synthetic espn-* rows from the 2021/2022 ESPN import have no headshot.
export function playerHeadshotUrl(player: { id: string; position: string | null }): string | null {
  if (player.position === "DEF") return null;
  if (player.id.startsWith("espn-")) return null;
  return `https://sleepercdn.com/content/nfl/players/thumb/${player.id}.jpg`;
}
