// Dynamic LIVE nav indicator (Ballon d'Or / Special Awards tabs).
// - Pure status derivation from voting_periods.is_active and
//   special_awards.voting_open (src/lib/voting-live.ts): every open/closed
//   combination, both state transitions, and the fail-closed error path.
// - Nav wiring (src/components/AppShell.tsx): the main ballot tab is labelled
//   "Ballon d'Or" while keeping route /vote, and each tab renders its own LIVE
//   badge only while its own status flag is true.
// - Automatic updates: admin toggles invalidate the very query keys the hook
//   reads, plus a bounded poll for changes made outside this tab.
// - Accessibility: the pulsing dot animation is disabled under
//   prefers-reduced-motion while the badge itself stays visible.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  deriveVotingLiveStatus,
  VOTING_LIVE_REFETCH_MS,
} from "../src/lib/voting-live.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(path.join(ROOT, rel), "utf8");

const shell = read("src/components/AppShell.tsx");
const hook = read("src/lib/use-voting-live.ts");
const badge = read("src/components/LiveBadge.tsx");
const admin = read("src/routes/_authenticated/admin.tsx");
const styles = read("src/styles.css");

// ==========================================================================
// 1-4. Independent status combination (open/closed matrix)
// ==========================================================================
test("Special Awards live while the Ballon d'Or period is closed", () => {
  const status = deriveVotingLiveStatus({
    activePeriod: null,
    specialAwards: [
      { award_key: "kopa", voting_open: true },
      { award_key: "yashin", voting_open: false },
    ],
  });
  assert.deepEqual(status, {
    ballonDorLive: false,
    specialAwardsLive: true,
  });
});

test("Ballon d'Or live while Special Awards voting is closed", () => {
  const status = deriveVotingLiveStatus({
    activePeriod: { is_active: true, year: 2027 },
    specialAwards: [
      { award_key: "kopa", voting_open: false },
      { award_key: "socrates", voting_open: false },
    ],
  });
  assert.deepEqual(status, {
    ballonDorLive: true,
    specialAwardsLive: false,
  });
});

test("both closed means no LIVE badge at all", () => {
  for (const input of [
    { activePeriod: { is_active: false }, specialAwards: [] },
    {
      activePeriod: { is_active: false },
      specialAwards: [{ voting_open: false }, { voting_open: false }],
    },
    { activePeriod: null, specialAwards: [] },
  ]) {
    assert.deepEqual(deriveVotingLiveStatus(input), {
      ballonDorLive: false,
      specialAwardsLive: false,
    });
  }
});

test("both open means LIVE beside both tabs", () => {
  const status = deriveVotingLiveStatus({
    activePeriod: { is_active: true },
    specialAwards: [
      { voting_open: false },
      { voting_open: true },
      { voting_open: true },
    ],
  });
  assert.deepEqual(status, {
    ballonDorLive: true,
    specialAwardsLive: true,
  });
});

// ==========================================================================
// 5-6. Admin-driven transitions (closed <-> live)
// ==========================================================================
test("closed-to-live: badges appear when an admin opens voting", () => {
  const closed = deriveVotingLiveStatus({
    activePeriod: { is_active: false },
    specialAwards: [{ voting_open: false }],
  });
  assert.deepEqual(closed, {
    ballonDorLive: false,
    specialAwardsLive: false,
  });

  const opened = deriveVotingLiveStatus({
    activePeriod: { is_active: true },
    specialAwards: [{ voting_open: true }],
  });
  assert.deepEqual(opened, {
    ballonDorLive: true,
    specialAwardsLive: true,
  });

  // Each tab flips on its own — opening one never lights the other.
  assert.deepEqual(
    deriveVotingLiveStatus({
      activePeriod: { is_active: true },
      specialAwards: [{ voting_open: false }],
    }),
    { ballonDorLive: true, specialAwardsLive: false },
  );
  assert.deepEqual(
    deriveVotingLiveStatus({
      activePeriod: null,
      specialAwards: [{ voting_open: true }],
    }),
    { ballonDorLive: false, specialAwardsLive: true },
  );
});

test("live-to-closed: badges disappear when an admin closes voting", () => {
  const live = deriveVotingLiveStatus({
    activePeriod: { is_active: true },
    specialAwards: [{ voting_open: true }],
  });
  assert.deepEqual(live, {
    ballonDorLive: true,
    specialAwardsLive: true,
  });

  assert.deepEqual(
    deriveVotingLiveStatus({
      activePeriod: { is_active: false },
      specialAwards: [{ voting_open: true }],
    }),
    { ballonDorLive: false, specialAwardsLive: true },
  );
  assert.deepEqual(
    deriveVotingLiveStatus({
      activePeriod: { is_active: true },
      specialAwards: [{ voting_open: false }],
    }),
    { ballonDorLive: true, specialAwardsLive: false },
  );
  assert.deepEqual(
    deriveVotingLiveStatus({
      activePeriod: { is_active: false },
      specialAwards: [{ voting_open: false }],
    }),
    { ballonDorLive: false, specialAwardsLive: false },
  );
});

// ==========================================================================
// 7. Failed / loading / malformed status queries never show LIVE
// ==========================================================================
test("failed or incomplete status queries fail closed", () => {
  for (const input of [
    { activePeriod: undefined, specialAwards: undefined },
    { activePeriod: null, specialAwards: null },
    { activePeriod: {}, specialAwards: [] },
    { activePeriod: { is_active: null }, specialAwards: [{}] },
    {
      activePeriod: { is_active: "true" },
      specialAwards: [{ voting_open: 1 }],
    },
  ]) {
    assert.deepEqual(
      deriveVotingLiveStatus(input),
      { ballonDorLive: false, specialAwardsLive: false },
      `must fail closed for ${JSON.stringify(input)}`,
    );
  }
});

test("the hook derives status from query data and never hardcodes it", () => {
  // Status comes from the two existing status fields, via the existing keys.
  assert.match(hook, /queryKey: \["active-period"\]/);
  assert.match(hook, /queryKey: \["special-awards"\]/);
  assert.match(hook, /\.from\("voting_periods"\)/);
  assert.match(hook, /\.from\("special_awards"\)/);
  assert.match(hook, /activePeriod: periodQ\.data/);
  assert.match(hook, /specialAwards: awardsQ\.data/);

  // No literal LIVE flags anywhere in the hook, and errors resolve to data
  // the pure derivation treats as unknown (never a truthy default).
  assert.ok(
    !/ballonDorLive\s*:/.test(hook),
    "useVotingLiveStatus must not construct status flags itself",
  );
  assert.ok(
    !/specialAwardsLive\s*:/.test(hook),
    "useVotingLiveStatus must not construct status flags itself",
  );
  assert.match(hook, /if \(error\)/);
  assert.ok(
    !/\?\?\s*true/.test(hook) && !/= true;/.test(hook),
    "a failed status query must never resolve to LIVE",
  );

  // Same row shape as the app's other observers of these keys: React Query
  // shares the cache entry per key, so a narrower select would break
  // vote.tsx / admin.tsx consumers of ["active-period"] / ["special-awards"].
  assert.ok(
    (hook.match(/\.select\("\*"\)/g) ?? []).length === 2,
    "both status queries must keep the app-wide select('*') row shape",
  );
});

// ==========================================================================
// 9. Main navigation label is Ballon d'Or while the route stays /vote
// ==========================================================================
const NAV_BLOCK = shell.match(/const NAV: NavItem\[\] = \[([\s\S]*?)\n\];/);
assert.ok(NAV_BLOCK, "AppShell NAV array not found");

const navItems = [
  ...NAV_BLOCK[1].matchAll(
    /\{\s*to:\s*"([^"]+)",\s*label:\s*"([^"]+)",\s*icon:\s*\w+,\s*(?:liveKey:\s*"(\w+)"\s*,?\s*)?\}/g,
  ),
].map(([, to, label, liveKey]) => ({ to, label, liveKey }));

test("main ballot tab is labelled Ballon d'Or and still routes to /vote", () => {
  const main = navItems.find((n) => n.to === "/vote");
  assert.ok(main, "the /vote nav entry must exist");
  assert.equal(main.label, "Ballon d'Or");
  assert.equal(main.liveKey, "ballonDorLive");

  assert.ok(
    !navItems.some((n) => n.label === "Vote"),
    'the old "Vote" label must be gone from navigation',
  );
  assert.ok(
    !navItems.some((n) => n.to.startsWith("/ballon")),
    "renaming the label must not introduce a new route",
  );

  // Routing and page behaviour are untouched: same route module, same path.
  const voteRoute = read("src/routes/_authenticated/vote.tsx");
  assert.match(voteRoute, /createFileRoute\("\/_authenticated\/vote"\)/);
  assert.ok(
    existsSync(path.join(ROOT, "src/routes/_authenticated/vote.tsx")),
    "the /vote route module must still exist",
  );
  assert.equal(
    existsSync(path.join(ROOT, "src/routes/_authenticated/ballon-dor.tsx")),
    false,
    "no replacement route file may be added",
  );
});

test("Special Awards keeps its own label and its own LIVE key", () => {
  const special = navItems.find((n) => n.to === "/vote-special");
  assert.ok(special, "the /vote-special nav entry must exist");
  assert.equal(special.label, "Special Awards");
  assert.equal(special.liveKey, "specialAwardsLive");
  assert.match(
    read("src/routes/_authenticated/vote-special.tsx"),
    /createFileRoute\("\/_authenticated\/vote-special"\)/,
  );
});

test("each tab renders its LIVE badge independently, only while live", () => {
  assert.match(shell, /const votingLive = useVotingLiveStatus\(\)/);
  // Rendered straight from the query-derived object — no cached flag — so an
  // admin toggle re-renders the badge as soon as React Query delivers data.
  assert.match(
    shell,
    /item\.liveKey && votingLive\[item\.liveKey\] \?/,
    "the badge must be conditional on the live flag of that tab",
  );
  assert.match(shell, /<LiveBadge \/>/);
  assert.ok(
    !/ballonDorLive:\s*true|specialAwardsLive:\s*true/.test(shell),
    "AppShell must never force a LIVE badge on",
  );
  // Only the two voting tabs carry a live key; other tabs never show LIVE.
  assert.deepEqual(
    navItems.filter((n) => n.liveKey).map((n) => [n.to, n.liveKey]),
    [
      ["/vote", "ballonDorLive"],
      ["/vote-special", "specialAwardsLive"],
    ],
  );
});

// ==========================================================================
// Automatic status updates (invalidation + lightweight refetch)
// ==========================================================================
test("admin open/close actions invalidate the exact keys the badges read", () => {
  // PeriodSection: Ballon d'Or open/close + results visibility.
  assert.match(
    admin,
    /qc\.invalidateQueries\(\{ queryKey: \["active-period"\] \}\)/,
  );
  // Special award status switch (setStatus -> refresh) + edition creation.
  assert.match(
    admin,
    /qc\.invalidateQueries\(\{ queryKey: \["special-awards"\] \}\)/,
  );
  const refresh = admin.match(/function refresh\(\) \{[\s\S]*?\n  \}/);
  assert.ok(refresh, "admin award refresh() must exist");
  assert.match(refresh[0], /queryKey: \["special-awards"\]/);
  const setStatus = admin.match(/async function setStatus\([\s\S]*?\n  \}/);
  assert.ok(setStatus, "admin setStatus() must exist");
  assert.match(
    setStatus[0],
    /refresh\(\)/,
    "closing/opening special award voting must refresh the shared cache",
  );
});

test("the badge hook polls lightly and refetches when the tab regains focus", () => {
  assert.ok(
    Number.isFinite(VOTING_LIVE_REFETCH_MS) && VOTING_LIVE_REFETCH_MS > 0,
    "a positive poll interval is required",
  );
  assert.ok(
    VOTING_LIVE_REFETCH_MS <= 60_000,
    "the poll must stay lightweight (<= 60s)",
  );
  assert.equal(
    (hook.match(/refetchInterval: VOTING_LIVE_REFETCH_MS/g) ?? []).length,
    2,
  );
  assert.equal((hook.match(/refetchOnWindowFocus: true/g) ?? []).length, 2);
});

// ==========================================================================
// 8. Reduced-motion accessibility + animation quality
// ==========================================================================
test("the pulsing dot animation is disabled under prefers-reduced-motion", () => {
  const idx = styles.indexOf("@media (prefers-reduced-motion: reduce)");
  assert.ok(idx > -1, "styles.css must gate animations on reduced motion");
  const reduced = styles.slice(idx);
  assert.match(reduced, /\.live-badge,/);
  assert.match(reduced, /\.live-badge \*/);
  assert.match(reduced, /animation: none !important/);
  // The badge is only paused, never hidden: text stays readable.
  assert.ok(!/\.live-badge \{[^}]*display: none/.test(reduced));
  assert.match(badge, /live-badge/);
});

test("the LIVE pill blinks smoothly: pulsing dot, stable text", () => {
  // Keyframes: opacity + scale, never a hard 0/1 flash.
  const frames = styles.match(/@keyframes live-dot \{([\s\S]*?)\n\}/);
  assert.ok(frames, "live-dot keyframes must exist");
  assert.match(frames[1], /opacity: 1/);
  assert.match(frames[1], /opacity: 0\.3/);
  assert.match(frames[1], /transform: scale\(1\)/);
  assert.match(frames[1], /transform: scale\(0\.7\)/);
  assert.ok(
    !/opacity: 0;/.test(frames[1]),
    "the dot must not fully disappear (harsh flashing)",
  );

  const utility = styles.match(/@utility animate-live-dot \{([\s\S]*?)\n\}/);
  assert.ok(utility, "animate-live-dot utility must exist");
  assert.match(utility[1], /live-dot 1\.2s ease-in-out infinite/);

  // Dot animates; the "LIVE" word itself does not.
  const dot = badge.match(/<span\s+aria-hidden="true"\s+className="([^"]+)"/);
  assert.ok(dot, "the indicator dot must be aria-hidden and classed");
  assert.match(dot[1], /animate-live-dot/);
  const pill = badge.match(/"([^"]*live-badge[^"]*)"/);
  assert.ok(pill, "the pill must carry the live-badge class");
  assert.ok(
    !/animate-/.test(pill[1]),
    "the pill/text must not animate, only the dot",
  );
  // Red pill + indicator + text, in that order.
  assert.match(badge, /bg-red-500\/15/);
  assert.match(badge, /\/>\s+Live\s+<\/span>/);
});
