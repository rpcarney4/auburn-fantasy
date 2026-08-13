import { LeagueType } from "@prisma/client";
import { EmptyState } from "@/components/empty-state";
import { getAllDraftPicks } from "@/lib/queries";
import { DraftHistoryView } from "./draft-history-view";

export const dynamic = "force-dynamic";

export default async function DraftHistoryPage() {
  let data: [
    Awaited<ReturnType<typeof getAllDraftPicks>>,
    Awaited<ReturnType<typeof getAllDraftPicks>>,
  ] | null = null;
  try {
    data = await Promise.all([
      getAllDraftPicks(LeagueType.DYNASTY),
      getAllDraftPicks(LeagueType.REDRAFT),
    ]);
  } catch {
    data = null;
  }

  if (!data) {
    return (
      <EmptyState
        title="No draft data yet"
        detail="Connect a database and run `npm run sync:sleeper` to pull draft boards from Sleeper."
      />
    );
  }

  const [dynasty, redraft] = data;
  return <DraftHistoryView dynasty={dynasty} redraft={redraft} />;
}
