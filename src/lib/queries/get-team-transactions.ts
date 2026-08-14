import { prisma } from "../prisma";
import type { TeamTransaction } from "../types";

export async function getTeamTransactions(userId: string): Promise<TeamTransaction[]> {
  const teams = await prisma.team.findMany({
    where: { userId },
    include: { league: true },
  });
  if (teams.length === 0) return [];

  const teamIds = teams.map((t) => t.id);
  const teamMeta = new Map(
    teams.map((t) => [t.id, { leagueType: t.league.type, season: t.league.season }])
  );

  const [tradeAssets, draftPicks, rosterTransactions] = await Promise.all([
    prisma.tradeAsset.findMany({
      where: { OR: [{ fromTeamId: { in: teamIds } }, { toTeamId: { in: teamIds } }] },
      include: {
        trade: true,
        player: true,
        fromTeam: { include: { user: true } },
        toTeam: { include: { user: true } },
      },
    }),
    prisma.draftPick.findMany({
      where: { teamId: { in: teamIds }, playerId: { not: null } },
      include: { player: true, draft: true },
    }).then(async (picks) => {
      // Draft slot (e.g. "1.1") isn't stored directly — derive it from the
      // overall pick number and how many teams are in round 1 of that draft.
      const draftIds = [...new Set(picks.map((p) => p.draftId))];
      const round1Counts = await prisma.draftPick.groupBy({
        by: ["draftId"],
        where: { draftId: { in: draftIds }, round: 1 },
        _count: { _all: true },
      });
      const teamsPerDraft = new Map(
        round1Counts.map((c) => [c.draftId, c._count._all])
      );
      return picks.map((p) => ({
        ...p,
        teamsPerRound: teamsPerDraft.get(p.draftId) ?? null,
      }));
    }),
    prisma.rosterTransaction.findMany({
      where: { teamId: { in: teamIds } },
      include: { player: true },
    }),
  ]);

  const rows: TeamTransaction[] = [];

  for (const a of tradeAssets) {
    const assetName = a.player?.fullName ?? a.pickDescription ?? "Unknown asset";
    const isIncoming = teamIds.includes(a.toTeamId);
    const meta = teamMeta.get(isIncoming ? a.toTeamId : a.fromTeamId);
    if (!meta) continue;
    rows.push({
      id: a.id,
      leagueType: meta.leagueType,
      season: meta.season,
      date: a.trade.tradeDate.toISOString(),
      kind: isIncoming ? "TRADE_IN" : "TRADE_OUT",
      assetName,
      counterpartyTeamName: isIncoming
        ? a.fromTeam.user.displayName
        : a.toTeam.user.displayName,
      pickLabel: null,
    });
  }

  for (const p of draftPicks) {
    const meta = teamMeta.get(p.teamId);
    if (!meta || !p.player || !p.draft.startTime) continue;
    const slot = p.teamsPerRound
      ? p.pickNo - (p.round - 1) * p.teamsPerRound
      : null;
    rows.push({
      id: p.id,
      leagueType: meta.leagueType,
      season: meta.season,
      date: p.draft.startTime.toISOString(),
      kind: "DRAFT_PICK",
      assetName: p.player.fullName,
      counterpartyTeamName: null,
      pickLabel: slot != null ? `Pick ${p.round}.${slot}` : null,
    });
  }

  for (const r of rosterTransactions) {
    const meta = teamMeta.get(r.teamId);
    if (!meta) continue;
    rows.push({
      id: r.id,
      leagueType: meta.leagueType,
      season: meta.season,
      date: r.transactionDate.toISOString(),
      kind: r.type === "ADD" ? "WAIVER_ADD" : "DROP",
      assetName: r.player.fullName,
      counterpartyTeamName: null,
      pickLabel: null,
    });
  }

  return rows.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}
