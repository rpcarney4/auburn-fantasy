import type { getGamesForType } from "@/lib/queries";

export type GameLogGame = Awaited<ReturnType<typeof getGamesForType>>[number];
