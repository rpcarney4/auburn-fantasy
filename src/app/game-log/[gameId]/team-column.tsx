import { cn } from "@/lib/utils";
import type { BoxScoreTeam } from "@/lib/types";
import { PlayerTile } from "./player-tile";

export function TeamColumn({ team, mirrored }: { team: BoxScoreTeam; mirrored?: boolean }) {
  const starters = team.players.filter((p) => p.isStarter);
  const bench = team.players.filter((p) => !p.isStarter);

  return (
    <div className="flex flex-1 flex-col gap-3 sm:gap-4">
      <div
        className={cn(
          "flex items-baseline justify-between gap-2",
          mirrored && "flex-row-reverse"
        )}
      >
        <h2 className="truncate text-sm font-semibold sm:text-lg">
          {team.name}
        </h2>
        <span className="text-lg font-bold tabular-nums sm:text-2xl">
          {team.score.toFixed(1)}
        </span>
      </div>

      {team.players.length === 0 ? (
        <p
          className={cn(
            "text-xs text-muted-foreground sm:text-sm",
            mirrored && "text-right"
          )}
        >
          No player data synced.
        </p>
      ) : (
        <>
          {starters.length > 0 && (
            <div className="flex flex-col gap-1.5 sm:gap-2">
              <p
                className={cn(
                  "text-[10px] font-semibold tracking-wide text-muted-foreground uppercase sm:text-xs",
                  mirrored && "text-right"
                )}
              >
                Starters
              </p>
              <div className="flex flex-col gap-1.5 sm:gap-2">
                {starters.map((p) => (
                  <PlayerTile key={p.id} player={p} mirrored={mirrored} />
                ))}
              </div>
            </div>
          )}
          {bench.length > 0 && (
            <div className="flex flex-col gap-1.5 sm:gap-2">
              <p
                className={cn(
                  "text-[10px] font-semibold tracking-wide text-muted-foreground uppercase sm:text-xs",
                  mirrored && "text-right"
                )}
              >
                Bench
              </p>
              <div className="flex flex-col gap-1.5 sm:gap-2">
                {bench.map((p) => (
                  <PlayerTile key={p.id} player={p} mirrored={mirrored} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
