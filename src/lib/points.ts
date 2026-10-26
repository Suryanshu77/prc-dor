export const POINTS_BY_RANK: Record<number, number> = {
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
};

export const RANK_LABELS = [
  "1st",
  "2nd",
  "3rd",
  "4th",
  "5th",
  "6th",
  "7th",
  "8th",
  "9th",
  "10th",
];

// Special awards (Kopa / Yashin / Gerd Müller / Socrates) rank the top FIVE
// nominees; scoring is 5, 4, 3, 2, 1. Must equal the server-side invariant
// `points = 6 - rank_position` (see special awards migration) so the UI can
// never display points the database would reject.
export const SPECIAL_POINTS_BY_RANK: Record<number, number> = {
  1: 5,
  2: 4,
  3: 3,
  4: 2,
  5: 1,
};

export const SPECIAL_RANK_LABELS = ["1st", "2nd", "3rd", "4th", "5th"];
