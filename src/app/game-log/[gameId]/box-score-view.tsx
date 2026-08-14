import { BackButton } from "@/components/back-button";
import { Badge } from "@/components/ui/badge";
import type { BoxScore } from "@/lib/types";
import { TeamColumn } from "./team-column";

export function BoxScoreView({ boxScore }: { boxScore: BoxScore }) {
  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <BackButton label="Back to Game Log" />

      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <h1 className="text-lg font-bold tracking-tight sm:text-2xl">
          {boxScore.season} &middot; Week {boxScore.week}
        </h1>
        {boxScore.isPlayoffs && <Badge variant="secondary">Playoffs</Badge>}
      </div>

      <div className="flex divide-x divide-border">
        <div className="w-1/2 pr-3 sm:pr-6">
          <TeamColumn team={boxScore.home} />
        </div>
        <div className="w-1/2 pl-3 sm:pl-6">
          <TeamColumn team={boxScore.away} mirrored />
        </div>
      </div>
    </div>
  );
}
