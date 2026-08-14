import type { LeagueType } from "@prisma/client";
import { prisma } from "../prisma";
import type {
  LeagueGlanceStat,
  LeaguePlacement,
  LeagueGlanceRivalry,
  LeagueGlanceRankingEntry,
  LeagueGlanceGame,
  LeagueGlance,
} from "../types";

const EMPTY_LEAGUE_GLANCE: LeagueGlance = {
  mostPointsScored: null,
  mostPointsScoredRanking: [],
  leastPointsScored: null,
  leagueHole: null,
  leagueHoleRanking: [],
  bestManager: null,
  bestManagerRanking: [],
  worstManager: null,
  hoarder: null,
  hoarderRanking: [],
  skillDiff: null,
  skillDiffRanking: [],
  whosYourDaddy: null,
  whosYourDaddyRanking: [],
  placements: [],
  historicalBlowouts: [],
  historicalTardOffs: [],
};

// Career-spanning stats for the "Leagues at a Glance" boxes on the home
// page. Named by manager (User.displayName) rather than team, since team
// names change season to season but the person doesn't.
export async function getLeagueGlance(type: LeagueType): Promise<LeagueGlance> {
  const leagues = await prisma.league.findMany({
    where: { type },
    orderBy: { season: "asc" },
  });
  if (leagues.length === 0) return EMPTY_LEAGUE_GLANCE;

  const latestSeason = leagues[leagues.length - 1].season;
  const leagueIds = leagues.map((l) => l.id);

  const teams = await prisma.team.findMany({
    where: { leagueId: { in: leagueIds } },
    include: { user: true },
  });

  // Each manager's most recent team avatar (a per-league-season photo, not
  // the account-wide one), so stat tiles always show whoever currently
  // holds the stat with their latest picture.
  const leagueSeasonById = new Map(leagues.map((l) => [l.id, l.season]));
  const avatarByUserId = new Map<string, { season: number; avatar: string | null }>();
  for (const t of teams) {
    const season = leagueSeasonById.get(t.leagueId) ?? -1;
    const existing = avatarByUserId.get(t.userId);
    if (!existing || season > existing.season) {
      avatarByUserId.set(t.userId, { season, avatar: t.avatar });
    }
  }
  const avatarForUser = (userId: string): string | null =>
    avatarByUserId.get(userId)?.avatar ?? null;

  // "Who's Your Daddy": the most lopsided head-to-head rivalry between any
  // two managers, across every season of this league type.
  const games = await prisma.game.findMany({
    where: {
      leagueId: { in: leagueIds },
      NOT: { homeScore: 0, awayScore: 0 },
    },
    include: {
      homeTeam: { include: { user: true } },
      awayTeam: { include: { user: true } },
    },
  });

  type PairRecord = {
    userAId: string;
    userBId: string;
    aWins: number;
    bWins: number;
    ties: number;
  };
  const nameByUserId = new Map<string, string>();
  const pairs = new Map<string, PairRecord>();
  for (const g of games) {
    const homeUserId = g.homeTeam.userId;
    const awayUserId = g.awayTeam.userId;
    if (homeUserId === awayUserId) continue;
    nameByUserId.set(homeUserId, g.homeTeam.user.displayName);
    nameByUserId.set(awayUserId, g.awayTeam.user.displayName);

    const [userAId, userBId] = [homeUserId, awayUserId].sort();
    const key = `${userAId}:${userBId}`;
    const rec = pairs.get(key) ?? { userAId, userBId, aWins: 0, bWins: 0, ties: 0 };
    if (g.homeScore === g.awayScore) {
      rec.ties += 1;
    } else {
      const winnerId = g.homeScore > g.awayScore ? homeUserId : awayUserId;
      if (winnerId === userAId) rec.aWins += 1;
      else rec.bWins += 1;
    }
    pairs.set(key, rec);
  }

  let whosYourDaddy: LeagueGlanceRivalry = null;
  let bestDiff = -1;
  for (const rec of pairs.values()) {
    const diff = Math.abs(rec.aWins - rec.bWins);
    if (diff > bestDiff) {
      bestDiff = diff;
      const aIsDominant = rec.aWins >= rec.bWins;
      const dominantUserId = aIsDominant ? rec.userAId : rec.userBId;
      whosYourDaddy = {
        dominantName: nameByUserId.get(dominantUserId) ?? "Unknown",
        dominantAvatar: avatarForUser(dominantUserId),
        submissiveName: nameByUserId.get(aIsDominant ? rec.userBId : rec.userAId) ?? "Unknown",
        wins: aIsDominant ? rec.aWins : rec.bWins,
        losses: aIsDominant ? rec.bWins : rec.aWins,
        ties: rec.ties,
      };
    }
  }

  const whosYourDaddyRanking: LeagueGlanceRankingEntry[] = [...pairs.values()]
    .map((rec) => {
      const aIsDominant = rec.aWins >= rec.bWins;
      const dominantName = nameByUserId.get(aIsDominant ? rec.userAId : rec.userBId) ?? "Unknown";
      const submissiveName = nameByUserId.get(aIsDominant ? rec.userBId : rec.userAId) ?? "Unknown";
      const wins = aIsDominant ? rec.aWins : rec.bWins;
      const losses = aIsDominant ? rec.bWins : rec.aWins;
      return {
        diff: Math.abs(rec.aWins - rec.bWins),
        name: `${dominantName} vs ${submissiveName}`,
        value: `${wins}-${losses}${rec.ties ? `-${rec.ties}` : ""}`,
      };
    })
    .sort((a, b) => b.diff - a.diff)
    .map(({ name, value }) => ({ name, value }));

  const toGlanceGame = (g: (typeof games)[number]): LeagueGlanceGame => {
    const homeTeamName = g.homeTeam.user.displayName;
    const awayTeamName = g.awayTeam.user.displayName;
    const homeWon = g.homeScore >= g.awayScore;
    return {
      winnerName: homeWon ? homeTeamName : awayTeamName,
      loserName: homeWon ? awayTeamName : homeTeamName,
      winnerScore: homeWon ? g.homeScore : g.awayScore,
      loserScore: homeWon ? g.awayScore : g.homeScore,
      season: g.season,
      week: g.week,
    };
  };

  const historicalBlowouts = [...games]
    .sort(
      (a, b) =>
        Math.abs(b.homeScore - b.awayScore) - Math.abs(a.homeScore - a.awayScore)
    )
    .slice(0, 5)
    .map(toGlanceGame);

  const historicalTardOffs = [...games]
    .sort((a, b) => a.homeScore + a.awayScore - (b.homeScore + b.awayScore))
    .slice(0, 5)
    .map(toGlanceGame);

  type Totals = {
    userId: string;
    name: string;
    pointsFor: number;
    pointsAgainst: number;
    wins: number;
    losses: number;
    ties: number;
  };
  const totalsByUser = new Map<string, Totals>();
  const ensureTotals = (userId: string, name: string) => {
    const existing = totalsByUser.get(userId);
    if (existing) return existing;
    const created: Totals = {
      userId,
      name,
      pointsFor: 0,
      pointsAgainst: 0,
      wins: 0,
      losses: 0,
      ties: 0,
    };
    totalsByUser.set(userId, created);
    return created;
  };

  for (const t of teams) {
    const totals = ensureTotals(t.userId, t.user.displayName);
    totals.pointsFor += t.pointsFor;
    totals.pointsAgainst += t.pointsAgainst;
    totals.wins += t.wins;
    totals.losses += t.losses;
    totals.ties += t.ties;
  }

  // Exclude managers with no games played yet (e.g. a brand new season's
  // roster) from stats that would otherwise trivially "win" at 0.
  const activeTotals = [...totalsByUser.values()].filter(
    (t) => t.wins + t.losses + t.ties > 0
  );
  const winPct = (t: { wins: number; losses: number; ties: number }) => {
    const games = t.wins + t.losses + t.ties;
    return games > 0 ? (t.wins + t.ties * 0.5) / games : 0;
  };

  const maxBy = <T,>(arr: T[], score: (t: T) => number): T | null =>
    arr.length === 0
      ? null
      : arr.reduce((a, b) => (score(b) > score(a) ? b : a));
  const minBy = <T,>(arr: T[], score: (t: T) => number): T | null =>
    arr.length === 0
      ? null
      : arr.reduce((a, b) => (score(b) < score(a) ? b : a));

  const mostPointsScored = maxBy(activeTotals, (t) => t.pointsFor);
  const leastPointsScored = minBy(activeTotals, (t) => t.pointsFor);
  const leagueHole = maxBy(activeTotals, (t) => t.pointsAgainst);
  const bestManager = maxBy(activeTotals, winPct);
  const worstManager = minBy(activeTotals, winPct);
  const skillDiff = maxBy(activeTotals, (t) => t.pointsAgainst - t.pointsFor);

  const rankingBy = (
    score: (t: Totals) => number,
    format: (t: Totals) => string
  ): LeagueGlanceRankingEntry[] =>
    [...activeTotals]
      .sort((a, b) => score(b) - score(a))
      .map((t) => ({ name: t.name, value: format(t) }));

  const mostPointsScoredRanking = rankingBy(
    (t) => t.pointsFor,
    (t) => `${t.pointsFor.toFixed(1)} pts`
  );
  const leagueHoleRanking = rankingBy(
    (t) => t.pointsAgainst,
    (t) => `${t.pointsAgainst.toFixed(1)} pts against`
  );
  const bestManagerRanking = rankingBy(
    winPct,
    (t) => `${t.wins}-${t.losses}${t.ties ? `-${t.ties}` : ""}`
  );
  const skillDiffRanking = rankingBy(
    (t) => t.pointsAgainst - t.pointsFor,
    (t) => {
      const diff = t.pointsAgainst - t.pointsFor;
      return `${diff >= 0 ? "-" : "+"}${Math.abs(diff).toFixed(1)} point differential`;
    }
  );

  // The Hoarder: most waiver/free-agent adds across every season.
  const teamIds = teams.map((t) => t.id);
  const claimCounts =
    teamIds.length > 0
      ? await prisma.rosterTransaction.groupBy({
          by: ["teamId"],
          where: { teamId: { in: teamIds }, type: "ADD" },
          _count: { _all: true },
        })
      : [];
  const teamById = new Map(teams.map((t) => [t.id, t]));
  const claimsByUser = new Map<string, number>();
  for (const c of claimCounts) {
    const team = teamById.get(c.teamId);
    if (!team) continue;
    claimsByUser.set(
      team.userId,
      (claimsByUser.get(team.userId) ?? 0) + c._count._all
    );
  }
  let hoarder: LeagueGlanceStat = null;
  for (const [userId, count] of claimsByUser) {
    const totals = totalsByUser.get(userId);
    if (!totals) continue;
    if (!hoarder || count > hoarder.value) {
      hoarder = { name: totals.name, value: count, avatar: avatarForUser(userId) };
    }
  }
  const hoarderRanking: LeagueGlanceRankingEntry[] = activeTotals
    .map((t) => ({ name: t.name, count: claimsByUser.get(t.userId) ?? 0 }))
    .sort((a, b) => b.count - a.count)
    .map(({ name, count }) => ({
      name,
      value: `${count} claim${count === 1 ? "" : "s"}`,
    }));

  // Average final placement, completed seasons only (i.e. not the current,
  // still-in-progress one). Placement = rank within that season's
  // standings by win% then points for.
  const placementTotals = new Map<string, { total: number; count: number; name: string }>();
  for (const league of leagues) {
    if (league.season >= latestSeason) continue;
    const seasonTeams = teams.filter((t) => t.leagueId === league.id);
    if (seasonTeams.length === 0) continue;

    const ranked = [...seasonTeams].sort((a, b) => {
      const pctA = winPct(a);
      const pctB = winPct(b);
      if (pctB !== pctA) return pctB - pctA;
      return b.pointsFor - a.pointsFor;
    });
    ranked.forEach((t, idx) => {
      const entry = placementTotals.get(t.userId) ?? {
        total: 0,
        count: 0,
        name: t.user.displayName,
      };
      entry.total += idx + 1;
      entry.count += 1;
      placementTotals.set(t.userId, entry);
    });
  }
  const placements: LeaguePlacement[] = [...placementTotals.entries()]
    .map(([userId, v]) => ({
      userId,
      name: v.name,
      avgPlacement: v.total / v.count,
      seasonsCounted: v.count,
    }))
    .sort((a, b) => a.avgPlacement - b.avgPlacement);

  return {
    mostPointsScored: mostPointsScored
      ? {
          name: mostPointsScored.name,
          value: mostPointsScored.pointsFor,
          avatar: avatarForUser(mostPointsScored.userId),
        }
      : null,
    mostPointsScoredRanking,
    leastPointsScored: leastPointsScored
      ? {
          name: leastPointsScored.name,
          value: leastPointsScored.pointsFor,
          avatar: avatarForUser(leastPointsScored.userId),
        }
      : null,
    leagueHole: leagueHole
      ? {
          name: leagueHole.name,
          value: leagueHole.pointsAgainst,
          avatar: avatarForUser(leagueHole.userId),
        }
      : null,
    leagueHoleRanking,
    bestManager: bestManager
      ? {
          name: bestManager.name,
          wins: bestManager.wins,
          losses: bestManager.losses,
          ties: bestManager.ties,
          avatar: avatarForUser(bestManager.userId),
        }
      : null,
    bestManagerRanking,
    worstManager: worstManager
      ? {
          name: worstManager.name,
          wins: worstManager.wins,
          losses: worstManager.losses,
          ties: worstManager.ties,
          avatar: avatarForUser(worstManager.userId),
        }
      : null,
    hoarder,
    hoarderRanking,
    skillDiff: skillDiff
      ? {
          name: skillDiff.name,
          value: skillDiff.pointsAgainst - skillDiff.pointsFor,
          avatar: avatarForUser(skillDiff.userId),
        }
      : null,
    skillDiffRanking,
    whosYourDaddy,
    whosYourDaddyRanking,
    placements,
    historicalBlowouts,
    historicalTardOffs,
  };
}
