// Display order for the Special Awards lineup (spec order):
// Kopa, Yashin, Gerd Müller, Socrates, Best Midfielder, Best Defender.
// Unknown keys sort after the known lineup.
export const SPECIAL_AWARD_KEY_ORDER = [
  "kopa",
  "yashin",
  "gerd_muller",
  "socrates",
  "best_midfielder",
  "best_defender",
] as const;

export function specialAwardKeyRank(key: string): number {
  const index = (SPECIAL_AWARD_KEY_ORDER as readonly string[]).indexOf(key);
  return index === -1 ? SPECIAL_AWARD_KEY_ORDER.length : index;
}

export function compareSpecialAwardKeys(a: string, b: string): number {
  return specialAwardKeyRank(a) - specialAwardKeyRank(b);
}

// Trophy artwork shipped in public/images/special-awards/ for the two
// position-exclusive awards (square PNGs). AwardIntro spreads this map into
// its full-size intro artwork; the compact award headers (admin cards,
// results cards and the vote-page award header) never use it — they show the
// gold Medal icon instead, and the four legacy headers keep their original
// gold Award icon.
export const POSITION_GROUP_TROPHY_IMAGES: Record<string, string> = {
  best_midfielder: "/images/special-awards/best_midfielder.png",
  best_defender: "/images/special-awards/best_defender.png",
};

// The two position-exclusive awards (mirrors the SQL lock on
// admin_set_special_award_eligibility). Compact headers render the gold
// Medal icon for exactly these keys and the original icon-only look for the
// four legacy awards.
const POSITION_GROUP_AWARD_KEYS = new Set<string>([
  "best_midfielder",
  "best_defender",
]);

export function isPositionGroupAward(awardKey: string): boolean {
  return POSITION_GROUP_AWARD_KEYS.has(awardKey);
}
