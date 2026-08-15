import type { LeagueType } from "@prisma/client";
import { prisma } from "../prisma";
import type { TradeCard, TradeCardTeam, TradeCardAsset } from "../types";

const pickKey = (season: number, round: number, originalRosterId: number) =>
  `${season}:${round}:${originalRosterId}`;

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

  // Every pick actually used in a draft of this league type, keyed the same
  // way as a traded pick (season + round + original slot owner) so the two
  // can be matched up regardless of how many times the pick changed hands.
  const draftPicks = await prisma.draftPick.findMany({
    where: { draft: { league: { type } }, originalRosterId: { not: null } },
    include: { player: true, draft: true },
  });
  const draftedPlayerByPickKey = new Map(
    draftPicks
      .filter((dp) => dp.player)
      .map((dp) => [
        pickKey(dp.draft.season, dp.round, dp.originalRosterId as number),
        dp.player!.fullName,
      ])
  );

  // Every traded pick across every trade of this league type (not just the
  // current trade), so a pick's *later* trade legs can be found regardless
  // of which trade is being rendered right now.
  const pickTrades = trades.flatMap((t) =>
    t.assets
      .filter(
        (
          a
        ): a is typeof a & {
          pickSeason: number;
          pickRound: number;
          pickOriginalRosterId: number;
        } =>
          a.assetType === "PICK" &&
          a.pickSeason != null &&
          a.pickRound != null &&
          a.pickOriginalRosterId != null
      )
      .map((a) => ({
        assetId: a.id,
        tradeDate: t.tradeDate,
        key: pickKey(a.pickSeason, a.pickRound, a.pickOriginalRosterId),
      }))
  );

  // "traded" if a later trade moved the same pick again; otherwise whoever
  // it was actually drafted with, if the draft has happened yet.
  const pickNoteByAssetId = new Map<string, string>();
  for (const pt of pickTrades) {
    const tradedAgainLater = pickTrades.some(
      (other) =>
        other.assetId !== pt.assetId &&
        other.key === pt.key &&
        other.tradeDate > pt.tradeDate
    );
    const note = tradedAgainLater ? "traded" : draftedPlayerByPickKey.get(pt.key);
    if (note) pickNoteByAssetId.set(pt.assetId, note);
  }

  return trades.map((trade) => {
    const labelOf = (asset: (typeof trade.assets)[number]) =>
      asset.assetType === "PLAYER"
        ? (asset.player?.fullName ?? "Unknown Player")
        : (asset.pickDescription ?? "Draft Pick");
    const positionOf = (asset: (typeof trade.assets)[number]) =>
      asset.assetType === "PLAYER" ? (asset.player?.position ?? null) : "PICK";

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
      const fromTeam = ensureTeam(asset.fromTeamId, asset.fromTeam.user.displayName);
      const toTeam = ensureTeam(asset.toTeamId, asset.toTeam.user.displayName);
      const item: TradeCardAsset = {
        id: asset.id,
        label: labelOf(asset),
        position: positionOf(asset),
        pickNote: pickNoteByAssetId.get(asset.id) ?? null,
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
