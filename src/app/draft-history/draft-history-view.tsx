"use client";

import { Fragment, useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

type Pick = {
  id: string;
  round: number;
  pickNo: number;
  isKeeper: boolean;
  team: { teamName: string | null; user: { displayName: string } };
  player: { fullName: string; position: string | null } | null;
};

type DraftsByType = { season: number; picks: Pick[] }[];

export function DraftHistoryView({
  dynasty,
  redraft,
}: {
  dynasty: DraftsByType;
  redraft: DraftsByType;
}) {
  const [view, setView] = useState<"DYNASTY" | "REDRAFT">("DYNASTY");
  const drafts = view === "DYNASTY" ? dynasty : redraft;

  const [season, setSeason] = useState<number | undefined>(drafts[0]?.season);
  const activeSeason = drafts.find((d) => d.season === season) ?? drafts[0];

  const seasons = useMemo(() => drafts.map((d) => d.season), [drafts]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Draft History</h1>
        <div className="flex items-center gap-3">
          <ToggleGroup
            type="single"
            value={view}
            onValueChange={(v) => {
              if (!v) return;
              setView(v as "DYNASTY" | "REDRAFT");
              setSeason(undefined);
            }}
          >
            <ToggleGroupItem value="DYNASTY">Dynasty</ToggleGroupItem>
            <ToggleGroupItem value="REDRAFT">Redraft</ToggleGroupItem>
          </ToggleGroup>
          <Select
            value={String(activeSeason?.season ?? "")}
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

      {!activeSeason || activeSeason.picks.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No {view.toLowerCase()} draft data synced yet.
        </p>
      ) : (
        <DraftBoard picks={activeSeason.picks} />
      )}
    </div>
  );
}

function DraftBoard({ picks }: { picks: Pick[] }) {
  const { rounds, teamsPerRound, picksByPickNo } = useMemo(() => {
    const roundCounts = new Map<number, number>();
    const byPickNo = new Map<number, Pick>();
    for (const pick of picks) {
      roundCounts.set(pick.round, (roundCounts.get(pick.round) ?? 0) + 1);
      byPickNo.set(pick.pickNo, pick);
    }
    return {
      rounds: [...roundCounts.keys()].sort((a, b) => a - b),
      teamsPerRound: Math.max(0, ...roundCounts.values()),
      picksByPickNo: byPickNo,
    };
  }, [picks]);

  if (teamsPerRound === 0) return null;

  return (
    <div className="overflow-x-auto pb-2">
      <div
        className="grid w-max gap-2"
        style={{
          gridTemplateColumns: `3rem repeat(${teamsPerRound}, minmax(150px, 1fr))`,
        }}
      >
        {rounds.map((round) => (
          <Fragment key={round}>
            <div className="sticky left-0 z-10 flex items-center justify-center rounded-lg bg-muted text-sm font-semibold text-muted-foreground">
              R{round}
            </div>
            {Array.from({ length: teamsPerRound }, (_, i) => {
              const slot = i + 1;
              const pickNo = (round - 1) * teamsPerRound + slot;
              return (
                <DraftTile
                  key={pickNo}
                  round={round}
                  slot={slot}
                  pick={picksByPickNo.get(pickNo)}
                />
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

function DraftTile({
  round,
  slot,
  pick,
}: {
  round: number;
  slot: number;
  pick?: Pick;
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
        {pick.team.teamName || pick.team.user.displayName}
      </span>
    </div>
  );
}
