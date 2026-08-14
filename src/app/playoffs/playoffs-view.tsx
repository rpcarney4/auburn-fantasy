"use client";

import { useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { PlayoffBracket } from "@/lib/types";
import { BracketNodeView } from "./bracket-node-view";
import { MatchCard } from "./match-card";

export function PlayoffsView({
  dynasty,
  redraft,
}: {
  dynasty: PlayoffBracket;
  redraft: PlayoffBracket;
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
