import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LeagueGlance } from "@/lib/types";
import { PlacementColumns } from "./placement-columns";
import { GameList } from "./game-list";
import { GlanceTile } from "./glance-tile";

function formatRecord(r: { wins: number; losses: number; ties: number }) {
  return `${r.wins}-${r.losses}${r.ties ? `-${r.ties}` : ""}`;
}

export function LeagueGlanceBox({
  title,
  glance,
}: {
  title: string;
  glance: LeagueGlance;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <GlanceTile
            label="Most Points Scored"
            name={glance.mostPointsScored?.name}
            avatar={glance.mostPointsScored?.avatar}
            value={
              glance.mostPointsScored
                ? `${glance.mostPointsScored.value.toFixed(1)} pts`
                : undefined
            }
            ranking={glance.mostPointsScoredRanking}
          />
          <GlanceTile
            label="Least Points Scored"
            name={glance.leastPointsScored?.name}
            avatar={glance.leastPointsScored?.avatar}
            value={
              glance.leastPointsScored
                ? `${glance.leastPointsScored.value.toFixed(1)} pts`
                : undefined
            }
          />
          <GlanceTile
            label="League Hole"
            name={glance.leagueHole?.name}
            avatar={glance.leagueHole?.avatar}
            value={
              glance.leagueHole
                ? `${glance.leagueHole.value.toFixed(1)} pts against`
                : undefined
            }
            ranking={glance.leagueHoleRanking}
          />
          <GlanceTile
            label="Best Manager"
            name={glance.bestManager?.name}
            avatar={glance.bestManager?.avatar}
            value={glance.bestManager ? formatRecord(glance.bestManager) : undefined}
            ranking={glance.bestManagerRanking}
          />
          <GlanceTile
            label="Worst Manager"
            name={glance.worstManager?.name}
            avatar={glance.worstManager?.avatar}
            value={glance.worstManager ? formatRecord(glance.worstManager) : undefined}
          />
          <GlanceTile
            label="The Hoarder"
            name={glance.hoarder?.name}
            avatar={glance.hoarder?.avatar}
            value={
              glance.hoarder
                ? `${glance.hoarder.value} claim${glance.hoarder.value === 1 ? "" : "s"}`
                : undefined
            }
            ranking={glance.hoarderRanking}
          />
          <GlanceTile
            label="Skill Diff"
            name={glance.skillDiff?.name}
            avatar={glance.skillDiff?.avatar}
            value={
              glance.skillDiff
                ? `-${glance.skillDiff.value.toFixed(1)} point differential`
                : undefined
            }
            ranking={glance.skillDiffRanking}
          />
          <GlanceTile
            label="Who's Your Daddy"
            name={
              glance.whosYourDaddy
                ? `${glance.whosYourDaddy.dominantName} vs ${glance.whosYourDaddy.submissiveName}`
                : undefined
            }
            avatar={glance.whosYourDaddy?.dominantAvatar}
            value={
              glance.whosYourDaddy ? formatRecord(glance.whosYourDaddy) : undefined
            }
            ranking={glance.whosYourDaddyRanking.slice(0, 5)}
          />
        </div>

        <div className="rounded-lg bg-muted/50 p-3">
          <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Average League Placement
          </p>
          {glance.placements.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No completed seasons yet.
            </p>
          ) : (
            <PlacementColumns placements={glance.placements} />
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Historical Blowouts
            </p>
            <GameList games={glance.historicalBlowouts} />
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Historical Tard-Offs
            </p>
            <GameList games={glance.historicalTardOffs} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
