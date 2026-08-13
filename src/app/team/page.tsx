import { Suspense } from "react";
import { LeagueType } from "@prisma/client";
import { EmptyState } from "@/components/empty-state";
import { getTeamsByType } from "@/lib/queries";
import { TeamView } from "./team-view";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  let data: [
    Awaited<ReturnType<typeof getTeamsByType>>,
    Awaited<ReturnType<typeof getTeamsByType>>,
  ] | null = null;
  try {
    data = await Promise.all([
      getTeamsByType(LeagueType.DYNASTY),
      getTeamsByType(LeagueType.REDRAFT),
    ]);
  } catch {
    data = null;
  }

  if (!data) {
    return (
      <EmptyState
        title="No team data yet"
        detail="Connect a database and run `npm run sync:sleeper` to pull rosters from Sleeper."
      />
    );
  }

  const [dynasty, redraft] = data;
  return (
    <Suspense>
      <TeamView dynasty={dynasty} redraft={redraft} />
    </Suspense>
  );
}
