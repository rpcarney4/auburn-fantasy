import { EmptyState } from "@/components/empty-state";
import { getTrades } from "@/lib/queries";
import { TradeHistoryView } from "./trade-history-view";

export const dynamic = "force-dynamic";

export default async function TradeHistoryPage() {
  let trades: Awaited<ReturnType<typeof getTrades>> | null = null;
  try {
    trades = await getTrades();
  } catch {
    trades = null;
  }

  if (!trades) {
    return (
      <EmptyState
        title="No trade data yet"
        detail="Connect a database and run `npm run sync:sleeper` to pull trade history from Sleeper."
      />
    );
  }

  return <TradeHistoryView trades={trades} />;
}
