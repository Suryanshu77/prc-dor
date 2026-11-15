// Guards for the Favourite Player selector (Task B of the profile
// enhancements): Cristiano Ronaldo must open first, search behaviour must
// stay natural, his portrait must point at the verified Wikimedia asset, and
// nothing else about the player list, its images or its persistence may
// regress. Static assertions are hermetic; the one live fetch skips itself
// cleanly when the network is unavailable.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA = path.join(ROOT, "src/lib/football-data.ts");
const IMAGES = path.join(ROOT, "src/lib/football-images.ts");
const COMBOBOX = path.join(ROOT, "src/components/ui/combobox.tsx");
const PROFILE = path.join(ROOT, "src/routes/_authenticated/profile.tsx");
const USE_PROFILE = path.join(ROOT, "src/lib/use-profile.ts");

const data = readFileSync(DATA, "utf8");
const images = readFileSync(IMAGES, "utf8");
const combobox = readFileSync(COMBOBOX, "utf8");
const profile = readFileSync(PROFILE, "utf8");
const useProfile = readFileSync(USE_PROFILE, "utf8");

function list(name) {
  const m = data.match(
    new RegExp(`export const ${name}[^=]*= \\[([\\s\\S]*?)\\];`),
  );
  assert.ok(m, `${name} not found in football-data.ts`);
  return m[1]
    .split("\n")
    .map((s) => s.trim().replace(/,$/, "").replace(/^"|"$/g, ""))
    .filter(Boolean);
}

// Replicates the combobox's exact filtering (shouldFilter={false}, so the
// order it renders is options.filter(...) in list order — no re-sorting).
function filter(options, query) {
  const q = query.trim().toLowerCase();
  return q ? options.filter((o) => o.toLowerCase().includes(q)) : [...options];
}

const RONALDO_URL =
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/64/" +
  "Cristiano_Ronaldo_2018_%28cropped%29.jpg/" +
  "330px-Cristiano_Ronaldo_2018_%28cropped%29.jpg";

test("Cristiano Ronaldo opens first, Messi second, the rest unchanged", () => {
  const players = list("FOOTBALL_PLAYERS");
  assert.equal(players.length, 76, "no players may be removed");
  assert.equal(new Set(players).size, 76, "no duplicate entries");
  assert.deepEqual(players.slice(0, 9), [
    "Cristiano Ronaldo",
    "Lionel Messi",
    "Kylian Mbappe",
    "Erling Haaland",
    "Jude Bellingham",
    "Vinicius Junior",
    "Rodri",
    "Luka Modric",
    "Toni Kroos",
  ]);
  // Everything beyond the head swap stays in its existing order.
  assert.equal(players[9], "Kevin De Bruyne");
  assert.equal(players[75], "Mohamed Aboutrika");
});

test("the selector never re-sorts: empty query opens with Ronaldo", () => {
  // No alphabetical sort anywhere in the combobox path.
  assert.ok(
    !/\.sort\(/.test(combobox),
    "combobox must not sort the option list",
  );
  assert.match(combobox, /const filtered = q\s*\n?\s*\? options\.filter/);

  const players = list("FOOTBALL_PLAYERS");
  assert.equal(filter(players, "")[0], "Cristiano Ronaldo");
});

test("searching for Messi or Ronaldo still returns them correctly", () => {
  const players = list("FOOTBALL_PLAYERS");
  assert.deepEqual(filter(players, "messi"), ["Lionel Messi"]);
  const ronaldo = filter(players, "ronaldo");
  assert.equal(ronaldo[0], "Cristiano Ronaldo");
  assert.ok(ronaldo.includes("Ronaldo Nazario"));
  // Partial queries keep behaving naturally.
  assert.ok(filter(players, "modric").includes("Luka Modric"));
});

test("Cristiano Ronaldo has exactly one mapping, pointing at the new portrait", () => {
  const matches = images.match(/"Cristiano Ronaldo":/g) ?? [];
  assert.equal(matches.length, 1, "no duplicate Ronaldo mapping");
  const m = images.match(/"Cristiano Ronaldo":\s*\n?\s*"([^"]+)"/);
  assert.ok(m, "Ronaldo mapping missing from football-images.ts");
  assert.equal(m[1], RONALDO_URL);
});

test("other player images and the full 185-URL set stay intact", () => {
  // Every listed player still has an image.
  const section = images.match(
    /export const FOOTBALL_PLAYER_IMAGES[\s\S]*?\n};/,
  );
  assert.ok(section, "FOOTBALL_PLAYER_IMAGES missing");
  const playerUrls = section[0].match(/https:\/\//g) ?? [];
  assert.equal(playerUrls.length, 76, "every player keeps an image");

  // The whole curated set is unchanged in size.
  const allUrls = images.match(/https:\/\//g) ?? [];
  assert.equal(allUrls.length, 185);

  // Spot-check images this project fixed earlier (regression guard).
  assert.ok(
    images.includes("https://a.espncdn.com/i/teamlogos/soccer/500/83.png"),
    "FC Barcelona crest must stay",
  );
  assert.ok(
    images.includes(
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ef/Mohammed_Kudus_of_West_Ham_United.jpeg/330px-Mohammed_Kudus_of_West_Ham_United.jpeg",
    ),
    "Mohamed Kudus portrait must stay",
  );
  const messi = images.match(/"Lionel Messi":\s*\n?\s*"([^"]+)"/);
  assert.ok(messi, "Messi mapping missing");
  assert.match(messi[1], /^https:\/\/thumb\.wikimedia\.org\//);
});

test("the player selector is still the profile combobox and saves persist", () => {
  assert.match(profile, /options=\{FOOTBALL_PLAYERS\}/);
  assert.match(profile, /imageFor=\{\(v\) => footballImage\("player", v\)\}/);
  // Save path writes the trimmed favourite back to the row.
  assert.match(
    profile,
    /favourite_player: form\.favourite_player\?\.trim\(\) \|\| null/,
  );
  // The column stays readable through PROFILE_COLUMNS and writable.
  assert.match(useProfile, /favourite_player/);
  assert.match(profile, /<Combobox\b/);
});

test("live: Ronaldo's image URL loads as a real JPEG (skips when offline)", async (t) => {
  let res;
  try {
    res = await fetch(RONALDO_URL, {
      headers: { "User-Agent": "Mozilla/5.0 (PRC DOR tests)" },
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    t.skip("network unavailable — URL verified separately during review");
    return;
  }
  // A 404/403 HTML error page must fail loudly, not pass quietly.
  assert.ok(res.ok, `image URL returned HTTP ${res.status}`);
  const type = res.headers.get("content-type") ?? "";
  assert.match(type, /image\/(jpeg|png)/, `unexpected content-type: ${type}`);
  const buf = Buffer.from(await res.arrayBuffer());
  assert.ok(
    buf[0] === 0xff && buf[1] === 0xd8,
    "payload must start with the JPEG magic bytes, not HTML",
  );
  assert.ok(buf.length > 2000, "thumbnail must be a real image payload");
});
