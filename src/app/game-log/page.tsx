import { Suspense } from "react";
import { LeagueType } from "@prisma/client";
import { EmptyState } from "@/components/empty-state";
import { getGamesForType, getTeamNamesForType } from "@/lib/queries";
import { GameLogView } from "./game-log-view";

export const dynamic = "force-dynamic";

export default async function GameLogPage() {
  let data: [
    Awaited<ReturnType<typeof getGamesForType>>,
    Awaited<ReturnType<typeof getGamesForType>>,
    Awaited<ReturnType<typeof getTeamNamesForType>>,
    Awaited<ReturnType<typeof getTeamNamesForType>>,
  ] | null = null;
  try {
    data = await Promise.all([
      getGamesForType(LeagueType.DYNASTY),
      getGamesForType(LeagueType.REDRAFT),
      getTeamNamesForType(LeagueType.DYNASTY),
      getTeamNamesForType(LeagueType.REDRAFT),
    ]);
  } catch {
    data = null;
  }

  if (!data) {
    return (
      <EmptyState
        title="No game data yet"
        detail="Connect a database and run `npm run sync:sleeper` to pull matchup history from Sleeper."
      />
    );
  }

  const [dynastyGames, redraftGames, dynastyTeams, redraftTeams] = data;
  return (
    <Suspense>
      <GameLogView
        dynastyGames={dynastyGames}
        redraftGames={redraftGames}
        dynastyTeams={dynastyTeams}
        redraftTeams={redraftTeams}
      />
    </Suspense>
  );
}
