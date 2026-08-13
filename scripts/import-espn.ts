// One-off historical import: pulls the AUB league's pre-2023 ESPN redraft
// seasons into the same schema scripts/sync-sleeper.ts populates. This is
// NOT part of the recurring sync — run manually, once:
//   npx tsx scripts/import-espn.ts
// Safe to re-run: every write is an upsert.
//
// Needs ESPN_S2 and ESPN_SWID in .env (session cookies from a logged-in
// browser — this is a private league, ESPN has no OAuth flow for this).

process.loadEnvFile(".env");

import { LeagueType } from "@prisma/client";
import { prisma } from "../src/lib/prisma";

const ESPN_LEAGUE_ID = "413146559";
const SEASONS = [2021, 2022];
const MAX_WEEKS = 17;

const S2 = process.env.ESPN_S2;
const SWID = process.env.ESPN_SWID;
if (!S2 || !SWID) {
  throw new Error("Missing ESPN_S2 / ESPN_SWID in .env");
}
const COOKIE = `espn_s2=${S2}; SWID=${SWID}`;

// Confirmed with the user: ESPN member GUID -> our existing Sleeper username.
const OWNER_MAP: Record<string, string> = {
  "{0E5FA5BD-4F50-42D5-9FA5-BD4F5092D5AD}": "Jdhenderson28",
  "{2E8749FD-A87A-40E5-8F8A-0104E81BA634}": "samhask1",
  "{3CA925E6-3876-4B10-A925-E63876AB104F}": "syukawa12",
  "{5B6CB819-2EE1-4148-817C-AE1662B2BAFC}": "ethanpyles",
  "{734A073D-533A-417B-849A-234640CF98C9}": "cdt726",
  "{9B578095-657A-4AEA-A472-1A30165B491F}": "rpcarney4",
  "{9E96CA6E-3CCF-47F9-96CA-6E3CCF57F934}": "Deen37",
  "{A0B59EBE-9492-4616-B59E-BE9492061652}": "itsashlong",
  "{D44F980B-7315-4672-9FE2-2CB8AA97BF3E}": "HB15",
  "{EFAD77BF-A771-4FBA-9654-7B0F8CFB3AF0}": "sackdotaub",
  // Same person (Jonathan Mallard / "jmallard"), different ESPN member GUID
  // in 2021 than the one his account used from 2022 on.
  "{098522A6-25F0-4D11-8E5F-95B7991FB0EB}": "sackdotaub",
};

// ESPN's defaultPositionId, confirmed against real roster data this session.
const POSITION_BY_ID: Record<number, string> = {
  1: "QB",
  2: "RB",
  3: "WR",
  4: "TE",
  5: "K",
  16: "DEF",
};

// ESPN lineup slot IDs that mean "not starting" (bench / IR). Everything
// else counts as a starter — confirmed against real lineupSlotCounts.
const BENCH_SLOTS = new Set([20, 21]);

// Standard ESPN proTeamId -> abbreviation table, spot-checked against real
// data this session (11 -> IND matched Jonathan Taylor).
const PRO_TEAM_ABBR: Record<number, string> = {
  1: "ATL", 2: "BUF", 3: "CHI", 4: "CIN", 5: "CLE", 6: "DAL", 7: "DEN",
  8: "DET", 9: "GB", 10: "TEN", 11: "IND", 12: "KC", 13: "LV", 14: "LAR",
  15: "MIA", 16: "MIN", 17: "NE", 18: "NO", 19: "NYG", 20: "NYJ", 21: "PHI",
  22: "ARI", 23: "PIT", 24: "LAC", 25: "SF", 26: "SEA", 27: "TB", 28: "WAS",
  29: "CAR", 30: "JAX", 33: "BAL", 34: "HOU",
};

type EspnPlayer = {
  id: number;
  fullName: string;
  defaultPositionId: number;
  proTeamId: number;
};

async function espnGet<T>(season: number, views: string[], extra = ""): Promise<T> {
  const viewParams = views.map((v) => `view=${v}`).join("&");
  const url = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${season}/segments/0/leagues/${ESPN_LEAGUE_ID}?${viewParams}${extra}`;
  const res = await fetch(url, { headers: { Cookie: COOKIE } });
  if (!res.ok) {
    throw new Error(`ESPN request failed: ${url} (${res.status})`);
  }
  return res.json() as Promise<T>;
}

function normalizeName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\b(jr|sr|ii|iii|iv|v)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// normalizedName -> our Player.id, seeded from every existing (mostly
// Sleeper-sourced) player so ESPN records link to the same rows.
const playerByName = new Map<string, string>();
// ESPN numeric player id -> our Player.id, filled in as we see full player
// objects in weekly rosters (draft picks only carry the numeric id).
const playerIdByEspnId = new Map<number, string>();
const unmatchedNames = new Set<string>();

async function loadPlayerIndex() {
  const players = await prisma.player.findMany();
  for (const p of players) {
    const key = normalizeName(p.fullName);
    if (!playerByName.has(key)) playerByName.set(key, p.id);
  }
}

async function resolvePlayer(espnPlayer: EspnPlayer): Promise<string> {
  const cached = playerIdByEspnId.get(espnPlayer.id);
  if (cached) return cached;

  if (espnPlayer.defaultPositionId === 16) {
    // Team defenses: ESPN names them "49ers D/ST" etc, which won't match our
    // Sleeper-sourced rows by name — link by NFL team instead ("SF").
    const abbr = PRO_TEAM_ABBR[espnPlayer.proTeamId];
    if (abbr) {
      playerIdByEspnId.set(espnPlayer.id, abbr);
      return abbr;
    }
  }

  const key = normalizeName(espnPlayer.fullName);
  const existing = playerByName.get(key);
  if (existing) {
    playerIdByEspnId.set(espnPlayer.id, existing);
    return existing;
  }

  const syntheticId = `espn-${espnPlayer.id}`;
  await prisma.player.upsert({
    where: { id: syntheticId },
    create: {
      id: syntheticId,
      fullName: espnPlayer.fullName,
      position: POSITION_BY_ID[espnPlayer.defaultPositionId] ?? null,
      nflTeam: PRO_TEAM_ABBR[espnPlayer.proTeamId] ?? null,
    },
    update: {},
  });
  playerByName.set(key, syntheticId);
  playerIdByEspnId.set(espnPlayer.id, syntheticId);
  unmatchedNames.add(espnPlayer.fullName);
  return syntheticId;
}

async function importSeason(season: number) {
  console.log(`\nImporting ESPN REDRAFT ${season}...`);

  const base = await espnGet<{
    settings: {
      scheduleSettings: { divisions: { id: number; name: string }[] };
    };
    teams: {
      id: number;
      primaryOwner: string;
      owners: string[];
      location?: string;
      nickname?: string;
      name?: string;
      divisionId: number;
      rankCalculatedFinal: number;
      record: {
        overall: { wins: number; losses: number; ties: number; pointsFor: number; pointsAgainst: number };
      };
    }[];
    draftDetail: {
      picks: { teamId: number; playerId: number; overallPickNumber: number; roundId: number; keeper: boolean }[];
    };
  }>(season, ["mTeam", "mSettings", "mDraftDetail"]);

  // --- League + divisions ---
  const divisions = [...base.settings.scheduleSettings.divisions].sort((a, b) => a.id - b.id);
  const divisionNames = divisions.map((d) => d.name);
  const sleeperLeagueId = `espn-${ESPN_LEAGUE_ID}-${season}`;

  const league = await prisma.league.upsert({
    where: { sleeperLeagueId },
    create: { sleeperLeagueId, type: LeagueType.REDRAFT, season, divisionNames },
    update: { divisionNames },
  });

  // --- Teams ---
  const teamIdByEspnTeamId = new Map<number, string>();
  for (const t of base.teams) {
    const memberGuid = t.primaryOwner ?? t.owners?.[0];
    const username = OWNER_MAP[memberGuid];
    if (!username) {
      console.warn(`  no owner mapping for ESPN member ${memberGuid} (team ${t.id})`);
      continue;
    }
    const user = await prisma.user.findFirst({ where: { username } });
    if (!user) {
      console.warn(`  no local user found for username ${username}`);
      continue;
    }

    const teamName =
      t.name || [t.location, t.nickname].filter(Boolean).join(" ").trim() || null;
    const overall = t.record.overall;

    const team = await prisma.team.upsert({
      where: { leagueId_sleeperRosterId: { leagueId: league.id, sleeperRosterId: t.id } },
      create: {
        leagueId: league.id,
        sleeperRosterId: t.id,
        userId: user.id,
        teamName,
        division: divisions.length > 0 ? t.divisionId + 1 : null,
        isChampion: t.rankCalculatedFinal === 1,
        wins: overall.wins,
        losses: overall.losses,
        ties: overall.ties,
        pointsFor: overall.pointsFor,
        pointsAgainst: overall.pointsAgainst,
      },
      update: {
        userId: user.id,
        teamName,
        division: divisions.length > 0 ? t.divisionId + 1 : null,
        isChampion: t.rankCalculatedFinal === 1,
        wins: overall.wins,
        losses: overall.losses,
        ties: overall.ties,
        pointsFor: overall.pointsFor,
        pointsAgainst: overall.pointsAgainst,
      },
    });
    teamIdByEspnTeamId.set(t.id, team.id);
  }
  console.log(`  teams: ${teamIdByEspnTeamId.size}`);

  // --- Weekly games + rosters + player-week scores ---
  let lastRosterByTeam = new Map<
    string,
    { playerId: string; isStarter: boolean }[]
  >();
  let gamesCount = 0;
  let scoreRows = 0;

  for (let week = 1; week <= MAX_WEEKS; week++) {
    const wk = await espnGet<{
      schedule: {
        matchupPeriodId: number;
        playoffTierType: string;
        home?: { teamId: number; totalPoints: number; rosterForCurrentScoringPeriod?: { entries: WeekEntry[] } };
        away?: { teamId: number; totalPoints: number; rosterForCurrentScoringPeriod?: { entries: WeekEntry[] } };
      }[];
    }>(season, ["mMatchupScore", "mBoxscore"], `&scoringPeriodId=${week}`);

    const entries = wk.schedule.filter((s) => s.matchupPeriodId === week);
    if (entries.length === 0) continue;

    const rosterByTeamThisWeek = new Map<string, { playerId: string; isStarter: boolean }[]>();

    for (const entry of entries) {
      const isPlayoffs = entry.playoffTierType !== "NONE";

      for (const side of [entry.home, entry.away]) {
        if (!side) continue;
        const teamId = teamIdByEspnTeamId.get(side.teamId);
        if (!teamId) continue;

        const rosterRows: { playerId: string; isStarter: boolean }[] = [];
        for (const e of side.rosterForCurrentScoringPeriod?.entries ?? []) {
          const espnPlayer = e.playerPoolEntry.player;
          const playerId = await resolvePlayer(espnPlayer);
          const isStarter = !BENCH_SLOTS.has(e.lineupSlotId);
          rosterRows.push({ playerId, isStarter });

          await prisma.playerWeekScore.upsert({
            where: { teamId_playerId_week: { teamId, playerId, week } },
            create: {
              leagueId: league.id,
              teamId,
              playerId,
              week,
              points: e.playerPoolEntry.appliedStatTotal ?? 0,
              isStarter,
              // statSourceId 0 = actual results, 1 = projections — only want actual.
              stats:
                e.playerPoolEntry.player.stats?.find(
                  (s) => s.scoringPeriodId === week && s.statSourceId === 0
                )?.stats ?? undefined,
            },
            update: {
              points: e.playerPoolEntry.appliedStatTotal ?? 0,
              isStarter,
            },
          });
          scoreRows++;
        }
        rosterByTeamThisWeek.set(teamId, rosterRows);
      }

      // Game row, if both sides are real (skip byes).
      if (entry.home && entry.away) {
        const homeTeamId = teamIdByEspnTeamId.get(entry.home.teamId);
        const awayTeamId = teamIdByEspnTeamId.get(entry.away.teamId);
        if (
          homeTeamId &&
          awayTeamId &&
          !(entry.home.totalPoints === 0 && entry.away.totalPoints === 0)
        ) {
          await prisma.game.upsert({
            where: {
              leagueId_week_homeTeamId_awayTeamId: { leagueId: league.id, week, homeTeamId, awayTeamId },
            },
            create: {
              leagueId: league.id,
              season,
              week,
              homeTeamId,
              awayTeamId,
              homeScore: entry.home.totalPoints,
              awayScore: entry.away.totalPoints,
              isPlayoffs,
            },
            update: {
              homeScore: entry.home.totalPoints,
              awayScore: entry.away.totalPoints,
              isPlayoffs,
            },
          });
          gamesCount++;
        }
      }
    }

    if (rosterByTeamThisWeek.size > 0) lastRosterByTeam = rosterByTeamThisWeek;
    process.stdout.write(`  week ${week}\r`);
  }
  console.log(`  games: ${gamesCount}, player-week scores: ${scoreRows}`);

  // --- Current (season-final) roster snapshot ---
  for (const [teamId, roster] of lastRosterByTeam) {
    await prisma.rosterPlayer.deleteMany({ where: { teamId } });
    for (const r of roster) {
      await prisma.rosterPlayer.upsert({
        where: { teamId_playerId: { teamId, playerId: r.playerId } },
        create: { teamId, playerId: r.playerId, isStarter: r.isStarter, isTaxi: false },
        update: { isStarter: r.isStarter, isTaxi: false },
      });
    }
  }

  // --- Draft ---
  const picks = base.draftDetail.picks ?? [];
  if (picks.length > 0) {
    const draft = await prisma.draft.upsert({
      where: { sleeperDraftId: sleeperLeagueId },
      create: { sleeperDraftId: sleeperLeagueId, leagueId: league.id, season, startTime: null },
      update: { leagueId: league.id, season },
    });

    let picksSaved = 0;
    for (const pick of picks) {
      const teamId = teamIdByEspnTeamId.get(pick.teamId);
      const playerId = playerIdByEspnId.get(pick.playerId);
      if (!teamId || !playerId) continue;

      await prisma.draftPick.upsert({
        where: { draftId_pickNo: { draftId: draft.id, pickNo: pick.overallPickNumber } },
        create: {
          draftId: draft.id,
          round: pick.roundId,
          pickNo: pick.overallPickNumber,
          teamId,
          playerId,
          isKeeper: pick.keeper ?? false,
        },
        update: { round: pick.roundId, teamId, playerId, isKeeper: pick.keeper ?? false },
      });
      picksSaved++;
    }
    console.log(`  draft picks: ${picksSaved}/${picks.length}`);
  }
}

type WeekEntry = {
  lineupSlotId: number;
  playerPoolEntry: {
    appliedStatTotal: number;
    player: EspnPlayer & {
      stats?: { scoringPeriodId: number; statSourceId: number; stats: Record<string, number> }[];
    };
  };
};

async function main() {
  await loadPlayerIndex();
  for (const season of SEASONS) {
    await importSeason(season);
  }
  if (unmatchedNames.size > 0) {
    console.log(`\n${unmatchedNames.size} players had no existing match and got synthetic rows:`);
    for (const n of unmatchedNames) console.log(`  - ${n}`);
  }
  console.log("\nESPN import complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
