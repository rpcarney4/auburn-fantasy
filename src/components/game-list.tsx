import type { LeagueGlanceGame } from "@/lib/types";

export function GameList({ games }: { games: LeagueGlanceGame[] }) {
  if (games.length === 0) {
    return <p className="text-sm text-muted-foreground">No games yet.</p>;
  }

  return (
    <ol className="flex flex-col gap-2 text-sm">
      {games.map((g, i) => (
        <li key={i} className="flex items-start justify-between gap-2">
          <span className="truncate">
            {i + 1}. {g.winnerName} vs {g.loserName}
          </span>
          <span className="shrink-0 text-right tabular-nums text-muted-foreground">
            <div>
              {g.winnerScore.toFixed(1)} - {g.loserScore.toFixed(1)}
            </div>
            <div className="text-[11px]">
              {g.season} Wk {g.week}
            </div>
          </span>
        </li>
      ))}
    </ol>
  );
}
