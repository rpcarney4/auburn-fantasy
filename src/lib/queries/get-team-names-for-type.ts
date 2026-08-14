import type { LeagueType } from "@prisma/client";
import { prisma } from "../prisma";

export async function getTeamNamesForType(type: LeagueType) {
  const teams = await prisma.team.findMany({
    where: { league: { type } },
    include: { user: true },
    distinct: ["userId"],
    orderBy: { user: { displayName: "asc" } },
  });
  return teams.map((t) => ({
    userId: t.userId,
    label: t.teamName || t.user.displayName,
  }));
}
