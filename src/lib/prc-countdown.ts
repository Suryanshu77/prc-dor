/**
 * Recurring PRC D'OR milestone countdown.
 *
 * Asia/Kolkata (IST) is a fixed UTC+05:30 offset with no daylight saving, so a
 * given IST wall-clock date always maps to exactly one UTC instant. Everything
 * here works purely from UTC math and therefore never depends on the browser's
 * local timezone.
 *
 * Cycle (repeating every year):
 *   [1 May of year N, 27 April of year N+1)  -> countdown to Voting Opens
 *   [27 April of year N, 1 May of year N)    -> countdown to Results
 *   otherwise                                -> countdown to this year's Voting Opens
 */

export const COUNTDOWN_TIMEZONE = "Asia/Kolkata";
export const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

export type MilestoneKey = "voting-opens" | "results-announcement";

export interface Milestone {
  key: MilestoneKey;
  name: string;
  /** UTC instant the milestone fires. */
  at: Date;
  /** IST calendar year this occurrence belongs to. */
  year: number;
  /** e.g. "27 April 2027, 00:00:00 IST" */
  exact: string;
}

export interface TimeLeft {
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

/** An IST calendar date at 00:00:00 IST, expressed as a UTC instant. */
export function istMidnightUtc(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day) - IST_OFFSET_MS);
}

/** The IST calendar date (year/month/day) of an arbitrary instant. */
export function istDateOf(instant: Date): {
  year: number;
  month: number;
  day: number;
} {
  const shifted = new Date(instant.getTime() + IST_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

/** "27 April 2027" for a milestone instant. */
export function formatIstDate(instant: Date): string {
  const shifted = new Date(instant.getTime() + IST_OFFSET_MS);
  return `${shifted.getUTCDate()} ${MONTHS[shifted.getUTCMonth()]} ${shifted.getUTCFullYear()}`;
}

/** "27 April 2027, 00:00:00 IST" for a milestone instant. */
export function formatIstDateTime(instant: Date): string {
  const shifted = new Date(instant.getTime() + IST_OFFSET_MS);
  const time = `${pad2(shifted.getUTCHours())}:${pad2(shifted.getUTCMinutes())}:${pad2(shifted.getUTCSeconds())}`;
  return `${formatIstDate(instant)}, ${time} IST`;
}

function buildMilestone(key: MilestoneKey, year: number): Milestone {
  const isVoting = key === "voting-opens";
  const month = isVoting ? 4 : 5;
  const day = isVoting ? 27 : 1;
  const name = isVoting ? "Voting Opens" : "Results Announcement";
  const at = istMidnightUtc(year, month, day);
  return { key, name, at, year, exact: formatIstDateTime(at) };
}

/**
 * Which milestone the countdown is currently aiming at.
 *
 * - before 27 April      -> this year's Voting Opens
 * - 27 April .. 1 May    -> this year's Results Announcement
 * - from 1 May           -> next year's Voting Opens
 */
export function resolveMilestone(now: Date): Milestone {
  const { year } = istDateOf(now);
  const timestamp = now.getTime();

  if (timestamp < istMidnightUtc(year, 4, 27).getTime()) {
    return buildMilestone("voting-opens", year);
  }
  if (timestamp < istMidnightUtc(year, 5, 1).getTime()) {
    return buildMilestone("results-announcement", year);
  }
  return buildMilestone("voting-opens", year + 1);
}

/** Both milestones of the yearly cycle the given milestone belongs to. */
export function cycleOf(milestone: Milestone): [Milestone, Milestone] {
  return [
    buildMilestone("voting-opens", milestone.year),
    buildMilestone("results-announcement", milestone.year),
  ];
}

export function timeLeft(now: Date, target: Date): TimeLeft {
  const totalMs = Math.max(0, target.getTime() - now.getTime());
  const totalSeconds = Math.floor(totalMs / 1000);
  return {
    totalMs,
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

/** "168d : 12h : 45m" */
export function formatCompact(time: TimeLeft): string {
  return `${time.days}d : ${pad2(time.hours)}h : ${pad2(time.minutes)}m`;
}
