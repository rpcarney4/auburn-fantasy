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
    const [scores, gamesPlayed] = await Promise.all([
      prisma.playerWeekScore.findMany({
        where: { teamId: t.id },
        include: { player: true },
      }),
      prisma.game.count({
        where: { leagueId: t.leagueId, OR: [{ homeTeamId: t.id }, { awayTeamId: t.id }] },
      }),
    ]);

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

export type TradeAssetRow = {
  id: string;
  tradeId: string;
  season: number;
  tradeDate: Date;
  label: string;
  position: string;
  fromTeam: string;
  toTeam: string;
  linkedLabels: string[];
};

export async function getTradeAssetRows(): Promise<TradeAssetRow[]> {
  const trades = await prisma.trade.findMany({
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

  const rows: TradeAssetRow[] = [];
  for (const trade of trades) {
    const labelOf = (asset: (typeof trade.assets)[number]) =>
      asset.assetType === "PLAYER"
        ? (asset.player?.fullName ?? "Unknown Player")
        : (asset.pickDescription ?? "Draft Pick");

    for (const asset of trade.assets) {
      rows.push({
        id: asset.id,
        tradeId: trade.id,
        season: trade.season,
        tradeDate: trade.tradeDate,
        label: labelOf(asset),
        position: asset.assetType === "PLAYER"
          ? (asset.player?.position ?? "—")
          : "PICK",
        fromTeam: asset.fromTeam.teamName || asset.fromTeam.user.displayName,
        toTeam: asset.toTeam.teamName || asset.toTeam.user.displayName,
        linkedLabels: trade.assets
          .filter((a) => a.id !== asset.id)
          .map(labelOf),
      });
    }
  }
  return rows;
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

  const compareBoxScoreEntries = (
    a: { isStarter: boolean; position: string | null; points: number },
    b: { isStarter: boolean; position: string | null; points: number }
  ) => {
    if (a.isStarter !== b.isStarter) return a.isStarter ? -1 : 1;
    const rank = (position: string | null) => {
      const idx = position ? POSITION_ORDER.indexOf(position) : -1;
      return idx === -1 ? POSITION_ORDER.length : idx;
    };
    const rankDiff = rank(a.position) - rank(b.position);
    if (rankDiff !== 0) return rankDiff;
    return b.points - a.points;
  };

  const buildTeam = (team: typeof game.homeTeam, score: number) => ({
    id: team.id,
    name: team.teamName || team.user.displayName,
    score,
    players: scores
      .filter((s) => s.teamId === team.id)
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
      }))
      .sort(compareBoxScoreEntries),
  });

  return {
    id: game.id,
    season: game.season,
    week: game.week,
    isPlayoffs: game.isPlayoffs,
    home: buildTeam(game.homeTeam, game.homeScore),
    away: buildTeam(game.awayTeam, game.awayScore),
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
    }));

    bySeason[league.season] = buildBracketTree(rows);
  }

  return {
    seasons: leagues.map((l) => l.season).filter((s) => s in bySeason),
    bySeason,
  };
}
