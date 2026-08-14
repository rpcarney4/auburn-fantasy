import type { getPlayoffBracket } from "@/lib/queries";

export type PlayoffBracket = Awaited<ReturnType<typeof getPlayoffBracket>>;
