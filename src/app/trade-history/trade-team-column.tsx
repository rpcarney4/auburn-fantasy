import type { TradeCard } from "@/lib/types";
import { AssetRow } from "./asset-row";

export function TradeTeamColumn({
  team,
}: {
  team: TradeCard["teams"][number];
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-semibold">{team.teamName}</p>
      <ul className="flex flex-col gap-1.5 text-sm">
        {team.incoming.map((a) => (
          <AssetRow key={`in-${a.id}`} asset={a} isIncoming />
        ))}
        {team.outgoing.map((a) => (
          <AssetRow key={`out-${a.id}`} asset={a} isIncoming={false} />
        ))}
      </ul>
    </div>
  );
}
