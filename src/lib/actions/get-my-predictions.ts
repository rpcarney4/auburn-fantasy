"use server";

import type { PredictionPick } from "@prisma/client";
import { prisma } from "../prisma";

// Looks a user up by their 6-digit code and returns their existing picks
// for the given games, so the form can be pre-filled before they edit
// anything — editing one pick must never risk clobbering the other nine.
export async function getMyPredictions(
  code: string,
  gameIds: string[]
): Promise<
  | { ok: true; displayName: string; picks: Record<string, PredictionPick> }
  | { ok: false }
> {
  const user = await prisma.user.findUnique({ where: { predictionCode: code } });
  if (!user) return { ok: false };

  const predictions = await prisma.prediction.findMany({
    where: { userId: user.id, gameId: { in: gameIds } },
  });

  const picks: Record<string, PredictionPick> = {};
  for (const p of predictions) picks[p.gameId] = p.pick;

  return { ok: true, displayName: user.displayName, picks };
}
