import Image from "next/image";
import { LeagueType } from "@prisma/client";
import { EmptyState } from "@/components/empty-state";
import { SeasonSummaryCard } from "@/components/season-summary-card";
import { LeagueGlanceBox } from "@/components/league-glance-box";
import { getLeagueSummary, getLeagueGlance, getSeasonSummaries } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let summary: Awaited<ReturnType<typeof getLeagueSummary>> | null = null;
  let seasons: Awaited<ReturnType<typeof getSeasonSummaries>> = [];
  let redraftGlance: Awaited<ReturnType<typeof getLeagueGlance>> | null = null;
  let dynastyGlance: Awaited<ReturnType<typeof getLeagueGlance>> | null = null;
  try {
    [summary, seasons, redraftGlance, dynastyGlance] = await Promise.all([
      getLeagueSummary(),
      getSeasonSummaries(),
      getLeagueGlance(LeagueType.REDRAFT),
      getLeagueGlance(LeagueType.DYNASTY),
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

      {!summary || !redraftGlance || !dynastyGlance ? (
        <EmptyState
          title="No league data yet"
          detail="Connect a database and run `npm run sync:sleeper` to pull league history from Sleeper."
        />
      ) : (
        <div className="flex flex-col gap-4">
          <h2 className="text-center text-xl font-semibold tracking-tight">
            Leagues at a Glance
          </h2>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <LeagueGlanceBox title="Redraft - Est. 2021" glance={redraftGlance} />
            <LeagueGlanceBox title="Dynasty - Est. 2023" glance={dynastyGlance} />
          </div>
        </div>
      )}

      {seasons.length > 0 && (
        <div className="flex flex-col gap-4">
          <h2 className="text-center text-xl font-semibold tracking-tight">
            Past Seasons
          </h2>
          {seasons.map((s) => (
            <SeasonSummaryCard key={s.leagueId} summary={s} />
          ))}
        </div>
      )}
    </div>
  );
}
