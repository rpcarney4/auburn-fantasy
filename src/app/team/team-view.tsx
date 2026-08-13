"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { cn } from "@/lib/utils";

type RosterPlayer = {
  isStarter: boolean;
  player: { id: string; fullName: string; position: string | null };
  avgScore: number | null;
};

type TeamData = {
  id: string;
  teamName: string | null;
  wins: number;
  losses: number;
  ties: number;
  division: number | null;
  leagueWins: number;
  user: { id: string; displayName: string; avatar: string | null };
  roster: RosterPlayer[];
  taxi: RosterPlayer[];
};

type SeasonTeams = {
  isHistorical: boolean;
  divisionNames: string[];
  teams: TeamData[];
};

type TeamsByType = {
  seasons: number[];
  bySeason: Record<number, SeasonTeams>;
};

// Columns adapt to available width instead of jumping at fixed breakpoints,
// so an odd team count (e.g. 5 in a division) doesn't leave a single card
// stretched across an otherwise-empty row.
const TEAM_GRID_STYLE = {
  gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
};

function TeamCard({ team, isHistorical }: { team: TeamData; isHistorical: boolean }) {
  const renderPlayer = (
    list: RosterPlayer[],
    r: RosterPlayer,
    i: number,
    showBreaks = true
  ) => (
    <li
      key={r.player.id}
      className={cn(
        "grid grid-cols-[2rem_1fr_auto] items-center gap-2",
        showBreaks &&
          i > 0 &&
          list[i - 1].player.position !== r.player.position &&
          "mt-1 border-t border-border pt-2"
      )}
    >
      <span className="text-muted-foreground">{r.player.position}</span>
      <span>{r.player.fullName}</span>
      {isHistorical && (
        <span className="text-right text-muted-foreground">
          {r.avgScore != null ? r.avgScore.toFixed(1) : "—"}
        </span>
      )}
    </li>
  );

  return (
    <Link href={`/team/${team.user.id}`} className="block rounded-xl">
      <Card className="h-full transition-all duration-150 hover:-translate-y-1 hover:ring-2 hover:ring-primary hover:shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            <span>{team.teamName || team.user.displayName}</span>
            <Badge variant="secondary">
              {team.wins}-{team.losses}
              {team.ties ? `-${team.ties}` : ""}
            </Badge>
          </CardTitle>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {team.user.displayName}
            </p>
            <p className="text-xs text-muted-foreground">
              {team.leagueWins} Time League Champion
            </p>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          {team.roster.length > 0 && (
            <div>
              <div className="mb-1 grid grid-cols-[2rem_1fr_auto] items-center gap-2">
                <p className="text-xs font-semibold text-muted-foreground">
                  Pos
                </p>
                <p className="text-xs font-semibold text-muted-foreground">
                  Player
                </p>
                {isHistorical && (
                  <p className="text-right text-xs font-semibold text-muted-foreground">
                    Avg
                  </p>
                )}
              </div>
              <ul className="flex flex-col gap-1">
                {team.roster.map((r, i) => renderPlayer(team.roster, r, i))}
              </ul>
            </div>
          )}
          {team.taxi.length > 0 && (
            <div className="mt-1 border-t border-border pt-3">
              <p className="mb-1.5 text-xs font-bold tracking-wider text-foreground uppercase">
                Taxi Squad
              </p>
              <ul className="flex flex-col gap-1">
                {team.taxi.map((r, i) => renderPlayer(team.taxi, r, i, false))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

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
