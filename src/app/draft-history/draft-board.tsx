"use client";

import { Fragment, useMemo } from "react";
import type { DraftPickRow } from "@/lib/types";
import { DraftTile } from "./draft-tile";

export function DraftBoard({ picks }: { picks: DraftPickRow[] }) {
  const { rounds, teamsPerRound, picksByPickNo } = useMemo(() => {
    const roundCounts = new Map<number, number>();
    const byPickNo = new Map<number, DraftPickRow>();
    for (const pick of picks) {
      roundCounts.set(pick.round, (roundCounts.get(pick.round) ?? 0) + 1);
      byPickNo.set(pick.pickNo, pick);
    }
    return {
      rounds: [...roundCounts.keys()].sort((a, b) => a - b),
      teamsPerRound: Math.max(0, ...roundCounts.values()),
      picksByPickNo: byPickNo,
    };
  }, [picks]);

  if (teamsPerRound === 0) return null;

  return (
    <div className="overflow-x-auto pb-2">
      <div
        className="grid w-full gap-2"
        style={{
          gridTemplateColumns: `3rem repeat(${teamsPerRound}, minmax(110px, 1fr))`,
        }}
      >
        {rounds.map((round) => (
          <Fragment key={round}>
            <div className="sticky left-0 z-10 flex items-center justify-center rounded-lg bg-muted text-sm font-semibold text-muted-foreground">
              R{round}
            </div>
            {Array.from({ length: teamsPerRound }, (_, i) => {
              const slot = i + 1;
              const pickNo = (round - 1) * teamsPerRound + slot;
              return (
                <DraftTile
                  key={pickNo}
                  round={round}
                  slot={slot}
                  pick={picksByPickNo.get(pickNo)}
                />
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
