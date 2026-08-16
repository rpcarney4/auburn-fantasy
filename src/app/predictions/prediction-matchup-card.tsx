import type { PredictionPick } from "@prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import type { PredictionMatchup } from "@/lib/types";
import { PredictionTeamSide } from "./prediction-team-side";

export function PredictionMatchupCard({
  matchup,
  pick,
  locked,
  onSelect,
}: {
  matchup: PredictionMatchup;
  pick: PredictionPick | undefined;
  locked: boolean;
  onSelect: (pick: PredictionPick) => void;
}) {
  return (
    <Card size="sm">
      <CardContent className="flex divide-x divide-border">
        <div className="w-1/2 pr-3">
          <PredictionTeamSide
            side={matchup.home}
            selected={pick === "HOME"}
            tally={matchup.tally?.home ?? null}
            locked={locked}
            onSelect={() => onSelect("HOME")}
          />
        </div>
        <div className="w-1/2 pl-3">
          <PredictionTeamSide
            side={matchup.away}
            mirrored
            selected={pick === "AWAY"}
            tally={matchup.tally?.away ?? null}
            locked={locked}
            onSelect={() => onSelect("AWAY")}
          />
        </div>
      </CardContent>
    </Card>
  );
}
