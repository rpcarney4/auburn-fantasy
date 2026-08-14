import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { HeadToHeadRecord } from "@/lib/types";

export function HeadToHeadCard({ records }: { records: HeadToHeadRecord[] }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">Head-to-Head Records</CardTitle>
      </CardHeader>
      <CardContent>
        {records.length === 0 ? (
          <p className="text-sm text-muted-foreground">No matchups yet.</p>
        ) : (
          <ul className="flex flex-col gap-1.5 text-sm">
            {records.map((r) => (
              <li
                key={r.opponentUserId}
                className="flex items-center justify-between gap-2"
              >
                <span className="truncate">{r.opponentName}</span>
                <span
                  className={cn(
                    "shrink-0 tabular-nums",
                    r.wins > r.losses
                      ? "text-green-500"
                      : r.wins < r.losses
                        ? "text-red-500"
                        : "text-yellow-500"
                  )}
                >
                  {r.wins}-{r.losses}
                  {r.ties ? `-${r.ties}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
