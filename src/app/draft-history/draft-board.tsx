"use client";

import { Fragment, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { DraftPickRow } from "@/lib/types";
import { DraftTile } from "./draft-tile";

export function DraftBoard({
  picks,
  snakeAnchored,
}: {
  picks: DraftPickRow[];
  // Snake drafts reverse pick order every round, so positioning tiles by
  // raw pick number would put a different team in column 1 each round.
  // When true, tiles are positioned by their *original* slot owner instead
  // (DraftPick.originalRosterId) — column order is fixed from round 1 (the
  // one round with no reversal yet), so a column keeps its shape even when
  // a pick was traded before the draft and someone else made it. A header
  // row names each column's rightful owner, and a tile whose actual
  // drafter differs from its column gets a small "→ whoever drafted it"
  // marker.
  snakeAnchored?: boolean;
}) {
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);
  const toggleTeam = (teamId: string) =>
    setActiveTeamId((cur) => (cur === teamId ? null : teamId));

  const { rounds, teamsPerRound, tileFor, columnHeaders } = useMemo(() => {
    const roundCounts = new Map<number, number>();
    for (const pick of picks) {
      roundCounts.set(pick.round, (roundCounts.get(pick.round) ?? 0) + 1);
    }
    const rounds = [...roundCounts.keys()].sort((a, b) => a - b);
    const teamsPerRound = Math.max(0, ...roundCounts.values());

    if (snakeAnchored) {
      // Falls back to the drafter's own roster when originalRosterId is
      // missing (shouldn't happen for a Sleeper-synced draft, but keeps a
      // pick visible rather than dropped if it ever does).
      const slotOf = (pick: DraftPickRow) =>
        pick.originalRosterId ?? pick.team.sleeperRosterId;

      const sorted = [...picks].sort((a, b) => a.pickNo - b.pickNo);
      const columnOrder: number[] = [];
      for (const pick of sorted) {
        const slot = slotOf(pick);
        if (!columnOrder.includes(slot)) columnOrder.push(slot);
      }

      const byRoundAndSlot = new Map<string, DraftPickRow>();
      const teamBySlot = new Map<number, { teamId: string; name: string }>();
      for (const pick of picks) {
        byRoundAndSlot.set(`${pick.round}:${slotOf(pick)}`, pick);
        // A team's own roster is always its own original slot, regardless
        // of whether any given pick of theirs got traded away.
        teamBySlot.set(pick.team.sleeperRosterId, {
          teamId: pick.teamId,
          name: pick.team.user.displayName,
        });
      }

      return {
        rounds,
        teamsPerRound,
        tileFor: (round: number, columnIndex: number) =>
          byRoundAndSlot.get(`${round}:${columnOrder[columnIndex]}`),
        columnHeaders: columnOrder.map((slot) => ({
          slot,
          teamId: teamBySlot.get(slot)?.teamId ?? "",
          name: teamBySlot.get(slot)?.name ?? "",
        })),
      };
    }

    const byPickNo = new Map<number, DraftPickRow>();
    for (const pick of picks) byPickNo.set(pick.pickNo, pick);
    return {
      rounds,
      teamsPerRound,
      tileFor: (round: number, columnIndex: number) =>
        byPickNo.get((round - 1) * teamsPerRound + columnIndex + 1),
      columnHeaders: null as { slot: number; teamId: string; name: string }[] | null,
    };
  }, [picks, snakeAnchored]);

  if (teamsPerRound === 0) return null;

  return (
    <div className="overflow-x-auto pb-2">
      <div
        className="grid w-full gap-2"
        style={{
          gridTemplateColumns: `3rem repeat(${teamsPerRound}, minmax(110px, 1fr))`,
        }}
      >
        {columnHeaders && (
          <>
            <div className="sticky left-0 z-10" />
            {columnHeaders.map(({ slot, teamId, name }) => (
              <button
                key={slot}
                type="button"
                onClick={() => toggleTeam(teamId)}
                className={cn(
                  "truncate rounded-lg bg-muted px-2 py-1.5 text-center text-xs font-semibold text-muted-foreground transition-all",
                  activeTeamId === teamId && "bg-accent ring-2 ring-primary text-foreground",
                  activeTeamId != null && activeTeamId !== teamId && "opacity-40"
                )}
              >
                {name}
              </button>
            ))}
          </>
        )}
        {rounds.map((round) => (
          <Fragment key={round}>
            <div className="sticky left-0 z-10 flex items-center justify-center rounded-lg bg-muted text-sm font-semibold text-muted-foreground">
              R{round}
            </div>
            {Array.from({ length: teamsPerRound }, (_, i) => {
              const pick = tileFor(round, i);
              const swapped =
                snakeAnchored &&
                !!pick &&
                pick.originalRosterId != null &&
                pick.originalRosterId !== pick.team.sleeperRosterId;
              return (
                <DraftTile
                  key={i}
                  round={round}
                  slot={i + 1}
                  teamsPerRound={teamsPerRound}
                  pick={pick}
                  isActive={!!pick && activeTeamId === pick.teamId}
                  isDimmed={
                    activeTeamId != null && (!pick || activeTeamId !== pick.teamId)
                  }
                  onClick={pick ? () => toggleTeam(pick.teamId) : undefined}
                  tradedFromLabel={swapped ? pick.team.user.displayName : undefined}
                />
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
