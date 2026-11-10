// Recurring PRC D'OR milestone countdown (src/lib/prc-countdown.ts):
// - 27 April 00:00:00 IST  -> Voting Opens
// - 1 May 00:00:00 IST     -> Results Announcement
// - the cycle repeats every year, indefinitely, in Asia/Kolkata only.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import {
  cycleOf,
  formatCompact,
  formatIstDateTime,
  resolveMilestone,
  timeLeft,
} from "../src/lib/prc-countdown.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

/** An IST wall-clock time as the UTC instant it maps to. */
function ist(year, month, day, hour = 0, minute = 0, second = 0) {
  return new Date(
    Date.UTC(year, month - 1, day, hour, minute, second) - IST_OFFSET_MS,
  );
}

test("before 27 April the countdown targets that year's Voting Opens", () => {
  for (const now of [
    ist(2027, 1, 1),
    ist(2027, 4, 26, 23, 59, 59),
    ist(2031, 3, 15, 9, 30, 0),
  ]) {
    const milestone = resolveMilestone(now);
    assert.equal(milestone.key, "voting-opens");
    assert.equal(milestone.name, "Voting Opens");
    assert.ok(milestone.at.getTime() > now.getTime());
  }
  assert.equal(resolveMilestone(ist(2027, 4, 26)).year, 2027);
});

test("from 27 April until 1 May the countdown targets Results Announcement", () => {
  const boundary = ist(2027, 4, 27);
  assert.equal(resolveMilestone(boundary).key, "results-announcement");
  assert.equal(
    resolveMilestone(ist(2027, 4, 27, 12)).key,
    "results-announcement",
  );
  assert.equal(
    resolveMilestone(ist(2027, 4, 30, 23, 59, 59)).key,
    "results-announcement",
  );
  assert.equal(resolveMilestone(ist(2027, 4, 27)).year, 2027);
});

test("from 1 May the countdown rolls to the next year's Voting Opens", () => {
  assert.equal(resolveMilestone(ist(2027, 5, 1)).key, "voting-opens");
  assert.equal(resolveMilestone(ist(2027, 5, 1)).year, 2028);
  assert.equal(resolveMilestone(ist(2027, 12, 31, 23, 59, 59)).year, 2028);
  assert.equal(resolveMilestone(ist(2027, 6, 15)).key, "voting-opens");
});

test("the annual cycle keeps working well beyond 2028", () => {
  assert.equal(resolveMilestone(ist(2029, 2, 1)).year, 2029);
  assert.equal(resolveMilestone(ist(2030, 4, 26)).year, 2030);
  assert.equal(resolveMilestone(ist(2030, 4, 27)).key, "results-announcement");
  assert.equal(resolveMilestone(ist(2030, 6, 1)).year, 2031);
  assert.equal(resolveMilestone(ist(2035, 1, 1)).year, 2035);
  assert.equal(resolveMilestone(ist(2035, 5, 1)).year, 2036);
  assert.equal(resolveMilestone(ist(2048, 12, 25)).year, 2049);
});

test("leap days do not disturb the cycle", () => {
  assert.equal(resolveMilestone(ist(2028, 2, 29, 12)).year, 2028);
  assert.equal(resolveMilestone(ist(2028, 2, 29)).key, "voting-opens");
  assert.equal(resolveMilestone(ist(2028, 4, 26)).key, "voting-opens");
  assert.equal(resolveMilestone(ist(2028, 4, 27)).key, "results-announcement");
  assert.equal(resolveMilestone(ist(2028, 5, 1)).year, 2029);
});

test("milestone instants are exact 00:00:00 IST moments", () => {
  const voting = resolveMilestone(ist(2027, 1, 1));
  assert.equal(voting.at.getTime(), ist(2027, 4, 27).getTime());
  assert.equal(formatIstDateTime(voting.at), "27 April 2027, 00:00:00 IST");
  assert.equal(voting.exact, "27 April 2027, 00:00:00 IST");

  const results = resolveMilestone(ist(2027, 4, 28));
  assert.equal(results.at.getTime(), ist(2027, 5, 1).getTime());
  assert.equal(results.exact, "1 May 2027, 00:00:00 IST");
});

test("cycleOf returns both milestones of the active year", () => {
  const beforeSeason = cycleOf(resolveMilestone(ist(2027, 3, 1)));
  assert.deepEqual(
    beforeSeason.map((m) => [m.key, m.year]),
    [
      ["voting-opens", 2027],
      ["results-announcement", 2027],
    ],
  );

  const afterResults = cycleOf(resolveMilestone(ist(2027, 6, 1)));
  assert.deepEqual(
    afterResults.map((m) => [m.key, m.year]),
    [
      ["voting-opens", 2028],
      ["results-announcement", 2028],
    ],
  );
  assert.equal(
    afterResults[0].at.getTime(),
    ist(2028, 4, 27).getTime(),
    "the 2028 cycle must roll forward automatically",
  );
});

test("formatCompact renders the collapsed '168d : 12h : 45m' shape", () => {
  const target = ist(2027, 4, 27);
  const start = new Date(
    target.getTime() - (168 * 86400 + 12 * 3600 + 45 * 60) * 1000,
  );
  const remaining = timeLeft(start, target);
  assert.deepEqual(
    {
      days: remaining.days,
      hours: remaining.hours,
      minutes: remaining.minutes,
      seconds: remaining.seconds,
    },
    { days: 168, hours: 12, minutes: 45, seconds: 0 },
  );
  assert.equal(formatCompact(remaining), "168d : 12h : 45m");
  assert.match(formatCompact(remaining), /^\d+d : \d{2}h : \d{2}m$/);
});

test("timeLeft clamps at zero and breaks down into d/h/m/s", () => {
  const target = ist(2027, 4, 27);
  const past = new Date(target.getTime() + 5000);
  assert.equal(timeLeft(past, target).totalMs, 0);

  const start = new Date(
    target.getTime() - (2 * 86400 + 3 * 3600 + 4 * 60 + 5) * 1000,
  );
  assert.deepEqual(timeLeft(start, target), {
    totalMs: (2 * 86400 + 3 * 3600 + 4 * 60 + 5) * 1000,
    days: 2,
    hours: 3,
    minutes: 4,
    seconds: 5,
  });
});

test("countdown never consults the browser's local timezone", () => {
  const src = readFileSync(path.join(root, "src/lib/prc-countdown.ts"), "utf8");
  const localGetters = [
    "getFullYear",
    "getMonth",
    "getDate",
    "getDay",
    "getHours",
    "getMinutes",
    "getSeconds",
    "getTimezoneOffset",
  ];
  for (const getter of localGetters) {
    assert.ok(
      !src.includes(`.${getter}(`),
      `prc-countdown.ts must not use local-time method ${getter}()`,
    );
  }
  assert.ok(
    src.includes("IST_OFFSET_MS"),
    "the fixed IST offset must be explicit",
  );
});

test("results are identical under non-IST process timezones", () => {
  const moduleUrl = pathToFileURL(
    path.join(root, "src/lib/prc-countdown.ts"),
  ).href;
  const script = [
    `import(${JSON.stringify(moduleUrl)}).then((m) => {`,
    `  const now = new Date(Date.UTC(2026, 10, 9, 4, 30, 0));`,
    `  const a = m.resolveMilestone(now);`,
    `  const b = m.resolveMilestone(new Date(Date.UTC(2027, 4, 1)));`,
    `  console.log(JSON.stringify([a.key, a.year, a.exact, b.key, b.year]));`,
    `}).catch((e) => { console.error(e); process.exit(1); });`,
  ].join("\n");

  const run = (tz) =>
    execFileSync(process.execPath, ["-e", script], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, TZ: tz },
    }).trim();

  const expected = JSON.stringify([
    "voting-opens",
    2027,
    "27 April 2027, 00:00:00 IST",
    "voting-opens",
    2028,
  ]);

  for (const tz of ["Asia/Kolkata", "America/New_York", "Asia/Tokyo", "UTC"]) {
    assert.equal(run(tz), expected, `unexpected result under TZ=${tz}`);
  }
});
