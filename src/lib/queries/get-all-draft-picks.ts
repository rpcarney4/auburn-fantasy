import type { LeagueType } from "@prisma/client";
import { prisma } from "../prisma";

export async function getAllDraftPicks(type: LeagueType) {
  const drafts = await prisma.draft.findMany({
    where: { league: { type } },
    include: {
      picks: {
        include: { team: { include: { user: true } }, player: true },
        orderBy: { pickNo: "asc" },
      },
    },
    orderBy: { season: "desc" },
  });
  return drafts.map((d) => ({ season: d.season, picks: d.picks }));
}
