import { LeagueType } from "@prisma/client";
import { EmptyState } from "@/components/empty-state";
import { getTrades } from "@/lib/queries";
import { TradeHistoryView } from "./trade-history-view";

export const dynamic = "force-dynamic";

export default async function TradeHistoryPage() {
  let data: [
    Awaited<ReturnType<typeof getTrades>>,
    Awaited<ReturnType<typeof getTrades>>,
  ] | null = null;
  try {
    data = await Promise.all([
      getTrades(LeagueType.DYNASTY),
      getTrades(LeagueType.REDRAFT),
    ]);
  } catch {
    data = null;
  }

  if (!data) {
    return (
      <EmptyState
        title="No trade data yet"
        detail="Connect a database and run `npm run sync:sleeper` to pull trade history from Sleeper."
      />
    );
  }

  const [dynasty, redraft] = data;
  return <TradeHistoryView dynasty={dynasty} redraft={redraft} />;
}
