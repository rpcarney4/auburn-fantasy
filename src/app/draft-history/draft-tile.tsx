import { cn } from "@/lib/utils";
import type { DraftPickRow } from "@/lib/types";

export function DraftTile({
  round,
  slot,
  teamsPerRound,
  pick,
  isActive,
  isDimmed,
  onClick,
  tradedFromLabel,
}: {
  round: number;
  slot: number;
  teamsPerRound: number;
  pick?: DraftPickRow;
  isActive?: boolean;
  isDimmed?: boolean;
  onClick?: () => void;
  // Set when this pick's actual drafter differs from its column's rightful
  // owner (i.e. it was traded before the draft) — the drafter's name, shown
  // as a "→ name" marker in place of the usual bottom line.
  tradedFromLabel?: string;
}) {
  // Prefer the pick's own real position (round.pickWithinRound derived from
  // its actual pickNo) over the visual column index — in team-anchored
  // snake mode those can differ, since a team's fixed column doesn't
  // necessarily match which position they actually picked from that round.
  const pickWithinRound = pick
    ? pick.pickNo - (pick.round - 1) * teamsPerRound
    : slot;
  const label = `${pick?.round ?? round}.${String(pickWithinRound).padStart(2, "0")}`;

  if (!pick) {
    return (
      <div
        className={cn(
          "flex min-h-[5.5rem] flex-col justify-between rounded-lg border border-dashed border-foreground/15 p-2 text-[11px] text-muted-foreground transition-opacity",
          isDimmed && "opacity-40"
        )}
      >
        {label}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-[5.5rem] flex-col justify-between gap-1 rounded-lg bg-card p-2 text-left ring-1 ring-foreground/10 transition-all",
        pick.isKeeper && "bg-primary/5 ring-primary/30",
        isActive && "bg-accent ring-2 ring-primary",
        isDimmed && "opacity-40"
      )}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="text-[11px] font-semibold text-muted-foreground">
          {label}
        </span>
        {pick.isKeeper && (
          <span className="shrink-0 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary">
            Keeper
          </span>
        )}
      </div>
      <div className="flex flex-col">
        <span className="truncate text-sm font-medium leading-tight">
          {pick.player?.fullName ?? "—"}
        </span>
        <span className="text-[11px] text-muted-foreground">
          {pick.player?.position ?? "—"}
        </span>
      </div>
      <span
        className={cn(
          "truncate text-[11px] text-muted-foreground",
          tradedFromLabel && "text-right font-medium text-primary"
        )}
      >
        {tradedFromLabel ? `→ ${tradedFromLabel}` : pick.team.user.displayName}
      </span>
    </button>
  );
}
