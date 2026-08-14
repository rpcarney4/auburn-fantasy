"use client";

import { useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { TradeCard, TradeCardAsset } from "@/lib/types";
import { TradeHistoryCard } from "./trade-history-card";

const ALL = "__all__";
const PICK = "PICK";

export function TradeHistoryView({
  dynasty,
  redraft,
}: {
  dynasty: TradeCard[];
  redraft: TradeCard[];
}) {
  const [view, setView] = useState<"DYNASTY" | "REDRAFT">("DYNASTY");
  const trades = view === "DYNASTY" ? dynasty : redraft;

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
        <ToggleGroup
          type="single"
          value={view}
          onValueChange={(v) => {
            if (!v) return;
            setView(v as "DYNASTY" | "REDRAFT");
            setSearch("");
            setSeason(ALL);
            setPosition(ALL);
            setTeam(ALL);
          }}
        >
          <ToggleGroupItem value="DYNASTY">Dynasty</ToggleGroupItem>
          <ToggleGroupItem value="REDRAFT">Redraft</ToggleGroupItem>
        </ToggleGroup>
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
        <p className="text-sm text-muted-foreground">
          No {view.toLowerCase()} trade data synced yet.
        </p>
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
