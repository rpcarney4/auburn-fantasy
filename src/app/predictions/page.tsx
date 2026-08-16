import { Suspense } from "react";
import { LeagueType } from "@prisma/client";
import { EmptyState } from "@/components/empty-state";
import { getPredictionMatchups, getPredictionLeaderboard } from "@/lib/queries";
import { isPredictionDeadlinePassed } from "@/lib/prediction-deadline";
import { PredictionsView } from "./predictions-view";

export const dynamic = "force-dynamic";

export default async function PredictionsPage() {
  let data: [
    Awaited<ReturnType<typeof getPredictionMatchups>>,
    Awaited<ReturnType<typeof getPredictionMatchups>>,
    Awaited<ReturnType<typeof getPredictionLeaderboard>>,
    Awaited<ReturnType<typeof getPredictionLeaderboard>>,
  ] | null = null;
  try {
    data = await Promise.all([
      getPredictionMatchups(LeagueType.DYNASTY),
      getPredictionMatchups(LeagueType.REDRAFT),
      getPredictionLeaderboard(LeagueType.DYNASTY),
      getPredictionLeaderboard(LeagueType.REDRAFT),
    ]);
  } catch {
    data = null;
  }

  if (!data) {
    return (
      <EmptyState
        title="No prediction data yet"
        detail="Connect a database and run `npm run sync:sleeper` to pull matchup data from Sleeper."
      />
    );
  }

  const [dynasty, redraft, dynastyLeaderboard, redraftLeaderboard] = data;

  return (
    <Suspense>
      <PredictionsView
        dynasty={dynasty}
        redraft={redraft}
        dynastyLeaderboard={dynastyLeaderboard}
        redraftLeaderboard={redraftLeaderboard}
        deadlinePassed={isPredictionDeadlinePassed()}
      />
    </Suspense>
  );
}
