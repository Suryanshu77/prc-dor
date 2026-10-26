// Phase 0 ballot-integrity proof against the REAL base migration DDL (PGlite, hermetic).
// Demonstrates why a row-level BEFORE INSERT trigger cannot verify ballot completeness,
// and validates the corrected atomic design (deferred constraint trigger + RPC).
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const STUB = path.join(ROOT, "tests/sql/00-stub-supabase-env.sql");
const MIGRATION = path.join(
  ROOT,
  "src/supabase/migrations/20260623050414_1338e52f-e1f2-4819-b5f0-ec07f413425a.sql",
);
const FIXTURES = path.join(ROOT, "tests/sql/20-ballot-integrity-fixtures.sql");

const POINTS = [15, 12, 10, 8, 7, 6, 5, 4, 3, 2];

async function baseDb() {
  const db = new PGlite();
  await db.exec(await readFile(STUB, "utf8"));
  await db.exec(await readFile(MIGRATION, "utf8"));
  return db;
}

let db;
let periodId;
let ballot10;
const playerIds = [];

before(async () => {
  db = await baseDb();
  await db.exec(await readFile(FIXTURES, "utf8"));
  const period = await db.query(
    "SELECT id FROM public.voting_periods WHERE year = 2026",
  );
  periodId = period.rows[0].id;
  for (let i = 0; i < 12; i++) {
    const id = randomUUID();
    await db.query(
      "INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES ($1, $2, $3)",
      [
        id,
        `player${i}@test.local`,
        JSON.stringify({ full_name: `Player ${i}` }),
      ],
    );
    playerIds.push(id);
  }
  ballot10 = playerIds.slice(0, 10);
});

async function newVoter() {
  const id = randomUUID();
  await db.query(
    "INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES ($1, $2, $3)",
    [
      id,
      `voter-${id}@test.local`,
      JSON.stringify({ full_name: `Voter ${id}` }),
    ],
  );
  return id;
}

async function insertBallot(voterId, playerIdsForVoter, pointsOverride) {
  for (let i = 0; i < 10; i++) {
    await db.query(
      `INSERT INTO public.votes (voter_id, ranked_player_id, rank_position, points, voting_period_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        voterId,
        playerIdsForVoter[i],
        i + 1,
        pointsOverride && pointsOverride.rank === i + 1
          ? pointsOverride.points
          : POINTS[i],
        periodId,
      ],
    );
  }
}

test("FLAW DEMO: row-level BEFORE INSERT trigger cannot detect incomplete ballots", async () => {
  const demo = await baseDb();
  await demo.exec(`
    CREATE OR REPLACE FUNCTION public.fn_naive_row_check()
    RETURNS TRIGGER LANGUAGE plpgsql AS $$
    BEGIN
      IF NEW.rank_position < 1 OR NEW.rank_position > 10 THEN
        RAISE EXCEPTION 'rank out of range';
      END IF;
      IF NEW.points NOT IN (15,12,10,8,7,6,5,4,3,2) THEN
        RAISE EXCEPTION 'bad points';
      END IF;
      RETURN NEW;
    END $$;
    CREATE TRIGGER trg_naive BEFORE INSERT ON public.votes
      FOR EACH ROW EXECUTE FUNCTION public.fn_naive_row_check();
  `);
  const voter = randomUUID();
  await demo.query("INSERT INTO auth.users (id, email) VALUES ($1, $2)", [
    voter,
    "n@t.local",
  ]);
  const period = await demo.query(
    "SELECT id FROM public.voting_periods WHERE year = 2026",
  );
  const players = [];
  for (let i = 0; i < 5; i++) {
    const id = randomUUID();
    await demo.query("INSERT INTO auth.users (id, email) VALUES ($1, $2)", [
      id,
      `p${i}@t.local`,
    ]);
    players.push(id);
  }
  await demo.exec("BEGIN");
  for (let i = 0; i < 5; i++) {
    await demo.query(
      `INSERT INTO public.votes (voter_id, ranked_player_id, rank_position, points, voting_period_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [voter, players[i], i + 1, POINTS[i], period.rows[0].id],
    );
  }
  await demo.exec("COMMIT");
  const count = await demo.query(
    "SELECT count(*)::int AS n FROM public.votes WHERE voter_id = $1",
    [voter],
  );
  assert.equal(count.rows[0].n, 5, "partial 5-row ballot committed undetected");
  await demo.close();
});

test("complete 10-row ballot in a single transaction commits (points sum 72)", async () => {
  const voter = await newVoter();
  await db.exec("BEGIN");
  await insertBallot(voter, playerIds);
  await db.exec("COMMIT");
  const r = await db.query(
    "SELECT count(*)::int AS n, coalesce(sum(points),0)::int AS pts FROM public.votes WHERE voter_id = $1",
    [voter],
  );
  assert.equal(r.rows[0].n, 10);
  assert.equal(r.rows[0].pts, 72);
});

test("partial 5-row ballot rejected at COMMIT by deferred constraint trigger", async () => {
  const voter = await newVoter();
  await db.exec("BEGIN");
  for (let i = 0; i < 5; i++) {
    await db.query(
      `INSERT INTO public.votes (voter_id, ranked_player_id, rank_position, points, voting_period_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [voter, playerIds[i], i + 1, POINTS[i], periodId],
    );
  }
  await assert.rejects(
    () => db.exec("COMMIT"),
    /ballot_integrity: incomplete ballot/,
  );
  const r = await db.query(
    "SELECT count(*)::int AS n FROM public.votes WHERE voter_id = $1",
    [voter],
  );
  assert.equal(
    r.rows[0].n,
    0,
    "failed COMMIT must roll back the partial ballot",
  );
});

test("wrong points for a rank rejected at COMMIT", async () => {
  const voter = await newVoter();
  await db.exec("BEGIN");
  await insertBallot(voter, playerIds, { rank: 1, points: 14 });
  await assert.rejects(
    () => db.exec("COMMIT"),
    /ballot_integrity: points do not match rank map/,
  );
});

test("duplicate rank blocked by existing UNIQUE(voter_id, rank_position, voting_period_id)", async () => {
  const voter = await newVoter();
  await db.exec("BEGIN");
  await insertBallot(voter, playerIds);
  await assert.rejects(
    () =>
      db.query(
        `INSERT INTO public.votes (voter_id, ranked_player_id, rank_position, points, voting_period_id)
         VALUES ($1, $2, 1, 15, $3)`,
        [voter, playerIds[11], periodId],
      ),
    /unique|duplicate/i,
  );
  await db.exec("ROLLBACK");
});

test("second ballot in same period blocked by existing unique constraint", async () => {
  const voter = await newVoter();
  await db.exec("BEGIN");
  await insertBallot(voter, playerIds);
  await db.exec("COMMIT");
  await assert.rejects(
    () =>
      db.query(
        `INSERT INTO public.votes (voter_id, ranked_player_id, rank_position, points, voting_period_id)
         VALUES ($1, $2, 1, 15, $3)`,
        [voter, playerIds[11], periodId],
      ),
    /unique|duplicate/i,
  );
});

test("submit_main_ballot happy path: 10 rows, server-derived points", async () => {
  const voter = await newVoter();
  await db.query("SELECT set_config('test.user_id', $1, false)", [voter]);
  await db.query("SELECT public.submit_main_ballot($1, $2)", [
    periodId,
    ballot10,
  ]);
  const r = await db.query(
    "SELECT count(*)::int AS n, sum(points)::int AS pts FROM public.votes WHERE voter_id = $1",
    [voter],
  );
  assert.equal(r.rows[0].n, 10);
  assert.equal(r.rows[0].pts, 72);
  const ranks = await db.query(
    "SELECT array_agg(rank_position ORDER BY rank_position) AS ranks FROM public.votes WHERE voter_id = $1",
    [voter],
  );
  assert.deepEqual(ranks.rows[0].ranks, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});

test("submit_main_ballot rejects partial input before any insert", async () => {
  const voter = await newVoter();
  await db.query("SELECT set_config('test.user_id', $1, false)", [voter]);
  await assert.rejects(
    () =>
      db.query("SELECT public.submit_main_ballot($1, $2)", [
        periodId,
        playerIds.slice(0, 5),
      ]),
    /exactly 10/,
  );
  const r = await db.query(
    "SELECT count(*)::int AS n FROM public.votes WHERE voter_id = $1",
    [voter],
  );
  assert.equal(r.rows[0].n, 0);
});

test("submit_main_ballot rejects duplicate players", async () => {
  const voter = await newVoter();
  await db.query("SELECT set_config('test.user_id', $1, false)", [voter]);
  const dup = [...playerIds.slice(0, 9), playerIds[0]];
  await assert.rejects(
    () => db.query("SELECT public.submit_main_ballot($1, $2)", [periodId, dup]),
    /duplicate player/,
  );
});

test("submit_main_ballot rejects double voting", async () => {
  const voter = await newVoter();
  await db.query("SELECT set_config('test.user_id', $1, false)", [voter]);
  await db.query("SELECT public.submit_main_ballot($1, $2)", [
    periodId,
    ballot10,
  ]);
  await assert.rejects(
    () =>
      db.query("SELECT public.submit_main_ballot($1, $2)", [
        periodId,
        ballot10,
      ]),
    /already submitted/,
  );
});

test("submit_main_ballot rejects unknown player", async () => {
  const voter = await newVoter();
  await db.query("SELECT set_config('test.user_id', $1, false)", [voter]);
  const withUnknown = [...playerIds.slice(0, 9), randomUUID()];
  await assert.rejects(
    () =>
      db.query("SELECT public.submit_main_ballot($1, $2)", [
        periodId,
        withUnknown,
      ]),
    /unknown player/,
  );
});

test("admin full-ballot delete commits (validator treats empty ballot as OK)", async () => {
  const voter = await newVoter();
  await db.exec("BEGIN");
  await insertBallot(voter, playerIds);
  await db.exec("COMMIT");
  await db.exec("BEGIN");
  await db.query("DELETE FROM public.votes WHERE voter_id = $1", [voter]);
  await db.exec("COMMIT");
  const r = await db.query(
    "SELECT count(*)::int AS n FROM public.votes WHERE voter_id = $1",
    [voter],
  );
  assert.equal(r.rows[0].n, 0);
});

test("partial ballot delete (torn ballot) rejected at COMMIT", async () => {
  const voter = await newVoter();
  await db.exec("BEGIN");
  await insertBallot(voter, playerIds);
  await db.exec("COMMIT");
  await db.exec("BEGIN");
  await db.query(
    "DELETE FROM public.votes WHERE voter_id = $1 AND rank_position <= 3",
    [voter],
  );
  await assert.rejects(
    () => db.exec("COMMIT"),
    /ballot_integrity: incomplete ballot/,
  );
});
