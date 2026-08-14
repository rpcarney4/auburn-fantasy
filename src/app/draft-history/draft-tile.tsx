import { cn } from "@/lib/utils";
import type { DraftPickRow } from "@/lib/types";

export function DraftTile({
  round,
  slot,
  pick,
}: {
  round: number;
  slot: number;
  pick?: DraftPickRow;
}) {
  const label = `${round}.${String(slot).padStart(2, "0")}`;

  if (!pick) {
    return (
      <div className="flex min-h-[5.5rem] flex-col justify-between rounded-lg border border-dashed border-foreground/15 p-2 text-[11px] text-muted-foreground">
        {label}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex min-h-[5.5rem] flex-col justify-between gap-1 rounded-lg bg-card p-2 ring-1 ring-foreground/10",
        pick.isKeeper && "bg-primary/5 ring-primary/30"
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
      <span className="truncate text-[11px] text-muted-foreground">
        {pick.team.user.displayName}
      </span>
    </div>
  );
}
