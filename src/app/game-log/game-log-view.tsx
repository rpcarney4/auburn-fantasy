"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Badge } from "@/components/ui/badge";
import { Trophy } from "lucide-react";
import type { GameLogGame, TeamOption } from "@/lib/types";

const ALL = "__all__";

export function GameLogView({
  dynastyGames,
  redraftGames,
  dynastyTeams,
  redraftTeams,
}: {
  dynastyGames: GameLogGame[];
  redraftGames: GameLogGame[];
  dynastyTeams: TeamOption[];
  redraftTeams: TeamOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const gamesForView = (v: "DYNASTY" | "REDRAFT") =>
    v === "DYNASTY" ? dynastyGames : redraftGames;

  const initialView: "DYNASTY" | "REDRAFT" =
    searchParams.get("view") === "REDRAFT" ? "REDRAFT" : "DYNASTY";
  const [view, setView] = useState<"DYNASTY" | "REDRAFT">(initialView);
  const [teamFilter, setTeamFilter] = useState(searchParams.get("team") ?? ALL);
  const [season, setSeason] = useState<number | undefined>(() => {
    const param = searchParams.get("season");
    return param ? Number(param) : gamesForView(initialView)[0]?.season;
  });

  const games = gamesForView(view);
  const teamOptions = view === "DYNASTY" ? dynastyTeams : redraftTeams;

  const seasons = useMemo(
    () => [...new Set(games.map((g) => g.season))].sort((a, b) => b - a),
    [games]
  );

  const filtered = useMemo(() => {
    return games.filter((g) => {
      if (season !== undefined && g.season !== season) return false;
      if (teamFilter === ALL) return true;
      return g.homeTeam.userId === teamFilter || g.awayTeam.userId === teamFilter;
    });
  }, [games, teamFilter, season]);

  // Keep the current filters in the URL so navigating to a box score and
  // back returns to the same view/season/team filter.
  useEffect(() => {
    const params = new URLSearchParams();
    params.set("view", view);
    if (season !== undefined) params.set("season", String(season));
    if (teamFilter !== ALL) params.set("team", teamFilter);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [view, season, teamFilter, pathname, router]);

  const nameOf = (t: GameLogGame["homeTeam"]) => t.user.displayName;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Game Log</h1>
        <div className="flex items-center gap-3">
          <ToggleGroup
            type="single"
            value={view}
            onValueChange={(v) => {
              if (!v) return;
              const nextView = v as "DYNASTY" | "REDRAFT";
              setView(nextView);
              setTeamFilter(ALL);
              setSeason(gamesForView(nextView)[0]?.season);
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
          <Select value={teamFilter} onValueChange={setTeamFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Team" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All teams</SelectItem>
              {teamOptions.map((t) => (
                <SelectItem key={t.userId} value={t.userId}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No {view.toLowerCase()} games match the current filter.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Week</TableHead>
              <TableHead>Home</TableHead>
              <TableHead>Away</TableHead>
              <TableHead className="text-right">Score</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((g) => (
              <TableRow
                key={g.id}
                className="cursor-pointer"
                onClick={() => router.push(`/game-log/${g.id}`)}
              >
                <TableCell>{g.week}</TableCell>
                <TableCell
                  className={
                    g.homeScore > g.awayScore
                      ? "font-semibold"
                      : undefined
                  }
                >
                  <span className="flex items-center gap-1.5">
                    {g.homeScore > g.awayScore && (
                      <Trophy className="size-3.5 shrink-0 text-amber-400" />
                    )}
                    {nameOf(g.homeTeam)}
                  </span>
                </TableCell>
                <TableCell
                  className={
                    g.awayScore > g.homeScore
                      ? "font-semibold"
                      : undefined
                  }
                >
                  <span className="flex items-center gap-1.5">
                    {g.awayScore > g.homeScore && (
                      <Trophy className="size-3.5 shrink-0 text-amber-400" />
                    )}
                    {nameOf(g.awayTeam)}
                  </span>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {g.homeScore.toFixed(1)} – {g.awayScore.toFixed(1)}
                </TableCell>
                <TableCell>
                  {g.isPlayoffs && <Badge variant="secondary">Playoffs</Badge>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
