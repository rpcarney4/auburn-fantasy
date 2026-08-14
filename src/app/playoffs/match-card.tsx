import Link from "next/link";
import { cn } from "@/lib/utils";
import type { PlayoffMatchRow } from "@/lib/types";
import { MatchTeamRow } from "./match-team-row";

export function MatchCard({
  match,
  className,
}: {
  match: PlayoffMatchRow;
  className?: string;
}) {
  const content = (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-lg bg-muted/40 p-3",
        match.gameId &&
          "transition-all duration-150 hover:-translate-y-1 hover:ring-2 hover:ring-primary hover:shadow-lg"
      )}
    >
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {match.label}
      </p>
      <MatchTeamRow
        name={match.team1?.name}
        score={match.team1Score}
        isWinner={!!match.team1 && match.winnerId === match.team1.id}
      />
      <MatchTeamRow
        name={match.team2?.name}
        score={match.team2Score}
        isWinner={!!match.team2 && match.winnerId === match.team2.id}
      />
    </div>
  );

  if (!match.gameId) return <div className={className}>{content}</div>;

  return (
    <Link href={`/game-log/${match.gameId}`} className={cn("block", className)}>
      {content}
    </Link>
  );
}
