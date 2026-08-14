import type { getAllDraftPicks } from "@/lib/queries";

export type DraftsByType = Awaited<ReturnType<typeof getAllDraftPicks>>;
export type DraftPickRow = DraftsByType[number]["picks"][number];
