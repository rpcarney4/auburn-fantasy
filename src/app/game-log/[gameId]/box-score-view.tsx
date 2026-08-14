import { BackButton } from "@/components/back-button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import type { BoxScore } from "@/lib/queries";

type TeamBox = BoxScore["home"];
type PlayerBox = TeamBox["players"][number];

function PlayerTile({
  player,
  mirrored,
}: {
  player: PlayerBox;
  mirrored?: boolean;
}) {
  const wonSlot = player.isStarter && player.matchupResult === "win";

  const header = (
    <div
      className={cn(
        "flex min-w-0 flex-1 items-center justify-between gap-2",
        mirrored && "flex-row-reverse"
      )}
    >
      <div
        className={cn(
          "flex min-w-0 items-center gap-1.5 sm:gap-2",
          mirrored && "flex-row-reverse"
        )}
      >
        <span className="w-6 shrink-0 text-[10px] font-medium text-muted-foreground sm:w-8 sm:text-xs">
          {player.position ?? "—"}
        </span>
        <span className="truncate text-xs font-medium sm:text-sm">
          {player.fullName}
        </span>
      </div>
      <span className="shrink-0 text-xs font-semibold tabular-nums sm:text-sm">
        {player.points.toFixed(1)}
      </span>
    </div>
  );

  const hasStats = player.statLines.length > 0;

  // Reserves one line of height even when there's nothing to show, so a
  // scoreless player's card doesn't come out shorter than its neighbors on
  // large screens, where the stats row is always visible.
  const statsBlock = (
    <div
      className={cn(
        "flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground sm:text-xs",
        mirrored ? "pr-7.5 sm:pr-10" : "pl-7.5 sm:pl-10"
      )}
    >
      {hasStats ? (
        player.statLines.map((s) => (
          <span key={s.label}>
            {s.label}: {s.value}
          </span>
        ))
      ) : (
        <span className="invisible">—</span>
      )}
    </div>
  );

  if (!hasStats) {
    return (
      <>
        {/* Small/medium screens: nothing to expand. */}
        <div
          className={cn(
            "rounded-lg border-transparent bg-muted/40 px-2 py-2 sm:px-3 sm:py-2.5 lg:hidden",
            mirrored ? "border-r-4" : "border-l-4",
            wonSlot && "border-amber-400"
          )}
        >
          {header}
        </div>

        {/* Large screens: match the height of tiles that do have stats. */}
        <div
          className={cn(
            "hidden rounded-lg border-transparent bg-muted/40 px-3 py-2.5 lg:block",
            mirrored ? "border-r-4" : "border-l-4",
            wonSlot && "border-amber-400"
          )}
        >
          {header}
          <div className="mt-1.5">{statsBlock}</div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Small/medium screens: tap to expand stats. */}
      <Accordion
        type="single"
        collapsible
        className={cn(
          "rounded-lg border-transparent bg-muted/40 lg:hidden",
          mirrored ? "border-r-4" : "border-l-4",
          wonSlot && "border-amber-400"
        )}
      >
        <AccordionItem value={player.id} className="border-none">
          <AccordionTrigger className="px-2 py-2 hover:no-underline sm:px-3 sm:py-2.5">
            {header}
          </AccordionTrigger>
          <AccordionContent className="px-2 pb-2 sm:px-3 sm:pb-2.5">
            {statsBlock}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Large screens: enough room to show stats without a click. */}
      <div
        className={cn(
          "hidden rounded-lg border-transparent bg-muted/40 px-3 py-2.5 lg:block",
          mirrored ? "border-r-4" : "border-l-4",
          wonSlot && "border-amber-400"
        )}
      >
        {header}
        <div className="mt-1.5">{statsBlock}</div>
      </div>
    </>
  );
}

function TeamColumn({ team, mirrored }: { team: TeamBox; mirrored?: boolean }) {
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

export function BoxScoreView({ boxScore }: { boxScore: BoxScore }) {
  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <BackButton label="Back to Game Log" />

      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <h1 className="text-lg font-bold tracking-tight sm:text-2xl">
          {boxScore.season} &middot; Week {boxScore.week}
        </h1>
        {boxScore.isPlayoffs && <Badge variant="secondary">Playoffs</Badge>}
      </div>

      <div className="flex divide-x divide-border">
        <div className="w-1/2 pr-3 sm:pr-6">
          <TeamColumn team={boxScore.home} />
        </div>
        <div className="w-1/2 pl-3 sm:pl-6">
          <TeamColumn team={boxScore.away} mirrored />
        </div>
      </div>
    </div>
  );
}
