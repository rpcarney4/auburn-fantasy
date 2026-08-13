import { LeagueType } from "@prisma/client";
import { EmptyState } from "@/components/empty-state";
import { getPlayoffBracket } from "@/lib/queries";
import { PlayoffsView } from "./playoffs-view";

export const dynamic = "force-dynamic";

export default async function PlayoffsPage() {
  let data: [
    Awaited<ReturnType<typeof getPlayoffBracket>>,
    Awaited<ReturnType<typeof getPlayoffBracket>>,
  ] | null = null;
  try {
    data = await Promise.all([
      getPlayoffBracket(LeagueType.DYNASTY),
      getPlayoffBracket(LeagueType.REDRAFT),
    ]);
  } catch {
    data = null;
  }

  if (!data) {
    return (
      <EmptyState
        title="No playoff data yet"
        detail="Connect a database and run `npm run sync:sleeper` to pull bracket results from Sleeper."
      />
    );
  }

  const [dynasty, redraft] = data;
  return <PlayoffsView dynasty={dynasty} redraft={redraft} />;
}
