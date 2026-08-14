import type { getTeamNamesForType } from "@/lib/queries";

export type TeamOption = Awaited<ReturnType<typeof getTeamNamesForType>>[number];
