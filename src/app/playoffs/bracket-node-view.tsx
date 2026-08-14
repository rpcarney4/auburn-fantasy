import type { PlayoffBracketNode } from "@/lib/types";
import { BracketConnector } from "./bracket-connector";
import { ByeSlot } from "./bye-slot";
import { MatchCard } from "./match-card";

export function BracketNodeView({ node }: { node: PlayoffBracketNode }) {
  const { match, team1Feeder, team2Feeder } = node;

  if (!team1Feeder && !team2Feeder) {
    return <MatchCard match={match} className="w-52" />;
  }

  return (
    <div className="flex items-stretch">
      <div className="flex flex-col justify-around gap-8">
        {team1Feeder ? (
          <BracketNodeView node={team1Feeder} />
        ) : (
          <ByeSlot />
        )}
        {team2Feeder ? (
          <BracketNodeView node={team2Feeder} />
        ) : (
          <ByeSlot />
        )}
      </div>
      <BracketConnector />
      <div className="flex items-center">
        <MatchCard match={match} className="w-52" />
      </div>
    </div>
  );
}
