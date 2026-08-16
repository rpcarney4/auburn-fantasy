import Image from "next/image";
import { cn } from "@/lib/utils";
import type { PredictionStarter, PredictionTeamSide as TeamSide } from "@/lib/types";

function StarterRow({
  player,
  mirrored,
}: {
  player: PredictionStarter;
  mirrored?: boolean;
}) {
  return (
    <li
      className={cn(
        "flex items-baseline gap-2 text-sm",
        mirrored && "flex-row-reverse text-right"
      )}
    >
      <span className="w-6 shrink-0 text-xs text-muted-foreground">
        {player.position ?? "—"}
      </span>
      <span className="min-w-0 flex-1 truncate">
        {player.fullName}
        {player.nflTeam ? ` · ${player.nflTeam}` : ""}
      </span>
    </li>
  );
}

export function PredictionTeamSide({
  side,
  mirrored,
  selected,
  tally,
  locked,
  onSelect,
}: {
  side: TeamSide;
  mirrored?: boolean;
  selected: boolean;
  tally: number | null;
  locked: boolean;
  onSelect: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col gap-2">
      <button
        type="button"
        onClick={onSelect}
        disabled={locked}
        className={cn(
          "flex items-center justify-between gap-2 rounded-lg border-2 px-2 py-1 text-left transition-colors disabled:cursor-not-allowed",
          mirrored && "flex-row-reverse text-right",
          selected
            ? "border-primary bg-primary/10"
            : "border-transparent bg-muted/40 not-disabled:hover:bg-muted"
        )}
      >
        <span
          className={cn(
            "flex min-w-0 items-center gap-1.5",
            mirrored && "flex-row-reverse"
          )}
        >
          {side.avatar ? (
            <Image
              src={side.avatar}
              alt=""
              width={20}
              height={20}
              className="size-5 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span className="size-5 shrink-0 rounded-full bg-muted" />
          )}
          <span className="truncate text-sm font-semibold">{side.name}</span>
        </span>
        {tally !== null && (
          <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
            {tally}
          </span>
        )}
      </button>

      {side.starters.length === 0 ? (
        <p
          className={cn(
            "text-xs text-muted-foreground",
            mirrored && "text-right"
          )}
        >
          No starting roster set.
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {side.starters.map((p) => (
            <StarterRow key={p.id} player={p} mirrored={mirrored} />
          ))}
        </ul>
      )}
    </div>
  );
}
