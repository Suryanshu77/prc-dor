export type PositionGroup =
  "goalkeeper" | "defender" | "midfielder" | "forward";

// Mirrors public.special_award_position_group (migration
// 20261120120000_position_group_awards.sql). The stored profiles.position
// values are the enum labels; the abbreviation rows keep parity with the SQL
// classifier so the nomination preview can never disagree with the server.
const GROUP_BY_LABEL: Record<string, PositionGroup> = {
  goalkeeper: "goalkeeper",
  gk: "goalkeeper",
  defender: "defender",
  "centre-back": "defender",
  "center-back": "defender",
  cb: "defender",
  lb: "defender",
  rb: "defender",
  lwb: "defender",
  rwb: "defender",
  midfielder: "midfielder",
  cm: "midfielder",
  cdm: "midfielder",
  cam: "midfielder",
  lm: "midfielder",
  rm: "midfielder",
  striker: "forward",
  st: "forward",
  forward: "forward",
  cf: "forward",
  winger: "forward",
  lw: "forward",
  rw: "forward",
};

export function positionGroup(
  position: string | null | undefined,
): PositionGroup | null {
  const key = (position ?? "").trim().toLowerCase();
  return GROUP_BY_LABEL[key] ?? null;
}

export function positionGroupPlural(group: string | null | undefined): string {
  switch (group) {
    case "goalkeeper":
      return "goalkeepers";
    case "defender":
      return "defenders";
    case "midfielder":
      return "midfielders";
    case "forward":
      return "forwards";
    default:
      return "players";
  }
}
