// About page + intro-popup removal regression guards, source-level:
// - the automatic problem/solution popup is gone everywhere
// - /about is a public route registered in the generated route tree
// - the About link exists in both public navigations (landing header + AppShell)
// - the About page reuses the original popup copy verbatim
// - the landing page stays clean: no About/Creator cards below the hero
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(path.join(root, rel), "utf8");
const exists = (rel) => existsSync(path.join(root, rel));

test("the automatic problem/solution popup is fully removed", () => {
  assert.equal(
    exists("src/components/PRCDorIntroPopup.tsx"),
    false,
    "the intro popup component must be deleted",
  );

  const rootSrc = read("src/routes/__root.tsx");
  assert.ok(
    !rootSrc.includes("PRCDorIntroPopup"),
    "__root.tsx must not import or mount the intro popup",
  );
  assert.ok(
    !rootSrc.includes("prc-dor-intro-popup"),
    "no intro-popup hooks may remain in the root route",
  );
  assert.ok(
    !read("src/styles.css").includes("prc-dor-intro-popup"),
    "the intro popup's reduced-motion styles must be removed",
  );

  // The unrelated winner celebration popup stays exactly as it was.
  assert.match(rootSrc, /<PRCDor2026WinnerPopup \/>/);
  assert.match(rootSrc, /onPasswordReset = pathname === "\/reset-password"/);
});

test("/about is a public route registered in the generated route tree", () => {
  const src = read("src/routes/about.tsx");
  assert.match(src, /createFileRoute\("\/about"\)/);
  assert.ok(
    !/beforeLoad/.test(src),
    "/about must not add an auth guard — it stays public",
  );
  assert.match(src, /<AppShell>/, "renders in the shared public app shell");
  assert.match(
    src,
    /title: "About — PRC D'or"/,
    "keeps the SEO title convention",
  );

  const tree = read("src/routeTree.gen.ts");
  assert.match(tree, /from '\.\/routes\/about'/, "route module is imported");
  assert.match(tree, /id: '\/about'/, "route id is registered");
});

test("the About link is present in both public navigations", () => {
  const shell = read("src/components/AppShell.tsx");
  assert.match(
    shell,
    /\{ to: "\/about", label: "About", icon: Info \}/,
    "desktop sidebar + mobile drawer NAV entry",
  );

  const header = read("src/components/landing/LandingHeader.tsx");
  assert.match(
    header,
    /<Link to="\/about" className="ld-about">/,
    "landing header About link",
  );
});

test("the About page reuses the original popup copy", () => {
  const src = read("src/routes/about.tsx").replace(/&apos;/g, "'");

  // Problem section — verbatim from the removed popup.
  assert.match(src, /In Purvanchal Royal City, football is a big part of our/);
  assert.match(src, /There wasn't a proper, transparent way for our football/);
  assert.match(
    src,
    /recognize outstanding\s+players,\s+and preserve the history of our awards\./,
  );

  // Solution section — verbatim from the removed popup.
  assert.match(
    src,
    /PRC D'OR is a community-driven football awards platform built\s+specifically for Purvanchal Royal City\./,
  );
  assert.match(
    src,
    /turning a community football award\s+into a transparent, digital experience\./,
  );
  assert.match(src, /Be part of the PRC D'OR community\./);

  // Section headings required by the brief.
  assert.match(src, />The Problem</);
  assert.match(src, />Our Solution</);
  assert.match(src, />Our Vision</);
});

test("landing page stays clean: no About or Creator cards below the hero", () => {
  const src = read("src/routes/index.tsx");
  assert.ok(
    !src.includes("LandingAboutIntro"),
    "the About intro card must not be rendered on the landing page",
  );
  assert.ok(
    !src.includes("LandingCreatorTeaser"),
    "the Creator teaser card must not be rendered on the landing page",
  );
  assert.equal(
    exists("src/components/landing/LandingAboutIntro.tsx"),
    false,
    "the About intro component must be deleted",
  );
  assert.equal(
    exists("src/components/landing/LandingCreatorTeaser.tsx"),
    false,
    "the Creator teaser component must be deleted",
  );

  // The hero and every other homepage element stay unchanged.
  assert.match(src, /<LandingAtmosphere \/>/);
  assert.match(src, /<LandingHeader \/>/);
  assert.match(src, /<LandingHeroCopy \/>/);
  assert.match(src, /<LandingHeroVisual \/>/);

  // The dedicated pages remain fully intact.
  assert.match(read("src/routes/about.tsx"), /createFileRoute\("\/about"\)/);
  assert.match(
    read("src/routes/the-creator.tsx"),
    /createFileRoute\("\/the-creator"\)/,
  );
});
