import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { TradeCard } from "@/lib/types";
import { TradeTeamColumn } from "./trade-team-column";

export function TradeHistoryCard({ trade }: { trade: TradeCard }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {new Date(trade.tradeDate).toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </CardTitle>
      </CardHeader>
      <CardContent
        className={cn(
          "grid gap-6",
          trade.teams.length > 1 ? "sm:grid-cols-2" : "grid-cols-1"
        )}
      >
        {trade.teams.map((team) => (
          <TradeTeamColumn key={team.teamId} team={team} />
        ))}
      </CardContent>
    </Card>
  );
}
