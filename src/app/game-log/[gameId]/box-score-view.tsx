import { BackButton } from "@/components/back-button";
import { Badge } from "@/components/ui/badge";
import type { BoxScore } from "@/lib/queries";

type TeamBox = BoxScore["home"];
type PlayerBox = TeamBox["players"][number];

function PlayerTile({ player }: { player: PlayerBox }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg bg-muted/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="w-8 shrink-0 text-xs font-medium text-muted-foreground">
            {player.position ?? "—"}
          </span>
          <span className="truncate font-medium">{player.fullName}</span>
        </div>
        <span className="shrink-0 font-semibold tabular-nums">
          {player.points.toFixed(1)}
        </span>
      </div>
      {player.statLines.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 pl-10 text-xs text-muted-foreground">
          {player.statLines.map((s) => (
            <span key={s.label}>
              {s.label}: {s.value}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function TeamColumn({ team }: { team: TeamBox }) {
  const starters = team.players.filter((p) => p.isStarter);
  const bench = team.players.filter((p) => !p.isStarter);

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="truncate text-lg font-semibold">{team.name}</h2>
        <span className="text-2xl font-bold tabular-nums">
          {team.score.toFixed(1)}
        </span>
      </div>

      {team.players.length === 0 ? (
        <p className="text-sm text-muted-foreground">No player data synced.</p>
      ) : (
        <>
          {starters.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Starters
              </p>
              <div className="flex flex-col gap-2">
                {starters.map((p) => (
                  <PlayerTile key={p.id} player={p} />
                ))}
              </div>
            </div>
          )}
          {bench.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Bench
              </p>
              <div className="flex flex-col gap-2">
                {bench.map((p) => (
                  <PlayerTile key={p.id} player={p} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function BoxScoreView({ boxScore }: { boxScore: BoxScore }) {
  return (
    <div className="flex flex-col gap-6">
      <BackButton label="Back to Game Log" />

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight">
          {boxScore.season} &middot; Week {boxScore.week}
        </h1>
        {boxScore.isPlayoffs && <Badge variant="secondary">Playoffs</Badge>}
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:divide-x lg:divide-border">
        <div className="lg:w-1/2 lg:pr-6">
          <TeamColumn team={boxScore.home} />
        </div>
        <div className="lg:w-1/2 lg:pl-6">
          <TeamColumn team={boxScore.away} />
        </div>
      </div>
    </div>
  );
}
