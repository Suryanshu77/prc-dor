// Locks the 2026 main-award scoring constants (frozen: 2026 voting history must never change).
import { test } from "node:test";
import assert from "node:assert/strict";
import { POINTS_BY_RANK, RANK_LABELS } from "../src/lib/points.ts";

test("POINTS_BY_RANK is the frozen 2026 map", () => {
  assert.deepEqual(POINTS_BY_RANK, {
    1: 15,
    2: 12,
    3: 10,
    4: 8,
    5: 7,
    6: 6,
    7: 5,
    8: 4,
    9: 3,
    10: 2,
  });
  const sum = Object.values(POINTS_BY_RANK).reduce((a, b) => a + b, 0);
  assert.equal(sum, 72, "a full 1-10 ballot must total 72 points");
});

test("RANK_LABELS covers ranks 1-10", () => {
  assert.equal(RANK_LABELS.length, 10);
  assert.equal(RANK_LABELS[0], "1st");
  assert.equal(RANK_LABELS[9], "10th");
});
