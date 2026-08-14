"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TeamData, TeamsByType } from "@/lib/types";
import { TeamCard } from "./team-card";

// Columns adapt to available width instead of jumping at fixed breakpoints,
// so an odd team count (e.g. 5 in a division) doesn't leave a single card
// stretched across an otherwise-empty row.
const TEAM_GRID_STYLE = {
  gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
};

export function TeamView({
  dynasty,
  redraft,
}: {
  dynasty: TeamsByType;
  redraft: TeamsByType;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const byView = (v: "DYNASTY" | "REDRAFT") => (v === "DYNASTY" ? dynasty : redraft);

  const initialView: "DYNASTY" | "REDRAFT" =
    searchParams.get("view") === "REDRAFT" ? "REDRAFT" : "DYNASTY";
  const [view, setView] = useState<"DYNASTY" | "REDRAFT">(initialView);
  const active = byView(view);

  const [season, setSeason] = useState<number | undefined>(() => {
    const param = searchParams.get("season");
    return param ? Number(param) : byView(initialView).seasons[0];
  });
  const activeSeason = active.bySeason[season ?? -1] ?? active.bySeason[active.seasons[0]];

  const seasons = useMemo(() => active.seasons, [active]);

  // Keep the current filters in the URL so navigating to a team's detail
  // page and back returns to the same view/season.
  useEffect(() => {
    const params = new URLSearchParams();
    params.set("view", view);
    if (season !== undefined) params.set("season", String(season));
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [view, season, pathname, router]);

  const hasDivisions = (activeSeason?.divisionNames.length ?? 0) > 0;
  const groupedByDivision = useMemo(() => {
    if (!activeSeason || !hasDivisions) return null;
    const groups = new Map<number, TeamData[]>();
    for (const team of activeSeason.teams) {
      const key = team.division ?? 0;
      const group = groups.get(key) ?? [];
      group.push(team);
      groups.set(key, group);
    }
    return [...groups.entries()].sort(([a], [b]) => a - b);
  }, [activeSeason, hasDivisions]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Teams</h1>
        <div className="flex items-center gap-3">
          <ToggleGroup
            type="single"
            value={view}
            onValueChange={(v) => {
              if (!v) return;
              const nextView = v as "DYNASTY" | "REDRAFT";
              setView(nextView);
              setSeason(byView(nextView).seasons[0]);
            }}
          >
            <ToggleGroupItem value="DYNASTY">Dynasty</ToggleGroupItem>
            <ToggleGroupItem value="REDRAFT">Redraft</ToggleGroupItem>
          </ToggleGroup>
          <Select
            value={String(activeSeason ? season ?? seasons[0] : "")}
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

      {!activeSeason || activeSeason.teams.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No {view.toLowerCase()} team data synced yet.
        </p>
      ) : groupedByDivision ? (
        <div className="flex flex-col gap-8">
          {groupedByDivision.map(([division, teams]) => (
            <div key={division} className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold tracking-tight">
                {activeSeason.divisionNames[division - 1] ?? `Division ${division}`}
              </h2>
              <div className="grid gap-4" style={TEAM_GRID_STYLE}>
                {teams.map((team) => (
                  <TeamCard
                    key={team.id}
                    team={team}
                    isHistorical={activeSeason.isHistorical}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-4" style={TEAM_GRID_STYLE}>
          {activeSeason.teams.map((team) => (
            <TeamCard
              key={team.id}
              team={team}
              isHistorical={activeSeason.isHistorical}
            />
          ))}
        </div>
      )}
    </div>
  );
}
