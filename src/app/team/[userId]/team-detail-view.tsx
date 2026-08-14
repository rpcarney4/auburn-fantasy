"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LeagueType } from "@prisma/client";
import { BackButton } from "@/components/back-button";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { HeadToHeadRecord, TeamDetail, TeamTransaction } from "@/lib/types";
import { SeasonDetail } from "./season-detail";
import { TransactionHistory } from "./transaction-history";

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
  const searchParams = useSearchParams();

  const availableTypes = useMemo(
    () => [...new Set(seasons.map((s) => s.leagueType))],
    [seasons]
  );

  // Respect the league type the user came from (e.g. clicking a team card
  // on the Teams page while toggled to Redraft) rather than always
  // defaulting to whichever type happens to sort first.
  const [view, setView] = useState<LeagueType>(() => {
    const param = searchParams.get("view");
    if (
      (param === LeagueType.DYNASTY || param === LeagueType.REDRAFT) &&
      availableTypes.includes(param)
    ) {
      return param;
    }
    return availableTypes[0] ?? LeagueType.DYNASTY;
  });

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

  const [season, setSeason] = useState<number | undefined>(() => {
    const param = searchParams.get("season");
    const parsed = param ? Number(param) : undefined;
    if (parsed !== undefined && seasonsForType.some((s) => s.season === parsed)) {
      return parsed;
    }
    return seasonsForType[0]?.season;
  });
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
