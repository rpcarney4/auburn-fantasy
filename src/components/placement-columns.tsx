import type { LeaguePlacement } from "@/lib/types";
import { PlacementList } from "./placement-list";

// Left column gets ranks 1..half, right column gets the rest — e.g. 1st-5th
// on the left and 6th-10th on the right, rather than interleaved pairs.
export function PlacementColumns({ placements }: { placements: LeaguePlacement[] }) {
  const half = Math.ceil(placements.length / 2);
  const left = placements.slice(0, half);
  const right = placements.slice(half);

  return (
    <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
      <PlacementList items={left} startRank={1} />
      <PlacementList items={right} startRank={half + 1} />
    </div>
  );
}
