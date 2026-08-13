import { EmptyState } from "@/components/empty-state";
import { getTradeAssetRows } from "@/lib/queries";
import { TradeHistoryView } from "./trade-history-view";

export const dynamic = "force-dynamic";

export default async function TradeHistoryPage() {
  let rows: Awaited<ReturnType<typeof getTradeAssetRows>> | null = null;
  try {
    rows = await getTradeAssetRows();
  } catch {
    rows = null;
  }

  if (!rows) {
    return (
      <EmptyState
        title="No trade data yet"
        detail="Connect a database and run `npm run sync:sleeper` to pull trade history from Sleeper."
      />
    );
  }

  return <TradeHistoryView rows={rows} />;
}
