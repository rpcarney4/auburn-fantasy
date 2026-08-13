import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { SeasonSummaryCard } from "@/components/season-summary-card";
import { getLeagueSummary, getSeasonSummaries } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let summary: Awaited<ReturnType<typeof getLeagueSummary>> | null = null;
  let seasons: Awaited<ReturnType<typeof getSeasonSummaries>> = [];
  try {
    [summary, seasons] = await Promise.all([
      getLeagueSummary(),
      getSeasonSummaries(),
    ]);
  } catch {
    summary = null;
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <Image
          src="/img/Auburn_Tigers_logo.svg"
          alt="Auburn Tigers"
          width={80}
          height={71}
          className="h-20 w-auto"
          priority
        />
        <h1 className="text-3xl font-bold tracking-tight">AUB Fantasy League</h1>
        <p className="max-w-lg text-muted-foreground">
          Home of the dynasty and redraft leagues — same 10 managers, two ways
          to lose sleep every fall.
        </p>
      </div>

      {!summary ? (
        <EmptyState
          title="No league data yet"
          detail="Connect a database and run `npm run sync:sleeper` to pull league history from Sleeper."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">
                Managers
              </CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-bold">
              {summary.userCount}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">
                Dynasty Seasons
              </CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-bold">
              {summary.dynastySeasons.length > 0
                ? `${Math.min(...summary.dynastySeasons)}–${Math.max(...summary.dynastySeasons)}`
                : "—"}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">
                Redraft Seasons
              </CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-bold">
              {summary.redraftSeasons.length > 0
                ? `${Math.min(...summary.redraftSeasons)}–${Math.max(...summary.redraftSeasons)}`
                : "—"}
            </CardContent>
          </Card>
        </div>
      )}

      {seasons.length > 0 && (
        <div className="flex flex-col gap-4">
          {seasons.map((s) => (
            <SeasonSummaryCard key={s.leagueId} summary={s} />
          ))}
        </div>
      )}
    </div>
  );
}
