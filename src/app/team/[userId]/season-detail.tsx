import { WeeklyScoreChart } from "@/components/weekly-score-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { HeadToHeadRecord, TeamDetailSeason } from "@/lib/types";
import { StatTile } from "./stat-tile";
import { HeadToHeadCard } from "./head-to-head-card";

export function SeasonDetail({
  season,
  headToHead,
}: {
  season: TeamDetailSeason;
  headToHead: HeadToHeadRecord[];
}) {
  const renderPlayer = (r: TeamDetailSeason["roster"][number]) => (
    <li
      key={r.player.id}
      className="grid grid-cols-[2rem_1fr_auto] items-center gap-2"
    >
      <span className="text-muted-foreground">{r.player.position}</span>
      <span>
        {r.player.fullName}
        {r.player.nflTeam ? ` · ${r.player.nflTeam}` : ""}
      </span>
      <span className="text-right text-muted-foreground">
        {r.avgScore != null ? r.avgScore.toFixed(1) : "—"}
      </span>
    </li>
  );

  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-stretch">
      <Card className="w-full md:w-1/3">
        <CardHeader>
          <CardTitle className="text-base">Roster</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {season.roster.length > 0 ? (
            <ul className="flex flex-col gap-1 text-sm">
              {season.roster.map(renderPlayer)}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No roster synced.</p>
          )}
          {season.taxi.length > 0 && (
            <div className="border-t border-border pt-3">
              <p className="mb-1.5 text-xs font-bold tracking-wider text-foreground uppercase">
                Taxi Squad
              </p>
              <ul className="flex flex-col gap-1 text-sm">
                {season.taxi.map(renderPlayer)}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex w-full flex-1 flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
              <span>
                {season.season}{" "}
                {season.leagueType === "DYNASTY" ? "Dynasty" : "Redraft"}
                {season.divisionName ? ` · ${season.divisionName}` : ""}
              </span>
              <div className="flex items-center gap-2">
                {season.isChampion && <Badge>Champion</Badge>}
                <Badge variant="secondary">
                  {season.wins}-{season.losses}
                  {season.ties ? `-${season.ties}` : ""}
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              <StatTile label="Points For" value={season.pointsFor.toFixed(1)} />
              <StatTile
                label="Points Against"
                value={season.pointsAgainst.toFixed(1)}
              />
              <StatTile
                label="Points For (Avg)"
                value={
                  season.stats.pointsForAvg != null
                    ? season.stats.pointsForAvg.toFixed(1)
                    : "—"
                }
              />
              <StatTile
                label="Points For Max"
                value={season.stats.pointsForMax.toFixed(1)}
              />
              <StatTile
                label="Efficiency"
                value={
                  season.stats.efficiency != null
                    ? `${(season.stats.efficiency * 100).toFixed(1)}%`
                    : "—"
                }
              />
              <StatTile
                label="Roster Average"
                value={
                  season.stats.rosterAverage != null
                    ? season.stats.rosterAverage.toFixed(1)
                    : "—"
                }
              />
              <StatTile
                label="Bench Points"
                value={season.stats.benchPoints.toFixed(1)}
              />
              <StatTile
                label="Player of the Season"
                value={season.stats.playerOfSeason?.fullName ?? "—"}
                sub={
                  season.stats.playerOfSeason
                    ? `${season.stats.playerOfSeason.position ?? ""} · ${season.stats.playerOfSeason.totalPoints.toFixed(1)} pts`
                    : undefined
                }
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6 sm:flex-row sm:items-stretch">
          <div className="w-full sm:w-1/2">
            <WeeklyScoreChart
              weeklyScores={season.stats.weeklyScores}
              average={season.stats.pointsForAvg}
            />
          </div>
          <div className="w-full sm:w-1/2">
            <HeadToHeadCard records={headToHead} />
          </div>
        </div>
      </div>
    </div>
  );
}
