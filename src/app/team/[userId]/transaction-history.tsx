import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TeamTransaction } from "@/lib/types";
import { TransactionTile } from "./transaction-tile";

export function TransactionHistory({
  transactions,
  isDynasty,
}: {
  transactions: TeamTransaction[];
  isDynasty: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Transaction History
          {isDynasty && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              All seasons
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No transactions synced yet.
          </p>
        ) : (
          transactions.map((t) => <TransactionTile key={t.id} transaction={t} />)
        )}
      </CardContent>
    </Card>
  );
}
