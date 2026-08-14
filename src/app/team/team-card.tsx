import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { RosterPlayer, TeamData } from "@/lib/types";

export function TeamCard({ team, isHistorical }: { team: TeamData; isHistorical: boolean }) {
  const renderPlayer = (
    list: RosterPlayer[],
    r: RosterPlayer,
    i: number,
    showBreaks = true
  ) => (
    <li
      key={r.player.id}
      className={cn(
        "grid grid-cols-[2rem_1fr_auto] items-center gap-2",
        showBreaks &&
          i > 0 &&
          list[i - 1].player.position !== r.player.position &&
          "mt-1 border-t border-border pt-2"
      )}
    >
      <span className="text-muted-foreground">{r.player.position}</span>
      <span>{r.player.fullName}</span>
      {isHistorical && (
        <span className="text-right text-muted-foreground">
          {r.avgScore != null ? r.avgScore.toFixed(1) : "—"}
        </span>
      )}
    </li>
  );

  return (
    <Link href={`/team/${team.user.id}`} className="block rounded-xl">
      <Card className="h-full transition-all duration-150 hover:-translate-y-1 hover:ring-2 hover:ring-primary hover:shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex min-w-0 items-center gap-2">
              {team.avatar ? (
                <Image
                  src={team.avatar}
                  alt=""
                  width={28}
                  height={28}
                  className="size-7 shrink-0 rounded-full object-cover"
                />
              ) : (
                <span className="size-7 shrink-0 rounded-full bg-muted" />
              )}
              <span className="truncate text-xl">
                {team.teamName || team.user.displayName}
              </span>
            </span>
            <Badge
              variant="secondary"
              className="h-6 shrink-0 bg-white text-base text-black"
            >
              {team.wins}-{team.losses}
              {team.ties ? `-${team.ties}` : ""}
            </Badge>
          </CardTitle>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {team.user.displayName}
            </p>
            <p className="text-xs text-muted-foreground">
              {team.leagueWins} Time League Champion
            </p>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          {team.roster.length > 0 && (
            <div>
              <div className="mb-1 grid grid-cols-[2rem_1fr_auto] items-center gap-2">
                <p className="text-xs font-semibold text-muted-foreground">
                  Pos
                </p>
                <p className="text-xs font-semibold text-muted-foreground">
                  Player
                </p>
                {isHistorical && (
                  <p className="text-right text-xs font-semibold text-muted-foreground">
                    Avg
                  </p>
                )}
              </div>
              <ul className="flex flex-col gap-1">
                {team.roster.map((r, i) => renderPlayer(team.roster, r, i))}
              </ul>
            </div>
          )}
          {team.taxi.length > 0 && (
            <div className="mt-1 border-t border-border pt-3">
              <p className="mb-1.5 text-xs font-bold tracking-wider text-foreground uppercase">
                Taxi Squad
              </p>
              <ul className="flex flex-col gap-1">
                {team.taxi.map((r, i) => renderPlayer(team.taxi, r, i, false))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
