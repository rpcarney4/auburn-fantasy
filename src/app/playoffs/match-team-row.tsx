import { cn } from "@/lib/utils";

export function MatchTeamRow({
  name,
  score,
  isWinner,
}: {
  name: string | undefined;
  score: number | null;
  isWinner: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className={cn("truncate text-sm", isWinner && "font-semibold")}>
        {name ?? "TBD"}
      </span>
      <span className={cn("tabular-nums text-sm", isWinner && "font-semibold")}>
        {score != null ? score.toFixed(1) : "—"}
      </span>
    </div>
  );
}
