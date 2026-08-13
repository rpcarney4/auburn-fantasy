"use client";

import { useMemo, useState } from "react";
import { LeagueType } from "@prisma/client";
import { BackButton } from "@/components/back-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TeamDetail } from "@/lib/queries";

type Season = TeamDetail["seasons"][number];

export function TeamDetailView({ detail }: { detail: TeamDetail }) {
  const { user, career, seasons } = detail;

  const availableTypes = useMemo(
    () => [...new Set(seasons.map((s) => s.leagueType))],
    [seasons]
  );

  const [view, setView] = useState<LeagueType>(
    availableTypes[0] ?? LeagueType.DYNASTY
  );

  const seasonsForType = useMemo(
    () => seasons.filter((s) => s.leagueType === view),
    [seasons, view]
  );

  const [season, setSeason] = useState<number | undefined>(
    seasonsForType[0]?.season
  );
  const activeSeason =
    seasonsForType.find((s) => s.season === season) ?? seasonsForType[0];

  const handleViewChange = (v: LeagueType) => {
    setView(v);
    const next = seasons.find((s) => s.leagueType === v);
    setSeason(next?.season);
  };

  return (
    <div className="flex flex-col gap-6">
      <BackButton label="Back to Teams" />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">
            {activeSeason?.teamName || user.displayName}
          </h1>
          <p className="text-sm text-muted-foreground">{user.displayName}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {career.wins}-{career.losses}
            {career.ties ? `-${career.ties}` : ""} career
          </Badge>
          {career.championships > 0 && (
            <Badge>
              {career.championships} title
              {career.championships > 1 ? "s" : ""}
            </Badge>
          )}
        </div>
      </div>

      {seasons.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No team data synced for this owner yet.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            {availableTypes.length > 1 && (
              <ToggleGroup
                type="single"
                value={view}
                onValueChange={(v) => {
                  if (!v) return;
                  handleViewChange(v as LeagueType);
                }}
              >
                <ToggleGroupItem value={LeagueType.DYNASTY}>
                  Dynasty
                </ToggleGroupItem>
                <ToggleGroupItem value={LeagueType.REDRAFT}>
                  Redraft
                </ToggleGroupItem>
              </ToggleGroup>
            )}
            <Select
              value={String(activeSeason?.season ?? "")}
              onValueChange={(v) => setSeason(Number(v))}
              disabled={seasonsForType.length === 0}
            >
              <SelectTrigger className="w-28">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {seasonsForType.map((s) => (
                  <SelectItem key={s.season} value={String(s.season)}>
                    {s.season}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!activeSeason ? (
            <p className="text-sm text-muted-foreground">
              No {view.toLowerCase()} data for this owner yet.
            </p>
          ) : (
            <SeasonDetail season={activeSeason} />
          )}
        </>
      )}
    </div>
  );
}

function SeasonDetail({ season }: { season: Season }) {
  const renderPlayer = (r: Season["roster"][number]) => (
    <li
      key={r.player.id}
      className="grid grid-cols-[2rem_1fr_auto] items-center gap-2"
    >
      <span className="text-muted-foreground">{r.player.position}</span>
      <span>{r.player.fullName}</span>
      <span className="text-right text-muted-foreground">
        {r.avgScore != null ? r.avgScore.toFixed(1) : "—"}
      </span>
    </li>
  );

  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-start">
      <Card className="w-full md:w-1/3">
        <CardHeader>
          <CardTitle className="text-base">Roster</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {season.roster.length > 0 ? (
            <ul className="flex flex-col gap-1 text-sm">
              {season.roster.map(renderPlayer)}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No roster synced.</p>
          )}
          {season.taxi.length > 0 && (
            <div className="border-t border-border pt-3">
              <p className="mb-1.5 text-xs font-bold tracking-wider text-foreground uppercase">
                Taxi Squad
              </p>
              <ul className="flex flex-col gap-1 text-sm">
                {season.taxi.map(renderPlayer)}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="w-full flex-1">
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
            <span>
              {season.season}{" "}
              {season.leagueType === "DYNASTY" ? "Dynasty" : "Redraft"}
              {season.divisionName ? ` · ${season.divisionName}` : ""}
            </span>
            <div className="flex items-center gap-2">
              {season.isChampion && <Badge>Champion</Badge>}
              <Badge variant="secondary">
                {season.wins}-{season.losses}
                {season.ties ? `-${season.ties}` : ""}
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatTile label="Points For" value={season.pointsFor.toFixed(1)} />
            <StatTile
              label="Points Against"
              value={season.pointsAgainst.toFixed(1)}
            />
            <StatTile
              label="Points For (Avg)"
              value={
                season.stats.pointsForAvg != null
                  ? season.stats.pointsForAvg.toFixed(1)
                  : "—"
              }
            />
            <StatTile
              label="Points For Max"
              value={season.stats.pointsForMax.toFixed(1)}
            />
            <StatTile
              label="Efficiency"
              value={
                season.stats.efficiency != null
                  ? `${(season.stats.efficiency * 100).toFixed(1)}%`
                  : "—"
              }
            />
            <StatTile
              label="Roster Average"
              value={
                season.stats.rosterAverage != null
                  ? season.stats.rosterAverage.toFixed(1)
                  : "—"
              }
            />
            <StatTile
              label="Bench Points"
              value={season.stats.benchPoints.toFixed(1)}
            />
            <StatTile
              label="Player of the Season"
              value={season.stats.playerOfSeason?.fullName ?? "—"}
              sub={
                season.stats.playerOfSeason
                  ? `${season.stats.playerOfSeason.position ?? ""} · ${season.stats.playerOfSeason.totalPoints.toFixed(1)} pts`
                  : undefined
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatTile({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg bg-muted/50 p-3">
      <span className="text-xs font-medium text-muted-foreground">
        {label}
      </span>
      <span className="truncate text-lg font-semibold">{value}</span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  );
}
