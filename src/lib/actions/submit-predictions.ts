"use server";

import type { PredictionPick } from "@prisma/client";
import { prisma } from "../prisma";
import { isPredictionDeadlinePassed } from "../prediction-deadline";

// Only the games actually included in `picks` are touched — each is its own
// upsert keyed on (userId, gameId), so submitting a change to one matchup
// never affects any of the user's other saved picks.
export async function submitPredictions(
  code: string,
  picks: Record<string, PredictionPick>
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (isPredictionDeadlinePassed()) {
    return { ok: false, error: "The deadline for this week's picks has passed." };
  }

  const user = await prisma.user.findUnique({ where: { predictionCode: code } });
  if (!user) return { ok: false, error: "Invalid code." };

  const entries = Object.entries(picks);
  if (entries.length === 0) return { ok: true };

  const games = await prisma.game.findMany({
    where: { id: { in: entries.map(([gameId]) => gameId) } },
    select: { id: true },
  });
  const validGameIds = new Set(games.map((g) => g.id));

  await prisma.$transaction(
    entries
      .filter(([gameId]) => validGameIds.has(gameId))
      .map(([gameId, pick]) =>
        prisma.prediction.upsert({
          where: { userId_gameId: { userId: user.id, gameId } },
          create: { userId: user.id, gameId, pick },
          update: { pick },
        })
      )
  );

  return { ok: true };
}
