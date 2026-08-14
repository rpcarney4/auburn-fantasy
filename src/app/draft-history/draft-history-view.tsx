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
import type { DraftsByType } from "@/lib/types";
import { DraftBoard } from "./draft-board";

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
