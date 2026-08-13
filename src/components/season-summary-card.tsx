import { Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SeasonSummary } from "@/lib/queries";

function formatRecord(t: { wins: number; losses: number; ties: number }) {
  return `${t.wins}-${t.losses}${t.ties ? `-${t.ties}` : ""}`;
}

function ExtremeCard({
  label,
  name,
  value,
}: {
  label: string;
  name: string | undefined;
  value: string | undefined;
}) {
  return (
    <Card className="bg-muted/40">
      <CardContent className="flex flex-col gap-1">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {label}
        </p>
        <p className="truncate text-base font-semibold">{name ?? "—"}</p>
        <p className="text-xs text-muted-foreground">{value ?? "No data yet"}</p>
      </CardContent>
    </Card>
  );
}

export function SeasonSummaryCard({ summary }: { summary: SeasonSummary }) {
  const { season, type, champion, mostEfficient, highestScoring, lowestScoring, unluckiest } =
    summary;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          {season} {type === "DYNASTY" ? "Dynasty" : "Redraft"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
          <Card className="w-full bg-muted/40 lg:w-1/3">
            <CardContent className="flex h-full flex-col items-center justify-center gap-2 py-8 text-center">
              <Trophy className="h-10 w-10 text-amber-400" />
              <p className="text-xs font-semibold tracking-wide text-amber-400 uppercase">
                League Champion
              </p>
              <p className="text-xl font-bold">{champion?.name ?? "TBD"}</p>
              {champion && (
                <p className="text-sm text-muted-foreground">
                  {formatRecord(champion)}
                </p>
              )}
            </CardContent>
          </Card>

          <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
            <ExtremeCard
              label="Most Efficient Manager"
              name={mostEfficient?.name}
              value={
                mostEfficient
                  ? `${(mostEfficient.efficiency * 100).toFixed(1)}% efficiency`
                  : undefined
              }
            />
            <ExtremeCard
              label="Highest Scoring Team"
              name={highestScoring?.name}
              value={highestScoring ? `${highestScoring.pointsFor.toFixed(1)} pts` : undefined}
            />
            <ExtremeCard
              label="Lowest Scoring Team"
              name={lowestScoring?.name}
              value={lowestScoring ? `${lowestScoring.pointsFor.toFixed(1)} pts` : undefined}
            />
            <ExtremeCard
              label="Unluckiest Team"
              name={unluckiest?.name}
              value={
                unluckiest
                  ? `${unluckiest.pointsFor.toFixed(1)} pts · ${formatRecord(unluckiest)}`
                  : "No team under .500"
              }
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
