import Image from "next/image";

// Sleeper serves NFL player headshots directly off their CDN, keyed by
// their own player id — which is what Player.id already is for anyone
// synced from Sleeper. Team defenses (id is a team abbreviation) and the
// synthetic espn-* rows from the 2021/2022 ESPN import have no headshot.
export function playerHeadshotUrl(player: { id: string; position: string | null }): string | null {
  if (player.position === "DEF") return null;
  if (player.id.startsWith("espn-")) return null;
  return `https://sleepercdn.com/content/nfl/players/thumb/${player.id}.jpg`;
}

// Square, stretches to match whatever height its flex siblings resolve to
// (a single name line, or a name line plus the stats line beneath it) —
// object-cover crops rather than distorting, so it never skews.
export function Headshot({ url }: { url: string | null }) {
  return (
    <div className="relative aspect-square shrink-0 self-stretch overflow-hidden rounded bg-muted">
      {url && <Image src={url} alt="" fill sizes="48px" className="object-cover" />}
    </div>
  );
}
