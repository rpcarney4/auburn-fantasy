"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import type { getPlayoffBracket, PlayoffBracketNode } from "@/lib/queries";

type Bracket = Awaited<ReturnType<typeof getPlayoffBracket>>;
type PlayoffMatch = PlayoffBracketNode["match"];

export function PlayoffsView({
  dynasty,
  redraft,
}: {
  dynasty: Bracket;
  redraft: Bracket;
}) {
  const [view, setView] = useState<"DYNASTY" | "REDRAFT">("DYNASTY");
  const bracket = view === "DYNASTY" ? dynasty : redraft;

  const [season, setSeason] = useState<number | undefined>(bracket.seasons[0]);
  const activeSeason = bracket.bySeason[season ?? -1] ?? bracket.bySeason[bracket.seasons[0]];

  const seasons = useMemo(() => bracket.seasons, [bracket]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Playoffs</h1>
        <div className="flex items-center gap-3">
          <ToggleGroup
            type="single"
            value={view}
            onValueChange={(v) => {
              if (!v) return;
              const nextView = v as "DYNASTY" | "REDRAFT";
              setView(nextView);
              setSeason((nextView === "DYNASTY" ? dynasty : redraft).seasons[0]);
            }}
          >
            <ToggleGroupItem value="DYNASTY">Dynasty</ToggleGroupItem>
            <ToggleGroupItem value="REDRAFT">Redraft</ToggleGroupItem>
          </ToggleGroup>
          <Select
            value={String(season ?? "")}
            onValueChange={(v) => setSeason(Number(v))}
            disabled={seasons.length === 0}
          >
            <SelectTrigger className="w-28">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {seasons.map((s) => (
                <SelectItem key={s} value={String(s)}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!activeSeason || !activeSeason.root ? (
        <p className="text-sm text-muted-foreground">
          No {view.toLowerCase()} playoff data synced yet.
        </p>
      ) : (
        <div className="flex flex-col gap-8">
          <div className="overflow-x-auto pb-2">
            <div className="flex w-max items-center px-2 py-4">
              <BracketNodeView node={activeSeason.root} />
            </div>
          </div>

          {activeSeason.consolation.length > 0 && (
            <div className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-muted-foreground">
                Other Playoff Games
              </h2>
              <div className="flex flex-wrap gap-3">
                {activeSeason.consolation.map((m) => (
                  <MatchCard key={m.id} match={m} className="w-56" />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BracketNodeView({ node }: { node: PlayoffBracketNode }) {
  const { match, team1Feeder, team2Feeder } = node;

  if (!team1Feeder && !team2Feeder) {
    return <MatchCard match={match} className="w-52" />;
  }

  return (
    <div className="flex items-stretch">
      <div className="flex flex-col justify-around gap-8">
        {team1Feeder ? (
          <BracketNodeView node={team1Feeder} />
        ) : (
          <ByeSlot />
        )}
        {team2Feeder ? (
          <BracketNodeView node={team2Feeder} />
        ) : (
          <ByeSlot />
        )}
      </div>
      <BracketConnector />
      <div className="flex items-center">
        <MatchCard match={match} className="w-52" />
      </div>
    </div>
  );
}

function BracketConnector() {
  return (
    <div className="relative w-6 shrink-0 self-stretch">
      <div className="absolute top-1/4 bottom-1/4 right-0 w-px bg-border" />
      <div className="absolute top-1/4 right-0 h-px w-6 bg-border" />
      <div className="absolute bottom-1/4 right-0 h-px w-6 bg-border" />
    </div>
  );
}

function ByeSlot() {
  return (
    <div className="flex w-52 items-center justify-center rounded-lg border border-dashed border-foreground/15 p-3 text-xs text-muted-foreground">
      Bye
    </div>
  );
}

function MatchCard({
  match,
  className,
}: {
  match: PlayoffMatch;
  className?: string;
}) {
  const content = (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-lg bg-muted/40 p-3",
        match.gameId &&
          "transition-all duration-150 hover:-translate-y-1 hover:ring-2 hover:ring-primary hover:shadow-lg"
      )}
    >
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {match.label}
      </p>
      <MatchTeamRow
        name={match.team1?.name}
        score={match.team1Score}
        isWinner={!!match.team1 && match.winnerId === match.team1.id}
      />
      <MatchTeamRow
        name={match.team2?.name}
        score={match.team2Score}
        isWinner={!!match.team2 && match.winnerId === match.team2.id}
      />
    </div>
  );

  if (!match.gameId) return <div className={className}>{content}</div>;

  return (
    <Link href={`/game-log/${match.gameId}`} className={cn("block", className)}>
      {content}
    </Link>
  );
}

function MatchTeamRow({
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
