import type { LeaguePlacement } from "@/lib/types";

export function PlacementList({
  items,
  startRank,
}: {
  items: LeaguePlacement[];
  startRank: number;
}) {
  return (
    <ul className="flex flex-col gap-1 text-sm">
      {items.map((p, i) => (
        <li key={p.userId} className="flex items-center justify-between gap-2">
          <span className="truncate">
            {startRank + i}. {p.name}
          </span>
          <span className="shrink-0 tabular-nums text-muted-foreground">
            {p.avgPlacement.toFixed(2)}
          </span>
        </li>
      ))}
    </ul>
  );
}
