"use client";

import { useMemo, useState } from "react";
import { LeagueType } from "@prisma/client";
import { BackButton } from "@/components/back-button";
import { WeeklyScoreChart } from "@/components/weekly-score-chart";
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
import { cn } from "@/lib/utils";
import type { HeadToHeadRecord, TeamDetail, TeamTransaction } from "@/lib/queries";

type Season = TeamDetail["seasons"][number];

export function TeamDetailView({
  detail,
  transactions,
  headToHead,
}: {
  detail: TeamDetail;
  transactions: TeamTransaction[];
  headToHead: Record<LeagueType, HeadToHeadRecord[]>;
}) {
  const { user, seasons } = detail;

  const availableTypes = useMemo(
    () => [...new Set(seasons.map((s) => s.leagueType))],
    [seasons]
  );

  const [view, setView] = useState<LeagueType>(
    availableTypes[0] ?? LeagueType.DYNASTY
  );

  // Scoped to the selected league type, unlike detail.career which combines
  // dynasty and redraft.
  const career = useMemo(() => {
    return seasons
      .filter((s) => s.leagueType === view)
      .reduce(
        (acc, s) => {
          acc.wins += s.wins;
          acc.losses += s.losses;
          acc.ties += s.ties;
          acc.championships += s.isChampion ? 1 : 0;
          return acc;
        },
        { wins: 0, losses: 0, ties: 0, championships: 0 }
      );
  }, [seasons, view]);

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

  // Dynasty shows the full transaction history across every season;
  // redraft only shows the currently selected season's.
  const visibleTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (t.leagueType !== view) return false;
      if (view === LeagueType.REDRAFT) return t.season === activeSeason?.season;
      return true;
    });
  }, [transactions, view, activeSeason?.season]);

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
            <>
              <SeasonDetail
                season={activeSeason}
                headToHead={headToHead[activeSeason.leagueType]}
              />
              <TransactionHistory
                transactions={visibleTransactions}
                isDynasty={view === LeagueType.DYNASTY}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}

function SeasonDetail({
  season,
  headToHead,
}: {
  season: Season;
  headToHead: HeadToHeadRecord[];
}) {
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
    <div className="flex flex-col gap-6 md:flex-row md:items-stretch">
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

      <div className="flex w-full flex-1 flex-col gap-6">
        <Card>
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
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
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

        <div className="flex flex-col gap-6 sm:flex-row sm:items-stretch">
          <div className="w-full sm:w-1/2">
            <WeeklyScoreChart
              weeklyScores={season.stats.weeklyScores}
              average={season.stats.pointsForAvg}
            />
          </div>
          <div className="w-full sm:w-1/2">
            <HeadToHeadCard records={headToHead} />
          </div>
        </div>
      </div>
    </div>
  );
}

function HeadToHeadCard({ records }: { records: HeadToHeadRecord[] }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">Head-to-Head Records</CardTitle>
      </CardHeader>
      <CardContent>
        {records.length === 0 ? (
          <p className="text-sm text-muted-foreground">No matchups yet.</p>
        ) : (
          <ul className="flex flex-col gap-1.5 text-sm">
            {records.map((r) => (
              <li
                key={r.opponentUserId}
                className="flex items-center justify-between gap-2"
              >
                <span className="truncate">{r.opponentName}</span>
                <span
                  className={cn(
                    "shrink-0 tabular-nums",
                    r.wins > r.losses
                      ? "text-green-500"
                      : r.wins < r.losses
                        ? "text-red-500"
                        : "text-yellow-500"
                  )}
                >
                  {r.wins}-{r.losses}
                  {r.ties ? `-${r.ties}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

const TRANSACTION_LABEL: Record<TeamTransaction["kind"], string> = {
  TRADE_IN: "Incoming Trade",
  TRADE_OUT: "Outgoing Trade",
  WAIVER_ADD: "Waiver Claim",
  DROP: "Drop",
  DRAFT_PICK: "Draft Pick",
};

function TransactionHistory({
  transactions,
  isDynasty,
}: {
  transactions: TeamTransaction[];
  isDynasty: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Transaction History
          {isDynasty && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              All seasons
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No transactions synced yet.
          </p>
        ) : (
          transactions.map((t) => <TransactionTile key={t.id} transaction={t} />)
        )}
      </CardContent>
    </Card>
  );
}

function TransactionTile({ transaction }: { transaction: TeamTransaction }) {
  const isIncoming = transaction.kind !== "TRADE_OUT" && transaction.kind !== "DROP";
  const counterpartyPrefix = transaction.kind === "TRADE_IN" ? "Traded from" : "Traded to";

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-lg bg-muted/40 px-3 py-2.5 text-sm">
      <div className="flex min-w-0 items-center gap-2">
        <span
          className={cn(
            "w-3 shrink-0 text-base font-bold",
            isIncoming ? "text-green-500" : "text-red-500"
          )}
        >
          {isIncoming ? "+" : "−"}
        </span>
        <span className="truncate font-medium">{transaction.assetName}</span>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
        <span>
          {TRANSACTION_LABEL[transaction.kind]}
          {transaction.pickLabel ? ` · ${transaction.pickLabel}` : ""}
          {transaction.counterpartyTeamName
            ? ` · ${counterpartyPrefix} ${transaction.counterpartyTeamName}`
            : ""}
        </span>
        <span className="tabular-nums">
          {new Date(transaction.date).toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </span>
      </div>
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
