import type { LeagueType } from "@prisma/client";
import { prisma } from "../prisma";
import type { TradeCard, TradeCardTeam, TradeCardAsset } from "../types";

export async function getTrades(type: LeagueType): Promise<TradeCard[]> {
  const trades = await prisma.trade.findMany({
    where: { league: { type } },
    include: {
      assets: {
        include: {
          player: true,
          fromTeam: { include: { user: true } },
          toTeam: { include: { user: true } },
        },
      },
    },
    orderBy: { tradeDate: "desc" },
  });

  return trades.map((trade) => {
    const labelOf = (asset: (typeof trade.assets)[number]) =>
      asset.assetType === "PLAYER"
        ? (asset.player?.fullName ?? "Unknown Player")
        : (asset.pickDescription ?? "Draft Pick");
    const positionOf = (asset: (typeof trade.assets)[number]) =>
      asset.assetType === "PLAYER" ? (asset.player?.position ?? null) : null;

    const teamsById = new Map<string, TradeCardTeam>();
    const ensureTeam = (id: string, name: string) => {
      const existing = teamsById.get(id);
      if (existing) return existing;
      const created: TradeCardTeam = {
        teamId: id,
        teamName: name,
        incoming: [],
        outgoing: [],
      };
      teamsById.set(id, created);
      return created;
    };

    for (const asset of trade.assets) {
      const fromTeam = ensureTeam(
        asset.fromTeamId,
        asset.fromTeam.teamName || asset.fromTeam.user.displayName
      );
      const toTeam = ensureTeam(
        asset.toTeamId,
        asset.toTeam.teamName || asset.toTeam.user.displayName
      );
      const item: TradeCardAsset = {
        id: asset.id,
        label: labelOf(asset),
        position: positionOf(asset),
      };
      toTeam.incoming.push(item);
      fromTeam.outgoing.push(item);
    }

    return {
      id: trade.id,
      season: trade.season,
      tradeDate: trade.tradeDate.toISOString(),
      teams: [...teamsById.values()],
    };
  });
}
