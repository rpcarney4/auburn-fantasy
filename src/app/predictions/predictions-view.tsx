"use client";

import { useState, useTransition } from "react";
import type { PredictionPick } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { PredictionLeaderboardEntry, PredictionMatchup } from "@/lib/types";
import { getMyPredictions, submitPredictions } from "@/lib/actions";
import { PredictionMatchupCard } from "./prediction-matchup-card";
import { PredictionLeaderboardTable } from "./prediction-leaderboard-table";

type WeekData = {
  season: number | null;
  week: number | null;
  matchups: PredictionMatchup[];
};

type Session = { code: string; displayName: string };

function LeagueSection({
  title,
  data,
  picks,
  locked,
  onSelect,
}: {
  title: string;
  data: WeekData;
  picks: Record<string, PredictionPick>;
  locked: boolean;
  onSelect: (gameId: string, pick: PredictionPick) => void;
}) {
  return (
    <section className="flex flex-col gap-3 sm:gap-4">
      <div className="flex flex-wrap items-baseline gap-2">
        <h2 className="text-lg font-bold tracking-tight sm:text-xl">{title}</h2>
        {data.season !== null && data.week !== null && (
          <span className="text-xs text-muted-foreground sm:text-sm">
            {data.season} &middot; Week {data.week}
          </span>
        )}
      </div>

      {data.matchups.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No upcoming matchups to predict right now.
        </p>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2 sm:gap-4">
          {data.matchups.map((m) => (
            <div key={m.gameId} className="w-80 shrink-0">
              <PredictionMatchupCard
                matchup={m}
                pick={picks[m.gameId]}
                locked={locked}
                onSelect={(pick) => onSelect(m.gameId, pick)}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function PredictionsView({
  dynasty,
  redraft,
  dynastyLeaderboard,
  redraftLeaderboard,
  deadlinePassed,
}: {
  dynasty: WeekData;
  redraft: WeekData;
  dynastyLeaderboard: PredictionLeaderboardEntry[];
  redraftLeaderboard: PredictionLeaderboardEntry[];
  deadlinePassed: boolean;
}) {
  const [codeInput, setCodeInput] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [picks, setPicks] = useState<Record<string, PredictionPick>>({});
  const [codeError, setCodeError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<
    { type: "success" | "error"; text: string } | null
  >(null);
  const [isPending, startTransition] = useTransition();

  const allGameIds = [
    ...dynasty.matchups.map((m) => m.gameId),
    ...redraft.matchups.map((m) => m.gameId),
  ];

  const unlockCode = (e: React.FormEvent) => {
    e.preventDefault();
    setCodeError(null);
    setSaveMessage(null);
    startTransition(async () => {
      const result = await getMyPredictions(codeInput.trim(), allGameIds);
      if (!result.ok) {
        setCodeError("That code wasn't recognized. Double-check and try again.");
        return;
      }
      setSession({ code: codeInput.trim(), displayName: result.displayName });
      setPicks(result.picks);
    });
  };

  const handleSelect = (gameId: string, pick: PredictionPick) => {
    if (!session || deadlinePassed) return;
    setPicks((prev) => ({ ...prev, [gameId]: pick }));
  };

  const handleSave = () => {
    if (!session) return;
    setSaveMessage(null);
    startTransition(async () => {
      const result = await submitPredictions(session.code, picks);
      setSaveMessage(
        result.ok
          ? { type: "success", text: "Your picks were saved." }
          : { type: "error", text: result.error }
      );
    });
  };

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Predictions</h1>
        <Badge variant={deadlinePassed ? "secondary" : "default"}>
          {deadlinePassed
            ? "Picks are locked for this week"
            : "Picks lock Wednesday at 6:00 PM ET"}
        </Badge>
      </div>

      {!session ? (
        <form
          onSubmit={unlockCode}
          className="flex flex-wrap items-end gap-3 rounded-lg border p-4"
        >
          <div className="flex flex-col gap-1.5">
            <label htmlFor="prediction-code" className="text-sm font-medium">
              Enter your 6-digit code
            </label>
            <Input
              id="prediction-code"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              inputMode="numeric"
              maxLength={6}
              className="w-32"
              placeholder="000000"
            />
          </div>
          <Button type="submit" disabled={isPending || codeInput.length !== 6}>
            Unlock
          </Button>
          {codeError && (
            <p className="text-sm text-destructive">{codeError}</p>
          )}
        </form>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/40 p-4">
          <p className="text-sm">
            Voting as <span className="font-semibold">{session.displayName}</span>
          </p>
          {!deadlinePassed && (
            <div className="flex items-center gap-3">
              {saveMessage && (
                <p
                  className={
                    saveMessage.type === "success"
                      ? "text-sm text-emerald-600"
                      : "text-sm text-destructive"
                  }
                >
                  {saveMessage.text}
                </p>
              )}
              <Button onClick={handleSave} disabled={isPending}>
                Save Picks
              </Button>
            </div>
          )}
        </div>
      )}

      <LeagueSection
        title="Dynasty"
        data={dynasty}
        picks={picks}
        locked={!session || deadlinePassed}
        onSelect={handleSelect}
      />
      <LeagueSection
        title="Redraft"
        data={redraft}
        picks={picks}
        locked={!session || deadlinePassed}
        onSelect={handleSelect}
      />

      <div className="grid gap-6 sm:grid-cols-2 sm:gap-8">
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold tracking-tight">Dynasty Leaderboard</h2>
          <PredictionLeaderboardTable entries={dynastyLeaderboard} />
        </section>
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold tracking-tight">Redraft Leaderboard</h2>
          <PredictionLeaderboardTable entries={redraftLeaderboard} />
        </section>
      </div>
    </div>
  );
}
