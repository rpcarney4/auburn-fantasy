import type { getBoxScore } from "@/lib/queries";

export type BoxScore = NonNullable<Awaited<ReturnType<typeof getBoxScore>>>;
export type BoxScoreTeam = BoxScore["home"];
export type BoxScorePlayer = BoxScoreTeam["players"][number];
