import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { TeamDetailSeason } from "@/lib/types";

export function SeasonSchedule({
  schedule,
}: {
  schedule: TeamDetailSeason["stats"]["schedule"];
}) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">Schedule</CardTitle>
      </CardHeader>
      <CardContent>
        {schedule.length === 0 ? (
          <p className="text-sm text-muted-foreground">No schedule synced yet.</p>
        ) : (
          <ul className="flex flex-col gap-1.5 text-sm">
            {schedule.map((g) => (
              <li key={g.week} className="flex items-center justify-between gap-2">
                <span className="truncate">
                  Week {g.week}: vs {g.opponentName}
                </span>
                {g.result ? (
                  <span className="shrink-0 tabular-nums">
                    <span
                      className={cn(
                        "mr-2 font-semibold",
                        g.result === "W"
                          ? "text-green-500"
                          : g.result === "L"
                            ? "text-red-500"
                            : "text-yellow-500"
                      )}
                    >
                      {g.result}
                    </span>
                    {g.ownScore.toFixed(1)}-{g.opponentScore.toFixed(1)}
                  </span>
                ) : (
                  <span className="shrink-0 text-muted-foreground">-</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
