import { LeagueType } from "@prisma/client";
import { prisma } from "./prisma";

// --- Home -----------------------------------------------------------------

export async function getLeagueSummary() {
  const [userCount, dynastySeasons, redraftSeasons, tradeCount] =
    await Promise.all([
      prisma.user.count(),
      prisma.league.findMany({
        where: { type: LeagueType.DYNASTY },
        select: { season: true },
        orderBy: { season: "desc" },
      }),
      prisma.league.findMany({
        where: { type: LeagueType.REDRAFT },
        select: { season: true },
        orderBy: { season: "desc" },
      }),
      prisma.trade.count(),
    ]);

  return {
    userCount,
    dynastySeasons: dynastySeasons.map((s) => s.season),
    redraftSeasons: redraftSeasons.map((s) => s.season),
    tradeCount,
  };
}

type SeasonExtremeTeam = {
  name: string;
  username: string;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
};

export type SeasonSummary = {
  leagueId: string;
  season: number;
  type: LeagueType;
  champion: SeasonExtremeTeam | null;
  mostEfficient: (SeasonExtremeTeam & { efficiency: number }) | null;
  highestScoring: SeasonExtremeTeam | null;
  lowestScoring: SeasonExtremeTeam | null;
  unluckiest: SeasonExtremeTeam | null;
};

export async function getSeasonSummaries(): Promise<SeasonSummary[]> {
  const leagues = await prisma.league.findMany({
    include: { teams: { include: { user: true } } },
    orderBy: [{ season: "desc" }, { type: "asc" }],
  });

  const summaries: SeasonSummary[] = [];
  for (const league of leagues) {
    const teamsWithGames = league.teams.filter(
      (t) => t.wins + t.losses + t.ties > 0
    );
    if (teamsWithGames.length === 0) continue;

    const scores = await prisma.playerWeekScore.findMany({
      where: { leagueId: league.id },
      include: { player: true },
    });

    const byTeam = new Map<string, typeof scores>();
    for (const s of scores) {
      const arr = byTeam.get(s.teamId) ?? [];
      arr.push(s);
      byTeam.set(s.teamId, arr);
    }

    const slots = ROSTER_SLOTS[league.type];
    const toExtreme = (t: (typeof league.teams)[number]): SeasonExtremeTeam => ({
      name: t.teamName || t.user.displayName,
      username: t.user.displayName,
      wins: t.wins,
      losses: t.losses,
      ties: t.ties,
      pointsFor: t.pointsFor,
    });

    const withEfficiency = teamsWithGames.map((t) => {
      const teamScores = byTeam.get(t.id) ?? [];
      const byWeek = new Map<number, { points: number; position: string | null }[]>();
      for (const s of teamScores) {
        const week = byWeek.get(s.week) ?? [];
        week.push({ points: s.points, position: s.player.position });
        byWeek.set(s.week, week);
      }
      let pointsForMax = 0;
      for (const weekEntries of byWeek.values()) {
        pointsForMax += optimalWeekTotal(weekEntries, slots);
      }
      return {
        team: t,
        efficiency: pointsForMax > 0 ? t.pointsFor / pointsForMax : null,
      };
    });

    const champion = league.teams.find((t) => t.isChampion);
    const mostEfficient = withEfficiency
      .filter((s) => s.efficiency != null)
      .sort((a, b) => (b.efficiency as number) - (a.efficiency as number))[0];
    const highestScoring = [...teamsWithGames].sort(
      (a, b) => b.pointsFor - a.pointsFor
    )[0];
    const lowestScoring = [...teamsWithGames].sort(
      (a, b) => a.pointsFor - b.pointsFor
    )[0];
    const unluckiest = [...teamsWithGames]
      .filter((t) => {
        const games = t.wins + t.losses + t.ties;
        return (t.wins + t.ties * 0.5) / games < 0.5;
      })
      .sort((a, b) => b.pointsFor - a.pointsFor)[0];

    summaries.push({
      leagueId: league.id,
      season: league.season,
      type: league.type,
      champion: champion ? toExtreme(champion) : null,
      mostEfficient: mostEfficient
        ? { ...toExtreme(mostEfficient.team), efficiency: mostEfficient.efficiency as number }
        : null,
      highestScoring: highestScoring ? toExtreme(highestScoring) : null,
      lowestScoring: lowestScoring ? toExtreme(lowestScoring) : null,
      unluckiest: unluckiest ? toExtreme(unluckiest) : null,
    });
  }

  return summaries;
}

export type LeagueGlanceStat = { name: string; value: number } | null;
export type LeagueGlanceRecord = {
  name: string;
  wins: number;
  losses: number;
  ties: number;
} | null;
export type LeaguePlacement = {
  userId: string;
  name: string;
  avgPlacement: number;
  seasonsCounted: number;
};
export type LeagueGlanceRivalry = {
  dominantName: string;
  submissiveName: string;
  wins: number;
  losses: number;
  ties: number;
} | null;

export type LeagueGlance = {
  mostPointsScored: LeagueGlanceStat;
  leastPointsScored: LeagueGlanceStat;
  leagueHole: LeagueGlanceStat;
  bestManager: LeagueGlanceRecord;
  worstManager: LeagueGlanceRecord;
  hoarder: LeagueGlanceStat;
  skillDiff: LeagueGlanceStat;
  whosYourDaddy: LeagueGlanceRivalry;
  placements: LeaguePlacement[];
};

const EMPTY_LEAGUE_GLANCE: LeagueGlance = {
  mostPointsScored: null,
  leastPointsScored: null,
  leagueHole: null,
  bestManager: null,
  worstManager: null,
  hoarder: null,
  skillDiff: null,
  whosYourDaddy: null,
  placements: [],
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
      whosYourDaddy = {
        dominantName: nameByUserId.get(aIsDominant ? rec.userAId : rec.userBId) ?? "Unknown",
        submissiveName: nameByUserId.get(aIsDominant ? rec.userBId : rec.userAId) ?? "Unknown",
        wins: aIsDominant ? rec.aWins : rec.bWins,
        losses: aIsDominant ? rec.bWins : rec.aWins,
        ties: rec.ties,
      };
    }
  }

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
    if (!hoarder || count > hoarder.value) hoarder = { name: totals.name, value: count };
  }

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
      ? { name: mostPointsScored.name, value: mostPointsScored.pointsFor }
      : null,
    leastPointsScored: leastPointsScored
      ? { name: leastPointsScored.name, value: leastPointsScored.pointsFor }
      : null,
    leagueHole: leagueHole
      ? { name: leagueHole.name, value: leagueHole.pointsAgainst }
      : null,
    bestManager: bestManager
      ? {
          name: bestManager.name,
          wins: bestManager.wins,
          losses: bestManager.losses,
          ties: bestManager.ties,
        }
      : null,
    worstManager: worstManager
      ? {
          name: worstManager.name,
          wins: worstManager.wins,
          losses: worstManager.losses,
          ties: worstManager.ties,
        }
      : null,
    hoarder,
    skillDiff: skillDiff
      ? { name: skillDiff.name, value: skillDiff.pointsAgainst - skillDiff.pointsFor }
      : null,
    whosYourDaddy,
    placements,
  };
}

// --- Team page --------------------------------------------------------------

const POSITION_ORDER = ["QB", "RB", "WR", "TE", "K", "DEF"];

function compareRosterEntries(
  a: { player: { position: string | null }; avgScore: number | null },
  b: { player: { position: string | null }; avgScore: number | null }
) {
  const rank = (position: string | null) => {
    const idx = position ? POSITION_ORDER.indexOf(position) : -1;
    return idx === -1 ? POSITION_ORDER.length : idx;
  };
  const rankDiff = rank(a.player.position) - rank(b.player.position);
  if (rankDiff !== 0) return rankDiff;
  return (b.avgScore ?? -Infinity) - (a.avgScore ?? -Infinity);
}

export async function getTeamsByType(type: LeagueType) {
  const leagues = await prisma.league.findMany({
    where: { type },
    orderBy: { season: "desc" },
  });
  if (leagues.length === 0) {
    return { seasons: [] as number[], bySeason: {} as Record<number, SeasonTeams> };
  }
  const latestSeason = leagues[0].season;

  // Number of championships won by each user across every season of this
  // league type, for the "League Wins" badge.
  const championshipCounts = await prisma.team.groupBy({
    by: ["userId"],
    where: { isChampion: true, league: { type } },
    _count: { _all: true },
  });
  const leagueWinsByUserId = new Map(
    championshipCounts.map((c) => [c.userId, c._count._all])
  );

  const bySeason: Record<number, SeasonTeams> = {};
  for (const league of leagues) {
    const isHistorical = league.season !== latestSeason;

    const teams = await prisma.team.findMany({
      where: { leagueId: league.id },
      include: {
        user: true,
        roster: {
          include: { player: true },
          orderBy: [{ isStarter: "desc" }, { player: { position: "asc" } }],
        },
      },
      orderBy: [{ division: "asc" }, { user: { displayName: "asc" } }],
    });

    let avgScoreByTeamPlayer = new Map<string, number>();
    if (isHistorical && teams.length > 0) {
      const scores = await prisma.playerWeekScore.groupBy({
        by: ["teamId", "playerId"],
        where: { teamId: { in: teams.map((t) => t.id) } },
        _avg: { points: true },
      });
      avgScoreByTeamPlayer = new Map(
        scores.map((s) => [`${s.teamId}:${s.playerId}`, s._avg.points ?? 0])
      );
    }

    bySeason[league.season] = {
      isHistorical,
      divisionNames: league.divisionNames,
      teams: teams.map((t) => ({
        id: t.id,
        teamName: t.teamName,
        wins: t.wins,
        losses: t.losses,
        ties: t.ties,
        division: t.division,
        leagueWins: leagueWinsByUserId.get(t.userId) ?? 0,
        user: t.user,
        roster: t.roster
          .filter((r) => !r.isTaxi)
          .map((r) => ({
            isStarter: r.isStarter,
            player: r.player,
            avgScore: isHistorical
              ? (avgScoreByTeamPlayer.get(`${t.id}:${r.playerId}`) ?? null)
              : null,
          }))
          .sort(compareRosterEntries),
        taxi: t.roster
          .filter((r) => r.isTaxi)
          .map((r) => ({
            isStarter: r.isStarter,
            player: r.player,
            avgScore: isHistorical
              ? (avgScoreByTeamPlayer.get(`${t.id}:${r.playerId}`) ?? null)
              : null,
          }))
          .sort(compareRosterEntries),
      })),
    };
  }

  return { seasons: leagues.map((l) => l.season), bySeason };
}

type SeasonTeams = {
  isHistorical: boolean;
  divisionNames: string[];
  teams: {
    id: string;
    teamName: string | null;
    wins: number;
    losses: number;
    ties: number;
    division: number | null;
    leagueWins: number;
    user: { id: string; displayName: string; avatar: string | null };
    roster: {
      isStarter: boolean;
      player: { id: string; fullName: string; position: string | null };
      avgScore: number | null;
    }[];
    taxi: {
      isStarter: boolean;
      player: { id: string; fullName: string; position: string | null };
      avgScore: number | null;
    }[];
  }[];
};

// --- Team detail page --------------------------------------------------------

// Starting lineup requirements per league type, per the site's rules:
//   Redraft: 1 QB, 2 RB, 2 WR, 1 TE, 1 FLEX (RB/WR/TE), 1 K, 1 DEF
//   Dynasty: 1 QB, 2 RB, 2 WR, 1 TE, 2 FLEX (RB/WR/TE), 1 SFLEX (QB/RB/WR/TE), no K/DEF
const ROSTER_SLOTS: Record<
  LeagueType,
  { QB: number; RB: number; WR: number; TE: number; FLEX: number; SFLEX: number; K: number; DEF: number }
> = {
  REDRAFT: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, SFLEX: 0, K: 1, DEF: 1 },
  DYNASTY: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 2, SFLEX: 1, K: 0, DEF: 0 },
};

// Computes the highest-scoring lineup possible for one week given the
// players available and the slot requirements. Filling strict positions
// first, then FLEX, then SFLEX is optimal here because each tier's
// eligibility is a superset of the previous one's.
function optimalWeekTotal(
  weekEntries: { points: number; position: string | null }[],
  slots: (typeof ROSTER_SLOTS)[LeagueType]
) {
  let pool = weekEntries.slice();
  const takeTop = (
    predicate: (p: { points: number; position: string | null }) => boolean,
    n: number
  ) => {
    if (n <= 0) return 0;
    const eligible = pool
      .filter(predicate)
      .sort((a, b) => b.points - a.points)
      .slice(0, n);
    pool = pool.filter((p) => !eligible.includes(p));
    return eligible.reduce((sum, p) => sum + p.points, 0);
  };

  let total = 0;
  total += takeTop((p) => p.position === "QB", slots.QB);
  total += takeTop((p) => p.position === "RB", slots.RB);
  total += takeTop((p) => p.position === "WR", slots.WR);
  total += takeTop((p) => p.position === "TE", slots.TE);
  total += takeTop((p) => p.position === "K", slots.K);
  total += takeTop((p) => p.position === "DEF", slots.DEF);
  total += takeTop((p) => ["RB", "WR", "TE"].includes(p.position ?? ""), slots.FLEX);
  total += takeTop(
    (p) => ["QB", "RB", "WR", "TE"].includes(p.position ?? ""),
    slots.SFLEX
  );
  return total;
}

// Builds the roster-slot sequence for a league type, e.g. Redraft:
// [QB, RB, RB, WR, WR, TE, FLEX, K, DEF]. Used to order a box score's
// starters by roster slot rather than just by position.
function buildSlotSequence(leagueType: LeagueType) {
  const slots = ROSTER_SLOTS[leagueType];
  const sequence: ((position: string | null) => boolean)[] = [];
  const push = (n: number, predicate: (position: string | null) => boolean) => {
    for (let i = 0; i < n; i++) sequence.push(predicate);
  };
  push(slots.QB, (p) => p === "QB");
  push(slots.RB, (p) => p === "RB");
  push(slots.WR, (p) => p === "WR");
  push(slots.TE, (p) => p === "TE");
  push(slots.FLEX, (p) => ["RB", "WR", "TE"].includes(p ?? ""));
  push(slots.SFLEX, (p) => ["QB", "RB", "WR", "TE"].includes(p ?? ""));
  push(slots.K, (p) => p === "K");
  push(slots.DEF, (p) => p === "DEF");
  return sequence;
}

// Orders actual starters by roster slot (QB1, RB1, RB2, ..., FLEX, ...)
// rather than by position group. Since we only know who started, not which
// literal slot (WR2 vs FLEX) they were in, each slot in sequence claims the
// highest-scoring remaining eligible starter — a reasonable, deterministic
// stand-in for the real (unrecorded) slot assignment.
function orderStartersBySlot<T extends { position: string | null; points: number }>(
  starters: T[],
  leagueType: LeagueType
): T[] {
  const pool = starters.slice();
  const ordered: T[] = [];
  for (const isEligible of buildSlotSequence(leagueType)) {
    const eligible = pool.filter((p) => isEligible(p.position)).sort((a, b) => b.points - a.points);
    const pick = eligible[0];
    if (!pick) continue;
    ordered.push(pick);
    pool.splice(pool.indexOf(pick), 1);
  }
  ordered.push(...pool); // any leftovers (shouldn't normally happen)
  return ordered;
}

export async function getTeamDetail(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;

  const teams = await prisma.team.findMany({
    where: { userId },
    include: {
      league: true,
      roster: {
        include: { player: true },
        orderBy: [{ isStarter: "desc" }, { player: { position: "asc" } }],
      },
    },
    orderBy: [{ league: { season: "desc" } }],
  });

  const latestSeasonByType = new Map<LeagueType, number>();
  for (const t of teams) {
    const current = latestSeasonByType.get(t.league.type);
    if (current === undefined || t.league.season > current) {
      latestSeasonByType.set(t.league.type, t.league.season);
    }
  }

  // Every player-week score for every team-season this owner has had, plus
  // per-team game counts, used to derive the stat box on the right.
  const statsByTeamId = new Map<string, TeamSeasonStats>();
  const avgScoreByTeamId = new Map<string, Map<string, number>>();
  for (const t of teams) {
    const [scores, games] = await Promise.all([
      prisma.playerWeekScore.findMany({
        where: { teamId: t.id },
        include: { player: true },
      }),
      prisma.game.findMany({
        where: { leagueId: t.leagueId, OR: [{ homeTeamId: t.id }, { awayTeamId: t.id }] },
        orderBy: { week: "asc" },
      }),
    ]);
    // Team.pointsFor (from Sleeper) only ever covers regular-season weeks,
    // so gamesPlayed has to match that scope too, or "Points For (Avg)"
    // silently divides by too many games.
    const gamesPlayed = games.filter((g) => !g.isPlayoffs).length;
    const weeklyScores = games.map((g) => ({
      week: g.week,
      points: g.homeTeamId === t.id ? g.homeScore : g.awayScore,
      isPlayoffs: g.isPlayoffs,
    }));

    const byPlayer = new Map<
      string,
      { player: { id: string; fullName: string; position: string | null }; total: number; weeks: number }
    >();
    let benchPoints = 0;
    const byWeek = new Map<number, { points: number; position: string | null }[]>();
    for (const s of scores) {
      const entry = byPlayer.get(s.playerId) ?? { player: s.player, total: 0, weeks: 0 };
      entry.total += s.points;
      entry.weeks += 1;
      byPlayer.set(s.playerId, entry);

      if (!s.isStarter) benchPoints += s.points;

      const week = byWeek.get(s.week) ?? [];
      week.push({ points: s.points, position: s.player.position });
      byWeek.set(s.week, week);
    }

    const avgScoreByPlayerId = new Map(
      [...byPlayer].map(([id, v]) => [id, v.total / v.weeks])
    );
    avgScoreByTeamId.set(t.id, avgScoreByPlayerId);

    const playerOfSeason =
      [...byPlayer.values()].sort((a, b) => b.total - a.total)[0] ?? null;

    const rosterAverage =
      byPlayer.size > 0
        ? [...avgScoreByPlayerId.values()].reduce((sum, v) => sum + v, 0) / byPlayer.size
        : null;

    const slots = ROSTER_SLOTS[t.league.type];
    let pointsForMax = 0;
    for (const weekEntries of byWeek.values()) {
      pointsForMax += optimalWeekTotal(weekEntries, slots);
    }

    statsByTeamId.set(t.id, {
      gamesPlayed,
      weeklyScores,
      pointsForMax,
      pointsForAvg: gamesPlayed > 0 ? t.pointsFor / gamesPlayed : null,
      efficiency: pointsForMax > 0 ? t.pointsFor / pointsForMax : null,
      benchPoints,
      rosterAverage,
      playerOfSeason: playerOfSeason
        ? {
            id: playerOfSeason.player.id,
            fullName: playerOfSeason.player.fullName,
            position: playerOfSeason.player.position,
            totalPoints: playerOfSeason.total,
          }
        : null,
    });
  }

  const career = teams.reduce(
    (acc, t) => {
      acc.wins += t.wins;
      acc.losses += t.losses;
      acc.ties += t.ties;
      acc.championships += t.isChampion ? 1 : 0;
      return acc;
    },
    { wins: 0, losses: 0, ties: 0, championships: 0 }
  );

  return {
    user: { id: user.id, displayName: user.displayName, avatar: user.avatar },
    career,
    seasons: teams.map((t) => ({
      teamId: t.id,
      season: t.league.season,
      leagueType: t.league.type,
      isHistorical: t.league.season !== latestSeasonByType.get(t.league.type),
      divisionName:
        t.division != null
          ? (t.league.divisionNames[t.division - 1] ?? `Division ${t.division}`)
          : null,
      teamName: t.teamName,
      wins: t.wins,
      losses: t.losses,
      ties: t.ties,
      pointsFor: t.pointsFor,
      pointsAgainst: t.pointsAgainst,
      isChampion: t.isChampion,
      roster: t.roster
        .filter((r) => !r.isTaxi)
        .map((r) => ({
          isStarter: r.isStarter,
          player: r.player,
          avgScore: avgScoreByTeamId.get(t.id)?.get(r.playerId) ?? null,
        }))
        .sort(compareRosterEntries),
      taxi: t.roster
        .filter((r) => r.isTaxi)
        .map((r) => ({
          isStarter: r.isStarter,
          player: r.player,
          avgScore: avgScoreByTeamId.get(t.id)?.get(r.playerId) ?? null,
        }))
        .sort(compareRosterEntries),
      stats: statsByTeamId.get(t.id) as TeamSeasonStats,
    })),
  };
}

type TeamSeasonStats = {
  gamesPlayed: number;
  weeklyScores: { week: number; points: number; isPlayoffs: boolean }[];
  pointsForMax: number;
  pointsForAvg: number | null;
  efficiency: number | null;
  benchPoints: number;
  rosterAverage: number | null;
  playerOfSeason: {
    id: string;
    fullName: string;
    position: string | null;
    totalPoints: number;
  } | null;
};

export type TeamDetail = NonNullable<Awaited<ReturnType<typeof getTeamDetail>>>;

export type TeamTransaction = {
  id: string;
  leagueType: LeagueType;
  season: number;
  date: string;
  kind: "TRADE_IN" | "TRADE_OUT" | "WAIVER_ADD" | "DROP" | "DRAFT_PICK";
  assetName: string;
  counterpartyTeamName: string | null;
  pickLabel: string | null;
};

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
        ? a.fromTeam.teamName || a.fromTeam.user.displayName
        : a.toTeam.teamName || a.toTeam.user.displayName,
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

export type HeadToHeadRecord = {
  opponentUserId: string;
  opponentName: string;
  wins: number;
  losses: number;
  ties: number;
};

// All-time record (regular season + playoffs, across every season of the
// given league type) against every other owner this user has ever played.
export async function getTeamHeadToHead(
  userId: string
): Promise<Record<LeagueType, HeadToHeadRecord[]>> {
  const teams = await prisma.team.findMany({
    where: { userId },
    include: { league: true },
  });
  if (teams.length === 0) return { DYNASTY: [], REDRAFT: [] };

  const teamIds = teams.map((t) => t.id);
  const typeByTeamId = new Map(teams.map((t) => [t.id, t.league.type]));

  const games = await prisma.game.findMany({
    where: { OR: [{ homeTeamId: { in: teamIds } }, { awayTeamId: { in: teamIds } }] },
    include: {
      homeTeam: { include: { user: true } },
      awayTeam: { include: { user: true } },
    },
    orderBy: [{ season: "asc" }, { week: "asc" }],
  });

  const recordsByType: Record<LeagueType, Map<string, HeadToHeadRecord>> = {
    DYNASTY: new Map(),
    REDRAFT: new Map(),
  };

  for (const g of games) {
    // Sleeper pre-generates the full season's matchups with 0-0 placeholder
    // scores before they're actually played.
    if (g.homeScore === 0 && g.awayScore === 0) continue;

    const isHome = teamIds.includes(g.homeTeamId);
    const isAway = teamIds.includes(g.awayTeamId);
    if (isHome === isAway) continue; // not one of ours, or somehow both

    const type = typeByTeamId.get(isHome ? g.homeTeamId : g.awayTeamId);
    if (!type) continue;

    const myScore = isHome ? g.homeScore : g.awayScore;
    const oppScore = isHome ? g.awayScore : g.homeScore;
    const oppTeam = isHome ? g.awayTeam : g.homeTeam;
    if (oppTeam.userId === userId) continue;

    const map = recordsByType[type];
    const record = map.get(oppTeam.userId) ?? {
      opponentUserId: oppTeam.userId,
      opponentName: oppTeam.user.displayName,
      wins: 0,
      losses: 0,
      ties: 0,
    };
    record.opponentName = oppTeam.user.displayName;
    if (myScore > oppScore) record.wins += 1;
    else if (myScore < oppScore) record.losses += 1;
    else record.ties += 1;
    map.set(oppTeam.userId, record);
  }

  const sortRecords = (map: Map<string, HeadToHeadRecord>) =>
    [...map.values()].sort((a, b) => {
      const games = b.wins + b.losses + b.ties - (a.wins + a.losses + a.ties);
      return games !== 0 ? games : b.wins - a.wins;
    });

  return {
    DYNASTY: sortRecords(recordsByType.DYNASTY),
    REDRAFT: sortRecords(recordsByType.REDRAFT),
  };
}

// --- Draft history page -------------------------------------------------------

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

// --- Trade history page ---------------------------------------------------

export type TradeCardAsset = {
  id: string;
  label: string;
  position: string | null;
};

export type TradeCardTeam = {
  teamId: string;
  teamName: string;
  incoming: TradeCardAsset[];
  outgoing: TradeCardAsset[];
};

export type TradeCard = {
  id: string;
  season: number;
  tradeDate: string;
  teams: TradeCardTeam[];
};

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

// --- Game log page ----------------------------------------------------------

export async function getGamesForType(type: LeagueType) {
  const games = await prisma.game.findMany({
    where: {
      league: { type },
      // Sleeper pre-generates the full season's matchups with 0-0
      // placeholder scores before any games are actually played.
      NOT: { homeScore: 0, awayScore: 0 },
    },
    include: {
      league: true,
      homeTeam: { include: { user: true } },
      awayTeam: { include: { user: true } },
    },
    orderBy: [{ season: "desc" }, { week: "desc" }],
  });
  return games;
}

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

// --- Box score page ----------------------------------------------------------

// Curated stat lines per position, pulled from the raw Sleeper stat keys
// stored on PlayerWeekScore.stats. Values are rounded since Sleeper reports
// them as floats even though they're always whole counts/yards in practice.
function boxScoreStatLines(
  position: string | null,
  stats: Record<string, number> | null
): { label: string; value: string }[] {
  if (!stats) return [];
  const n = (key: string) => Math.round(stats[key] ?? 0);

  switch (position) {
    case "QB":
      return [
        { label: "Comp/Att", value: `${n("pass_cmp")}/${n("pass_att")}` },
        { label: "Pass Yds", value: `${n("pass_yd")}` },
        { label: "Pass TD", value: `${n("pass_td")}` },
        { label: "INT", value: `${n("pass_int")}` },
        { label: "Rush Yds", value: `${n("rush_yd")}` },
        { label: "Rush TD", value: `${n("rush_td")}` },
      ];
    case "RB":
      return [
        { label: "Rush Att", value: `${n("rush_att")}` },
        { label: "Rush Yds", value: `${n("rush_yd")}` },
        { label: "Rush TD", value: `${n("rush_td")}` },
        { label: "Rec", value: `${n("rec")}` },
        { label: "Rec Yds", value: `${n("rec_yd")}` },
        { label: "Rec TD", value: `${n("rec_td")}` },
      ];
    case "WR":
    case "TE":
      return [
        { label: "Rec", value: `${n("rec")}/${n("rec_tgt")}` },
        { label: "Rec Yds", value: `${n("rec_yd")}` },
        { label: "Rec TD", value: `${n("rec_td")}` },
      ];
    case "K":
      return [
        { label: "FG", value: `${n("fgm")}/${n("fga")}` },
        { label: "XP", value: `${n("xpm")}/${n("xpa")}` },
      ];
    case "DEF":
      return [
        { label: "Sacks", value: `${n("sack")}` },
        { label: "INT", value: `${n("int")}` },
        { label: "Fum Rec", value: `${n("fum_rec")}` },
        { label: "TD", value: `${n("td")}` },
        { label: "Pts Allowed", value: `${n("pts_allow")}` },
      ];
    default:
      return [];
  }
}

export async function getBoxScore(gameId: string) {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      league: true,
      homeTeam: { include: { user: true } },
      awayTeam: { include: { user: true } },
    },
  });
  if (!game) return null;

  const scores = await prisma.playerWeekScore.findMany({
    where: {
      week: game.week,
      teamId: { in: [game.homeTeamId, game.awayTeamId] },
    },
    include: { player: true },
  });

  const compareBenchEntries = (
    a: { position: string | null; points: number },
    b: { position: string | null; points: number }
  ) => {
    const rank = (position: string | null) => {
      const idx = position ? POSITION_ORDER.indexOf(position) : -1;
      return idx === -1 ? POSITION_ORDER.length : idx;
    };
    const rankDiff = rank(a.position) - rank(b.position);
    if (rankDiff !== 0) return rankDiff;
    return b.points - a.points;
  };

  const buildPlayers = (teamId: string) => {
    const players = scores
      .filter((s) => s.teamId === teamId)
      .map((s) => ({
        id: s.player.id,
        fullName: s.player.fullName,
        position: s.player.position,
        points: s.points,
        isStarter: s.isStarter,
        statLines: boxScoreStatLines(
          s.player.position,
          s.stats as Record<string, number> | null
        ),
      }));
    const starters = orderStartersBySlot(
      players.filter((p) => p.isStarter),
      game.league.type
    );
    const bench = players.filter((p) => !p.isStarter).sort(compareBenchEntries);
    return [...starters, ...bench];
  };

  // Pairs each player against their opposite-team counterpart at the same
  // slot (same starter/bench group, same position, same rank within it —
  // e.g. Team A's top starting RB vs Team B's top starting RB), so the UI
  // can mark whether that slot was won or lost.
  const withMatchupResults = (
    players: ReturnType<typeof buildPlayers>,
    opponents: ReturnType<typeof buildPlayers>
  ) => {
    const slotKey = (p: (typeof players)[number]) => `${p.isStarter}:${p.position ?? ""}`;
    const seen = new Map<string, number>();
    const opponentSeen = new Map<string, number>();
    const opponentsBySlot = new Map<string, (typeof opponents)[number]>();
    for (const o of opponents) {
      const key = slotKey(o);
      const idx = opponentSeen.get(key) ?? 0;
      opponentSeen.set(key, idx + 1);
      opponentsBySlot.set(`${key}#${idx}`, o);
    }

    return players.map((p) => {
      const key = slotKey(p);
      const idx = seen.get(key) ?? 0;
      seen.set(key, idx + 1);
      const opponent = opponentsBySlot.get(`${key}#${idx}`);
      const matchupResult =
        opponent == null
          ? null
          : p.points > opponent.points
            ? ("win" as const)
            : p.points < opponent.points
              ? ("loss" as const)
              : ("tie" as const);
      return { ...p, matchupResult };
    });
  };

  const homePlayers = buildPlayers(game.homeTeamId);
  const awayPlayers = buildPlayers(game.awayTeamId);

  return {
    id: game.id,
    season: game.season,
    week: game.week,
    isPlayoffs: game.isPlayoffs,
    home: {
      id: game.homeTeam.id,
      name: game.homeTeam.teamName || game.homeTeam.user.displayName,
      score: game.homeScore,
      players: withMatchupResults(homePlayers, awayPlayers),
    },
    away: {
      id: game.awayTeam.id,
      name: game.awayTeam.teamName || game.awayTeam.user.displayName,
      score: game.awayScore,
      players: withMatchupResults(awayPlayers, homePlayers),
    },
  };
}

export type BoxScore = NonNullable<Awaited<ReturnType<typeof getBoxScore>>>;

// --- Playoffs page -------------------------------------------------------

function playoffRoundLabel(placement: number | null, round: number) {
  if (placement === 1) return "Championship";
  if (placement === 3) return "3rd Place";
  if (placement != null) return `${placement}th Place`;
  return `Round ${round}`;
}

type PlayoffMatchRow = {
  id: string;
  round: number;
  label: string;
  team1: { id: string; name: string } | null;
  team1Score: number | null;
  team2: { id: string; name: string } | null;
  team2Score: number | null;
  winnerId: string | null;
  gameId: string | null;
};

export type PlayoffBracketNode = {
  match: PlayoffMatchRow;
  team1Feeder: PlayoffBracketNode | null;
  team2Feeder: PlayoffBracketNode | null;
};

// Reconstructs the championship advancement tree by walking backward from
// the title match: a team's "feeder" is whichever previous-round match they
// won. Anything left over (3rd place, 5th place, etc) isn't part of that
// tree and gets returned separately as flat consolation matches.
function buildBracketTree(matches: PlayoffMatchRow[]) {
  const championship =
    matches.find((m) => m.label === "Championship") ??
    [...matches].sort((a, b) => b.round - a.round)[0] ??
    null;
  if (!championship) return { root: null as PlayoffBracketNode | null, consolation: matches };

  const included = new Set<string>();
  const buildNode = (match: PlayoffMatchRow): PlayoffBracketNode => {
    included.add(match.id);
    const feederFor = (teamId: string | undefined) => {
      if (!teamId) return null;
      const feeder = matches.find(
        (m) => m.round === match.round - 1 && m.winnerId === teamId
      );
      return feeder ? buildNode(feeder) : null;
    };
    return {
      match,
      team1Feeder: feederFor(match.team1?.id),
      team2Feeder: feederFor(match.team2?.id),
    };
  };

  const root = buildNode(championship);
  return { root, consolation: matches.filter((m) => !included.has(m.id)) };
}

export async function getPlayoffBracket(type: LeagueType) {
  const leagues = await prisma.league.findMany({
    where: { type },
    orderBy: { season: "desc" },
  });

  const bySeason: Record<
    number,
    { root: PlayoffBracketNode | null; consolation: PlayoffMatchRow[] }
  > = {};
  for (const league of leagues) {
    const matches = await prisma.playoffMatch.findMany({
      where: { leagueId: league.id },
      include: {
        team1: { include: { user: true } },
        team2: { include: { user: true } },
      },
      orderBy: [{ round: "asc" }, { matchNum: "asc" }],
    });
    if (matches.length === 0) continue;

    // Used to link each bracket tile to its box score. Matched by team pair
    // rather than week, since we don't persist which week each round fell
    // on for the bracket itself.
    const playoffGames = await prisma.game.findMany({
      where: { leagueId: league.id, isPlayoffs: true },
    });
    const gameIdByTeamPair = new Map<string, string>();
    for (const g of playoffGames) {
      const key = [g.homeTeamId, g.awayTeamId].sort().join(":");
      gameIdByTeamPair.set(key, g.id);
    }

    const rows: PlayoffMatchRow[] = matches.map((m) => ({
      id: m.id,
      round: m.round,
      label: playoffRoundLabel(m.placement, m.round),
      team1: m.team1
        ? { id: m.team1.id, name: m.team1.teamName || m.team1.user.displayName }
        : null,
      team1Score: m.team1Score,
      team2: m.team2
        ? { id: m.team2.id, name: m.team2.teamName || m.team2.user.displayName }
        : null,
      team2Score: m.team2Score,
      winnerId: m.winnerId,
      gameId:
        m.team1Id && m.team2Id
          ? (gameIdByTeamPair.get([m.team1Id, m.team2Id].sort().join(":")) ?? null)
          : null,
    }));

    bySeason[league.season] = buildBracketTree(rows);
  }

  return {
    seasons: leagues.map((l) => l.season).filter((s) => s in bySeason),
    bySeason,
  };
}
