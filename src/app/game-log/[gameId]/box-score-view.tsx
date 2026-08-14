import Image from "next/image";
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

// Sleeper serves NFL player headshots directly off their CDN, keyed by
// their own player id — which is what Player.id already is for anyone
// synced from Sleeper. Team defenses (id is a team abbreviation) and the
// synthetic espn-* rows from the 2021/2022 ESPN import have no headshot.
function playerHeadshotUrl(player: { id: string; position: string | null }): string | null {
  if (player.position === "DEF") return null;
  if (player.id.startsWith("espn-")) return null;
  return `https://sleepercdn.com/content/nfl/players/thumb/${player.id}.jpg`;
}

// Square, stretches to match whatever height its flex siblings resolve to
// (a single name line, or a name line plus the stats line beneath it) —
// object-cover crops rather than distorting, so it never skews.
function Headshot({ url }: { url: string | null }) {
  return (
    <div className="relative aspect-square shrink-0 self-stretch overflow-hidden rounded bg-muted">
      {url && <Image src={url} alt="" fill sizes="48px" className="object-cover" />}
    </div>
  );
}

function PlayerTile({
  player,
  mirrored,
}: {
  player: PlayerBox;
  mirrored?: boolean;
}) {
  const wonSlot = player.isStarter && player.matchupResult === "win";
  const headshotUrl = playerHeadshotUrl(player);
  const hasStats = player.statLines.length > 0;

  const positionBadge = (
    <span className="w-6 shrink-0 self-center text-[10px] font-medium text-muted-foreground sm:w-8 sm:text-xs">
      {player.position ?? "—"}
    </span>
  );
  const nameLine = (
    <span
      className={cn(
        "min-w-0 flex-1 truncate text-xs font-medium sm:text-sm",
        mirrored && "text-right"
      )}
    >
      {player.fullName}
    </span>
  );
  const pointsLine = (
    <span className="shrink-0 self-start text-xs font-semibold tabular-nums sm:text-sm">
      {player.points.toFixed(1)}
    </span>
  );
  const statsLine = (
    <div
      className={cn(
        "flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground sm:text-xs",
        mirrored && "justify-end"
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

  // Position, headshot, and name all on one line — used wherever stats
  // aren't shown alongside the name (the collapsed mobile trigger, and any
  // scoreless player with nothing to show).
  const singleLineContent = (
    <div
      className={cn(
        "flex min-w-0 flex-1 items-stretch justify-between gap-2",
        mirrored && "flex-row-reverse"
      )}
    >
      <div
        className={cn(
          "flex min-w-0 flex-1 items-stretch gap-1.5 sm:gap-2",
          mirrored && "flex-row-reverse"
        )}
      >
        {positionBadge}
        <Headshot url={headshotUrl} />
        {nameLine}
      </div>
      {pointsLine}
    </div>
  );

  // Position and headshot beside a name+stats stack — the headshot
  // stretches (aspect-square + self-stretch) to span from the top of the
  // name line down to the bottom of the stats line beneath it.
  const twoLineContent = (
    <div
      className={cn(
        "flex min-w-0 flex-1 items-stretch justify-between gap-2",
        mirrored && "flex-row-reverse"
      )}
    >
      <div
        className={cn(
          "flex min-w-0 flex-1 items-stretch gap-1.5 sm:gap-2",
          mirrored && "flex-row-reverse"
        )}
      >
        {positionBadge}
        <Headshot url={headshotUrl} />
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
          {nameLine}
          {statsLine}
        </div>
      </div>
      {pointsLine}
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
          {singleLineContent}
        </div>

        {/* Large screens: match the height of tiles that do have stats. */}
        <div
          className={cn(
            "hidden rounded-lg border-transparent bg-muted/40 px-3 py-2.5 lg:block",
            mirrored ? "border-r-4" : "border-l-4",
            wonSlot && "border-amber-400"
          )}
        >
          {twoLineContent}
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
            {singleLineContent}
          </AccordionTrigger>
          <AccordionContent className="px-2 pb-2 sm:px-3 sm:pb-2.5">
            <div className={cn(mirrored ? "pr-7.5 sm:pr-10" : "pl-7.5 sm:pl-10")}>
              {statsLine}
            </div>
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
        {twoLineContent}
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
