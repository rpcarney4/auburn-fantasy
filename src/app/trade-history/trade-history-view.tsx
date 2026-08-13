"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { TradeCard, TradeCardAsset } from "@/lib/queries";

const ALL = "__all__";
const PICK = "PICK";

export function TradeHistoryView({ trades }: { trades: TradeCard[] }) {
  const [search, setSearch] = useState("");
  const [season, setSeason] = useState(ALL);
  const [position, setPosition] = useState(ALL);
  const [team, setTeam] = useState(ALL);

  const allAssets = useMemo(
    () => trades.flatMap((t) => t.teams.flatMap((tm) => tm.incoming)),
    [trades]
  );

  const seasons = useMemo(
    () => Array.from(new Set(trades.map((t) => t.season))).sort((a, b) => b - a),
    [trades]
  );
  const positions = useMemo(
    () =>
      Array.from(
        new Set(allAssets.map((a) => a.position ?? PICK))
      ).sort(),
    [allAssets]
  );
  const teams = useMemo(
    () =>
      Array.from(
        new Set(trades.flatMap((t) => t.teams.map((tm) => tm.teamName)))
      ).sort(),
    [trades]
  );

  const filtered = useMemo(() => {
    const matchesAsset = (a: TradeCardAsset) => {
      if (position !== ALL && (a.position ?? PICK) !== position) return false;
      if (
        search.trim() &&
        !a.label.toLowerCase().includes(search.trim().toLowerCase())
      )
        return false;
      return true;
    };

    return trades.filter((trade) => {
      if (season !== ALL && String(trade.season) !== season) return false;
      if (team !== ALL && !trade.teams.some((tm) => tm.teamName === team)) return false;
      if (position === ALL && !search.trim()) return true;
      return trade.teams.some(
        (tm) => tm.incoming.some(matchesAsset) || tm.outgoing.some(matchesAsset)
      );
    });
  }, [trades, season, team, position, search]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight">Trade History</h1>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search player..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-48"
        />
        <Select value={season} onValueChange={setSeason}>
          <SelectTrigger className="w-28">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All years</SelectItem>
            {seasons.map((s) => (
              <SelectItem key={s} value={String(s)}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={position} onValueChange={setPosition}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Position" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All positions</SelectItem>
            {positions.map((p) => (
              <SelectItem key={p} value={p}>
                {p === PICK ? "Draft Pick" : p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={team} onValueChange={setTeam}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Team" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Any team</SelectItem>
            {teams.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {trades.length === 0 ? (
        <p className="text-sm text-muted-foreground">No trade data synced yet.</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No trades match the current filters.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map((trade) => (
            <TradeHistoryCard key={trade.id} trade={trade} />
          ))}
        </div>
      )}
    </div>
  );
}

function TradeHistoryCard({ trade }: { trade: TradeCard }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {new Date(trade.tradeDate).toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </CardTitle>
      </CardHeader>
      <CardContent
        className={cn(
          "grid gap-6",
          trade.teams.length > 1 ? "sm:grid-cols-2" : "grid-cols-1"
        )}
      >
        {trade.teams.map((team) => (
          <TradeTeamColumn key={team.teamId} team={team} />
        ))}
      </CardContent>
    </Card>
  );
}

function TradeTeamColumn({
  team,
}: {
  team: TradeCard["teams"][number];
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-semibold">{team.teamName}</p>
      <ul className="flex flex-col gap-1.5 text-sm">
        {team.incoming.map((a) => (
          <AssetRow key={`in-${a.id}`} asset={a} isIncoming />
        ))}
        {team.outgoing.map((a) => (
          <AssetRow key={`out-${a.id}`} asset={a} isIncoming={false} />
        ))}
      </ul>
    </div>
  );
}

function AssetRow({
  asset,
  isIncoming,
}: {
  asset: TradeCardAsset;
  isIncoming: boolean;
}) {
  return (
    <li className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2">
      <span
        className={cn(
          "w-3 shrink-0 text-base font-bold",
          isIncoming ? "text-green-500" : "text-red-500"
        )}
      >
        {isIncoming ? "+" : "−"}
      </span>
      <span className="min-w-0 flex-1 truncate">{asset.label}</span>
      {asset.position && (
        <span className="shrink-0 text-xs text-muted-foreground">
          {asset.position}
        </span>
      )}
    </li>
  );
}
