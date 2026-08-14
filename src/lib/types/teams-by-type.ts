import type { getTeamsByType } from "@/lib/queries";

export type TeamsByType = Awaited<ReturnType<typeof getTeamsByType>>;
export type SeasonTeams = TeamsByType["bySeason"][number];
export type TeamData = SeasonTeams["teams"][number];
export type RosterPlayer = TeamData["roster"][number];
