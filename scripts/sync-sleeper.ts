// Pulls league, roster, matchup, draft, and trade data from the Sleeper API
// and upserts it into Postgres via Prisma.
//
// By default only syncs each league type's CURRENT season — the common
// case, run daily via .github/workflows/sync-sleeper.yml. Pass --full to
// also walk the previous_league_id chain and resync every past season;
// that's only needed for backfills or late corrections to historical data,
// so it runs manually or via the monthly
// .github/workflows/sync-sleeper-full.yml instead.
//
// Either way, weeks that are already final are skipped — once a week is
// scored and the season has moved past it, that data never changes, so
// re-requesting it on every run is pure waste. Only the most recent final
// week (in case of late corrections) plus everything after it gets synced.
//
// Sleeper's API is public and read-only: https://docs.sleeper.com/

import {
  LeagueType,
  Prisma,
  RosterTransactionType,
  TradeAssetType,
} from "@prisma/client";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/prisma";
import {
  SLEEPER_LEAGUE_STARTING_IDS,
  MAX_WEEKS_PER_SEASON,
} from "../src/lib/sleeper-config";

const SLEEPER_API = "https://api.sleeper.app/v1";

async function sleeperGet<T>(path: string): Promise<T> {
  const res = await fetch(`${SLEEPER_API}${path}`);
  if (!res.ok) {
    throw new Error(`Sleeper API request failed: ${path} (${res.status})`);
  }
  return res.json() as Promise<T>;
}

type SleeperLeague = {
  league_id: string;
  previous_league_id: string | null;
  season: string;
  draft_id: string | null;
  settings: { playoff_week_start?: number; divisions?: number };
  metadata: Record<string, string> | null;
};

type SleeperUser = {
  user_id: string;
  username: string | null;
  display_name: string;
  avatar: string | null;
  metadata: { team_name?: string; avatar?: string } | null;
};

type SleeperRoster = {
  roster_id: number;
  owner_id: string | null;
  players: string[] | null;
  starters: string[] | null;
  taxi: string[] | null;
  settings: {
    wins?: number;
    losses?: number;
    ties?: number;
    fpts?: number;
    fpts_decimal?: number;
    fpts_against?: number;
    fpts_against_decimal?: number;
    division?: number;
  };
};

type SleeperMatchupEntry = {
  roster_id: number;
  matchup_id: number | null;
  points: number | null;
  players_points: Record<string, number> | null;
  starters: string[] | null;
};

// Bracket match from /winners_bracket. `p` is only set on matches that decide
// a final placement (p: 1 is the championship); `w`/`l` are the winning/
// losing roster_id. `t1`/`t2` are the roster_ids playing in this match —
// Sleeper resolves these itself once known, even for later rounds.
type SleeperBracketMatch = {
  r: number;
  m: number;
  p?: number;
  w?: number;
  l?: number;
  t1?: number;
  t2?: number;
};

type SleeperDraftPick = {
  round: number;
  pick_no: number;
  roster_id: number;
  draft_slot: number;
  player_id: string | null;
  is_keeper: boolean | null;
};

type SleeperDraft = {
  draft_id: string;
  start_time: number | null;
  // Maps draft_slot -> the roster_id that originally owned that slot. A
  // pick's own `roster_id` is who actually drafted it, which differs from
  // this when the pick was traded before draft day.
  slot_to_roster_id: Record<string, number>;
};

type SleeperTransaction = {
  transaction_id: string;
  type: string;
  status: string;
  status_updated: number;
  leg: number;
  adds: Record<string, number> | null;
  drops: Record<string, number> | null;
  draft_picks: {
    season: string;
    round: number;
    // The original slot owner (stable across however many times this same
    // pick gets re-traded) — distinct from owner_id/previous_owner_id,
    // which describe just this one trade's leg.
    roster_id: number;
    owner_id: number;
    previous_owner_id: number;
  }[];
};

type SleeperPlayer = {
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  position: string | null;
  team: string | null;
};

// --- Player metadata cache -------------------------------------------------
// Sleeper's /players/nfl dump is ~5MB and covers every player it has ever
// known about. Fetch it once per run and only upsert players we actually
// reference, rather than writing all ~11k rows every sync.

let playerCache: Record<string, SleeperPlayer> | null = null;
const upsertedPlayerIds = new Set<string>();

async function loadPlayerCache() {
  console.log("Fetching Sleeper player database...");
  playerCache = await sleeperGet<Record<string, SleeperPlayer>>("/players/nfl");
}

// --- Weekly stat cache ------------------------------------------------------
// Raw per-player stat lines are NFL-wide, not league-specific, so cache by
// season+week to avoid re-fetching when dynasty and redraft share a season.

const weekStatsCache = new Map<string, Record<string, Record<string, number>>>();

async function loadWeekStats(season: number, week: number) {
  const key = `${season}-${week}`;
  const cached = weekStatsCache.get(key);
  if (cached) return cached;
  const stats = await sleeperGet<Record<string, Record<string, number>>>(
    `/stats/nfl/regular/${season}/${week}`
  );
  weekStatsCache.set(key, stats);
  return stats;
}

async function ensurePlayer(playerId: string | null | undefined) {
  if (!playerId || upsertedPlayerIds.has(playerId)) return;
  const meta = playerCache?.[playerId];
  const fullName =
    meta?.full_name ??
    [meta?.first_name, meta?.last_name].filter(Boolean).join(" ") ??
    playerId;

  await prisma.player.upsert({
    where: { id: playerId },
    create: {
      id: playerId,
      fullName: fullName || playerId,
      position: meta?.position ?? null,
      nflTeam: meta?.team ?? null,
    },
    update: {
      fullName: fullName || playerId,
      position: meta?.position ?? null,
      nflTeam: meta?.team ?? null,
    },
  });
  upsertedPlayerIds.add(playerId);
}

// --- Season sync -------------------------------------------------------------

// Weeks strictly before the last already-final week never change once the
// season has moved past them, so re-requesting them every sync is wasted
// egress. Resume one week back from the last final score (to pick up any
// late stat corrections) rather than always starting over at week 1.
async function getSyncStartWeek(leagueId: string): Promise<number> {
  const lastFinal = await prisma.game.findFirst({
    where: { leagueId, NOT: { homeScore: 0, awayScore: 0 } },
    orderBy: { week: "desc" },
    select: { week: true },
  });
  return lastFinal ? Math.max(1, lastFinal.week - 1) : 1;
}

async function syncSeason(type: LeagueType, sleeperLeague: SleeperLeague) {
  const season = Number(sleeperLeague.season);
  console.log(`Syncing ${type} ${season} (league ${sleeperLeague.league_id})...`);

  const divisionCount = sleeperLeague.settings.divisions ?? 0;
  const divisionNames = Array.from({ length: divisionCount }, (_, i) => {
    const n = i + 1;
    return sleeperLeague.metadata?.[`division_${n}`] || `Division ${n}`;
  });

  const league = await prisma.league.upsert({
    where: { sleeperLeagueId: sleeperLeague.league_id },
    create: {
      sleeperLeagueId: sleeperLeague.league_id,
      type,
      season,
      divisionNames,
    },
    update: { type, season, divisionNames },
  });
  const startWeek = await getSyncStartWeek(league.id);

  // Winners bracket, for the champion badge and the Playoffs page.
  let bracket: SleeperBracketMatch[] = [];
  try {
    bracket = await sleeperGet<SleeperBracketMatch[]>(
      `/league/${sleeperLeague.league_id}/winners_bracket`
    );
  } catch {
    bracket = [];
  }
  const championRosterId = bracket.find((m) => m.p === 1)?.w ?? null;

  // Users
  const sleeperUsers = await sleeperGet<SleeperUser[]>(
    `/league/${sleeperLeague.league_id}/users`
  );
  const userIdByOwnerId = new Map<string, string>();
  for (const su of sleeperUsers) {
    const user = await prisma.user.upsert({
      where: { sleeperId: su.user_id },
      create: {
        sleeperId: su.user_id,
        username: su.username ?? su.display_name,
        displayName: su.display_name,
        avatar: su.avatar,
      },
      update: {
        username: su.username ?? su.display_name,
        displayName: su.display_name,
        avatar: su.avatar,
      },
    });
    userIdByOwnerId.set(su.user_id, user.id);
  }

  // Rosters -> Teams
  const sleeperRosters = await sleeperGet<SleeperRoster[]>(
    `/league/${sleeperLeague.league_id}/rosters`
  );
  const teamIdByRosterId = new Map<number, string>();
  for (const roster of sleeperRosters) {
    const ownerUserId = roster.owner_id
      ? userIdByOwnerId.get(roster.owner_id)
      : undefined;
    if (!ownerUserId) continue; // orphaned/co-owned roster with no primary owner

    const ownerUser = sleeperUsers.find((u) => u.user_id === roster.owner_id);
    const teamName = ownerUser?.metadata?.team_name ?? null;
    const avatar = ownerUser?.metadata?.avatar ?? null;

    const pointsFor =
      (roster.settings.fpts ?? 0) + (roster.settings.fpts_decimal ?? 0) / 100;
    const pointsAgainst =
      (roster.settings.fpts_against ?? 0) +
      (roster.settings.fpts_against_decimal ?? 0) / 100;
    const division = roster.settings.division ?? null;
    const isChampion = championRosterId !== null && roster.roster_id === championRosterId;

    const team = await prisma.team.upsert({
      where: {
        leagueId_sleeperRosterId: {
          leagueId: league.id,
          sleeperRosterId: roster.roster_id,
        },
      },
      create: {
        leagueId: league.id,
        sleeperRosterId: roster.roster_id,
        userId: ownerUserId,
        teamName,
        avatar,
        division,
        isChampion,
        wins: roster.settings.wins ?? 0,
        losses: roster.settings.losses ?? 0,
        ties: roster.settings.ties ?? 0,
        pointsFor,
        pointsAgainst,
      },
      update: {
        userId: ownerUserId,
        teamName,
        avatar,
        division,
        isChampion,
        wins: roster.settings.wins ?? 0,
        losses: roster.settings.losses ?? 0,
        ties: roster.settings.ties ?? 0,
        pointsFor,
        pointsAgainst,
      },
    });
    teamIdByRosterId.set(roster.roster_id, team.id);

    // Current roster snapshot
    await prisma.rosterPlayer.deleteMany({ where: { teamId: team.id } });
    for (const playerId of roster.players ?? []) {
      await ensurePlayer(playerId);
      await prisma.rosterPlayer.create({
        data: {
          teamId: team.id,
          playerId,
          isStarter: roster.starters?.includes(playerId) ?? false,
          isTaxi: roster.taxi?.includes(playerId) ?? false,
        },
      });
    }
  }

  // Matchups -> Games
  const playoffStart = sleeperLeague.settings.playoff_week_start ?? 15;
  // roster_id -> points, per week. Used below to attach scores to the
  // winners bracket, since Sleeper's bracket endpoint doesn't include them.
  const pointsByRosterIdByWeek = new Map<number, Map<number, number>>();
  for (let week = startWeek; week <= MAX_WEEKS_PER_SEASON; week++) {
    const entries = await sleeperGet<SleeperMatchupEntry[]>(
      `/league/${sleeperLeague.league_id}/matchups/${week}`
    );
    if (entries.length === 0) continue;

    const pointsByRosterId = new Map<number, number>();
    for (const entry of entries) {
      if (entry.points != null) pointsByRosterId.set(entry.roster_id, entry.points);
    }
    pointsByRosterIdByWeek.set(week, pointsByRosterId);

    const byMatchupId = new Map<number, SleeperMatchupEntry[]>();
    for (const entry of entries) {
      if (entry.matchup_id == null) continue;
      const group = byMatchupId.get(entry.matchup_id) ?? [];
      group.push(entry);
      byMatchupId.set(entry.matchup_id, group);
    }

    // Per-player weekly scores, for season averages on the Team page and box
    // score breakdowns. Batched into one upsert statement for the whole week
    // rather than one round trip per player, since a week can have 200+ rows.
    const weekStats = await loadWeekStats(season, week);
    const weekScoreRows: {
      teamId: string;
      playerId: string;
      points: number;
      isStarter: boolean;
      stats: Record<string, number> | null;
    }[] = [];
    for (const entry of entries) {
      const teamId = teamIdByRosterId.get(entry.roster_id);
      if (!teamId || !entry.players_points) continue;
      const starters = new Set(entry.starters ?? []);
      for (const [playerId, points] of Object.entries(entry.players_points)) {
        await ensurePlayer(playerId);
        weekScoreRows.push({
          teamId,
          playerId,
          points,
          isStarter: starters.has(playerId),
          stats: weekStats[playerId] ?? null,
        });
      }
    }
    if (weekScoreRows.length > 0) {
      const values = weekScoreRows.map(
        (r) =>
          Prisma.sql`(${randomUUID()}, ${league.id}, ${r.teamId}, ${r.playerId}, ${week}, ${r.points}, ${r.isStarter}, ${r.stats ? JSON.stringify(r.stats) : null}::jsonb)`
      );
      await prisma.$executeRaw`
        INSERT INTO "PlayerWeekScore" (id, "leagueId", "teamId", "playerId", week, points, "isStarter", stats)
        VALUES ${Prisma.join(values)}
        ON CONFLICT ("teamId", "playerId", "week") DO UPDATE SET points = EXCLUDED.points, "isStarter" = EXCLUDED."isStarter", stats = EXCLUDED.stats
      `;
    }

    for (const pair of byMatchupId.values()) {
      if (pair.length !== 2) continue;
      const [a, b] = pair;
      if (a.points == null || b.points == null) continue; // not played yet
      const homeTeamId = teamIdByRosterId.get(a.roster_id);
      const awayTeamId = teamIdByRosterId.get(b.roster_id);
      if (!homeTeamId || !awayTeamId) continue;

      await prisma.game.upsert({
        where: {
          leagueId_week_homeTeamId_awayTeamId: {
            leagueId: league.id,
            week,
            homeTeamId,
            awayTeamId,
          },
        },
        create: {
          leagueId: league.id,
          season,
          week,
          homeTeamId,
          awayTeamId,
          homeScore: a.points,
          awayScore: b.points,
          isPlayoffs: week >= playoffStart,
        },
        update: {
          homeScore: a.points,
          awayScore: b.points,
          isPlayoffs: week >= playoffStart,
        },
      });
    }
  }

  // Playoff bracket, for the Playoffs page. Each round happens one week
  // after the last, starting at playoffStart. Scores come from the
  // per-week points collected above rather than the bracket endpoint,
  // which doesn't report them.
  for (const match of bracket) {
    if (match.t1 == null || match.t2 == null) continue; // not decided yet
    const team1Id = teamIdByRosterId.get(match.t1);
    const team2Id = teamIdByRosterId.get(match.t2);
    if (!team1Id || !team2Id) continue;

    const matchWeek = playoffStart + match.r - 1;
    const weekPoints = pointsByRosterIdByWeek.get(matchWeek);

    await prisma.playoffMatch.upsert({
      where: {
        leagueId_round_matchNum: {
          leagueId: league.id,
          round: match.r,
          matchNum: match.m,
        },
      },
      create: {
        leagueId: league.id,
        round: match.r,
        matchNum: match.m,
        placement: match.p ?? null,
        team1Id,
        team1Score: weekPoints?.get(match.t1) ?? null,
        team2Id,
        team2Score: weekPoints?.get(match.t2) ?? null,
        winnerId: match.w != null ? teamIdByRosterId.get(match.w) : null,
      },
      update: {
        placement: match.p ?? null,
        team1Id,
        team1Score: weekPoints?.get(match.t1) ?? null,
        team2Id,
        team2Score: weekPoints?.get(match.t2) ?? null,
        winnerId: match.w != null ? teamIdByRosterId.get(match.w) : null,
      },
    });
  }

  // Draft
  if (sleeperLeague.draft_id) {
    const sleeperDraft = await sleeperGet<SleeperDraft>(
      `/draft/${sleeperLeague.draft_id}`
    );
    const startTime = sleeperDraft.start_time
      ? new Date(sleeperDraft.start_time)
      : null;

    const draft = await prisma.draft.upsert({
      where: { sleeperDraftId: sleeperLeague.draft_id },
      create: {
        sleeperDraftId: sleeperLeague.draft_id,
        leagueId: league.id,
        season,
        startTime,
      },
      update: { leagueId: league.id, season, startTime },
    });

    const picks = await sleeperGet<SleeperDraftPick[]>(
      `/draft/${sleeperLeague.draft_id}/picks`
    );
    for (const pick of picks) {
      const teamId = teamIdByRosterId.get(pick.roster_id);
      if (!teamId) continue;
      await ensurePlayer(pick.player_id);
      const originalRosterId =
        sleeperDraft.slot_to_roster_id?.[String(pick.draft_slot)] ?? null;

      await prisma.draftPick.upsert({
        where: {
          draftId_pickNo: { draftId: draft.id, pickNo: pick.pick_no },
        },
        create: {
          draftId: draft.id,
          round: pick.round,
          pickNo: pick.pick_no,
          teamId,
          playerId: pick.player_id,
          isKeeper: pick.is_keeper ?? false,
          originalRosterId,
        },
        update: {
          round: pick.round,
          teamId,
          playerId: pick.player_id,
          isKeeper: pick.is_keeper ?? false,
          originalRosterId,
        },
      });
    }
  }

  // Trades, waiver claims, free agent adds, and drops
  for (let week = startWeek; week <= MAX_WEEKS_PER_SEASON; week++) {
    const transactions = await sleeperGet<SleeperTransaction[]>(
      `/league/${sleeperLeague.league_id}/transactions/${week}`
    );
    for (const tx of transactions) {
      if (tx.status !== "complete") continue;

      if (tx.type === "waiver" || tx.type === "free_agent") {
        const adds = tx.adds ?? {};
        const drops = tx.drops ?? {};
        for (const [playerId, rosterId] of Object.entries(adds)) {
          const teamId = teamIdByRosterId.get(rosterId);
          if (!teamId) continue;
          await ensurePlayer(playerId);
          await prisma.rosterTransaction.upsert({
            where: {
              sleeperTransactionId_playerId_type: {
                sleeperTransactionId: tx.transaction_id,
                playerId,
                type: RosterTransactionType.ADD,
              },
            },
            create: {
              sleeperTransactionId: tx.transaction_id,
              leagueId: league.id,
              teamId,
              playerId,
              type: RosterTransactionType.ADD,
              transactionDate: new Date(tx.status_updated),
            },
            update: {
              teamId,
              transactionDate: new Date(tx.status_updated),
            },
          });
        }
        for (const [playerId, rosterId] of Object.entries(drops)) {
          const teamId = teamIdByRosterId.get(rosterId);
          if (!teamId) continue;
          await ensurePlayer(playerId);
          await prisma.rosterTransaction.upsert({
            where: {
              sleeperTransactionId_playerId_type: {
                sleeperTransactionId: tx.transaction_id,
                playerId,
                type: RosterTransactionType.DROP,
              },
            },
            create: {
              sleeperTransactionId: tx.transaction_id,
              leagueId: league.id,
              teamId,
              playerId,
              type: RosterTransactionType.DROP,
              transactionDate: new Date(tx.status_updated),
            },
            update: {
              teamId,
              transactionDate: new Date(tx.status_updated),
            },
          });
        }
        continue;
      }

      if (tx.type !== "trade") continue;

      const trade = await prisma.trade.upsert({
        where: { sleeperTransactionId: tx.transaction_id },
        create: {
          sleeperTransactionId: tx.transaction_id,
          leagueId: league.id,
          tradeDate: new Date(tx.status_updated),
          season,
          week: tx.leg,
        },
        update: {
          tradeDate: new Date(tx.status_updated),
          week: tx.leg,
        },
      });

      // Replace prior assets for this trade so re-syncs don't duplicate rows.
      await prisma.tradeAsset.deleteMany({ where: { tradeId: trade.id } });

      const adds = tx.adds ?? {};
      const drops = tx.drops ?? {};
      for (const [playerId, toRosterId] of Object.entries(adds)) {
        const fromRosterId = drops[playerId];
        const fromTeamId = fromRosterId
          ? teamIdByRosterId.get(fromRosterId)
          : undefined;
        const toTeamId = teamIdByRosterId.get(toRosterId);
        if (!fromTeamId || !toTeamId) continue;

        await ensurePlayer(playerId);
        await prisma.tradeAsset.create({
          data: {
            tradeId: trade.id,
            assetType: TradeAssetType.PLAYER,
            playerId,
            fromTeamId,
            toTeamId,
          },
        });
      }

      for (const dp of tx.draft_picks ?? []) {
        const fromTeamId = teamIdByRosterId.get(dp.previous_owner_id);
        const toTeamId = teamIdByRosterId.get(dp.owner_id);
        if (!fromTeamId || !toTeamId) continue;

        await prisma.tradeAsset.create({
          data: {
            tradeId: trade.id,
            assetType: TradeAssetType.PICK,
            pickDescription: `${dp.season} Round ${dp.round} Pick`,
            pickSeason: Number(dp.season),
            pickRound: dp.round,
            pickOriginalRosterId: dp.roster_id,
            fromTeamId,
            toTeamId,
          },
        });
      }
    }
  }
}

// --- Chain walking -----------------------------------------------------------

// Default mode: only the current season (the starting league) is synced —
// no walk back through history. Full mode walks the entire
// previous_league_id chain, resyncing every past season too; the walk stops
// gracefully rather than failing the whole job if an old league ever
// becomes unreachable (e.g. Sleeper removes it), since that's expected to
// happen eventually and shouldn't take down the sync of current data.
async function syncLeagueChain(
  type: LeagueType,
  startingLeagueId: string,
  full: boolean
) {
  if (!full) {
    const sleeperLeague = await sleeperGet<SleeperLeague>(
      `/league/${startingLeagueId}`
    );
    await syncSeason(type, sleeperLeague);
    return;
  }

  let leagueId: string | null = startingLeagueId;
  while (leagueId) {
    let sleeperLeague: SleeperLeague;
    try {
      sleeperLeague = await sleeperGet<SleeperLeague>(`/league/${leagueId}`);
    } catch (err) {
      console.warn(
        `Stopping historical walk for ${type} — couldn't fetch league ${leagueId}:`,
        err
      );
      break;
    }
    await syncSeason(type, sleeperLeague);
    leagueId =
      sleeperLeague.previous_league_id &&
      sleeperLeague.previous_league_id !== "0"
        ? sleeperLeague.previous_league_id
        : null;
  }
}

async function main() {
  const full = process.argv.includes("--full");
  await loadPlayerCache();
  await syncLeagueChain(LeagueType.DYNASTY, SLEEPER_LEAGUE_STARTING_IDS.DYNASTY, full);
  await syncLeagueChain(LeagueType.REDRAFT, SLEEPER_LEAGUE_STARTING_IDS.REDRAFT, full);
  console.log(full ? "Full sync complete." : "Sync complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
