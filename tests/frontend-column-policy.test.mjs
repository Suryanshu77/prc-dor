// Phase 1 (F1/F2/F4) regression guards, source-level:
// - profile queries must never request profiles.email via select("*")
// - vote reads must not select whole ballot rows
// - declare winner must read the winner object, not the RPC result array
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function srcFiles(dir = path.join(root, "src")) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...srcFiles(full));
    else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith(".d.ts"))
      out.push(full);
  }
  return out;
}

function occurrences(re, text) {
  return (text.match(new RegExp(re.source, "g")) ?? []).length;
}

test("PROFILE_COLUMNS excludes email and covers the profile form fields", () => {
  const src = readFileSync(path.join(root, "src/lib/use-profile.ts"), "utf8");
  const match = src.match(/export const PROFILE_COLUMNS\s*=\s*"([^"]+)"/);
  assert.ok(match, "PROFILE_COLUMNS export not found in use-profile.ts");
  const cols = match[1].split(",").map((c) => c.trim());
  assert.ok(!cols.includes("email"), "PROFILE_COLUMNS must not include email");
  for (const field of [
    "id",
    "full_name",
    "nickname",
    "age",
    "position",
    "jersey_number",
    "profile_image",
    "bio",
    "social_handle",
    "created_at",
    "updated_at",
  ]) {
    assert.ok(cols.includes(field), `PROFILE_COLUMNS missing ${field}`);
  }
});

test("no query selects all columns from profiles", () => {
  const re = /\.from\("profiles"\)\s*\.select\("\*"\)/;
  for (const file of srcFiles()) {
    const hits = occurrences(re, readFileSync(file, "utf8"));
    assert.equal(
      hits,
      0,
      `${path.relative(root, file)} still uses profiles select("*")`,
    );
  }
});

test("no query selects all columns from votes", () => {
  const re = /\.from\("votes"\)\s*\.select\("\*"\)/;
  for (const file of srcFiles()) {
    const hits = occurrences(re, readFileSync(file, "utf8"));
    assert.equal(
      hits,
      0,
      `${path.relative(root, file)} still uses votes select("*")`,
    );
  }
});

test("declareWinner reads the winner row, not the RPC result array", () => {
  const src = readFileSync(
    path.join(root, "src/routes/_authenticated/admin.tsx"),
    "utf8",
  );
  assert.ok(
    /winner_id:\s*winner\.id/.test(src),
    "declareWinner must set winner_id from the winner row",
  );
  assert.ok(
    !/winner_id:\s*data\.id/.test(src),
    "declareWinner must not read winner_id off the RPC result array",
  );
  assert.ok(
    !/toast\.success\(`\$\{data\.full_name\}/.test(src),
    "declareWinner must not toast success from the RPC result array",
  );
});
