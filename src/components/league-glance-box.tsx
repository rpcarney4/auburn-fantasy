import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { LeagueGlance, LeagueGlanceRankingEntry, LeaguePlacement } from "@/lib/queries";

function formatRecord(r: { wins: number; losses: number; ties: number }) {
  return `${r.wins}-${r.losses}${r.ties ? `-${r.ties}` : ""}`;
}

// Left column gets ranks 1..half, right column gets the rest — e.g. 1st-5th
// on the left and 6th-10th on the right, rather than interleaved pairs.
function PlacementColumns({ placements }: { placements: LeaguePlacement[] }) {
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

function PlacementList({
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

function GlanceTile({
  label,
  name,
  value,
  ranking,
}: {
  label: string;
  name: string | undefined;
  value: string | undefined;
  ranking?: LeagueGlanceRankingEntry[];
}) {
  const tile = (
    <div className="flex flex-col gap-1 rounded-lg bg-muted/50 p-3">
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className="truncate text-base font-semibold">{name ?? "—"}</p>
      <p className="text-xs text-muted-foreground">{value ?? "No data yet"}</p>
    </div>
  );

  // "Rest of the field" — the tile already shows rank 1, so the popover
  // only needs ranks 2+.
  const rest = ranking?.slice(1) ?? [];
  if (rest.length === 0) return tile;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="cursor-pointer text-left">
          {tile}
        </button>
      </PopoverTrigger>
      <PopoverContent>
        <ol className="flex flex-col gap-0.5">
          {rest.map((entry, i) => (
            <li key={i} className="flex items-center gap-2 whitespace-nowrap">
              <span>
                {i + 2}. {entry.name}
              </span>
              <span className="text-muted-foreground">{entry.value}</span>
            </li>
          ))}
        </ol>
      </PopoverContent>
    </Popover>
  );
}

export function LeagueGlanceBox({
  title,
  glance,
}: {
  title: string;
  glance: LeagueGlance;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <GlanceTile
            label="Most Points Scored"
            name={glance.mostPointsScored?.name}
            value={
              glance.mostPointsScored
                ? `${glance.mostPointsScored.value.toFixed(1)} pts`
                : undefined
            }
            ranking={glance.mostPointsScoredRanking}
          />
          <GlanceTile
            label="Least Points Scored"
            name={glance.leastPointsScored?.name}
            value={
              glance.leastPointsScored
                ? `${glance.leastPointsScored.value.toFixed(1)} pts`
                : undefined
            }
          />
          <GlanceTile
            label="League Hole"
            name={glance.leagueHole?.name}
            value={
              glance.leagueHole
                ? `${glance.leagueHole.value.toFixed(1)} pts against`
                : undefined
            }
            ranking={glance.leagueHoleRanking}
          />
          <GlanceTile
            label="Best Manager"
            name={glance.bestManager?.name}
            value={glance.bestManager ? formatRecord(glance.bestManager) : undefined}
            ranking={glance.bestManagerRanking}
          />
          <GlanceTile
            label="Worst Manager"
            name={glance.worstManager?.name}
            value={glance.worstManager ? formatRecord(glance.worstManager) : undefined}
          />
          <GlanceTile
            label="The Hoarder"
            name={glance.hoarder?.name}
            value={
              glance.hoarder
                ? `${glance.hoarder.value} claim${glance.hoarder.value === 1 ? "" : "s"}`
                : undefined
            }
            ranking={glance.hoarderRanking}
          />
          <GlanceTile
            label="Skill Diff"
            name={glance.skillDiff?.name}
            value={
              glance.skillDiff
                ? `-${glance.skillDiff.value.toFixed(1)} point differential`
                : undefined
            }
            ranking={glance.skillDiffRanking}
          />
          <GlanceTile
            label="Who's Your Daddy"
            name={
              glance.whosYourDaddy
                ? `${glance.whosYourDaddy.dominantName} vs ${glance.whosYourDaddy.submissiveName}`
                : undefined
            }
            value={
              glance.whosYourDaddy ? formatRecord(glance.whosYourDaddy) : undefined
            }
            ranking={glance.whosYourDaddyRanking.slice(0, 5)}
          />
        </div>

        <div className="rounded-lg bg-muted/50 p-3">
          <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Average League Placement
          </p>
          {glance.placements.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No completed seasons yet.
            </p>
          ) : (
            <PlacementColumns placements={glance.placements} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
