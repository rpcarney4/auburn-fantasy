import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import type { BoxScorePlayer } from "@/lib/types";
import { Headshot, playerHeadshotUrl } from "./headshot";

export function PlayerTile({
  player,
  mirrored,
}: {
  player: BoxScorePlayer;
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
