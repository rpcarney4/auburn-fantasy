import type { getTeamDetail } from "@/lib/queries";

export type TeamDetail = NonNullable<Awaited<ReturnType<typeof getTeamDetail>>>;
export type TeamDetailSeason = TeamDetail["seasons"][number];
