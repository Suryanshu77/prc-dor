/**
 * Pure derivation of the "LIVE" nav indicator from voting status rows.
 * Kept free of React/Supabase imports so it can be unit-tested directly.
 */

export interface VotingLiveStatus {
  ballonDorLive: boolean;
  specialAwardsLive: boolean;
}

export interface VotingLiveInput {
  /** Active voting_periods row (null/undefined while loading or after an error). */
  activePeriod: { is_active?: boolean | null } | null | undefined;
  /** special_awards rows (null/undefined while loading or after an error). */
  specialAwards:
    ReadonlyArray<{ voting_open?: boolean | null }> | null | undefined;
}

/**
 * Fail-safe: unknown or missing query data never reports LIVE.
 * Ballon d'Or is live only while an active period has is_active = true.
 * Special Awards is live while any award has voting_open = true.
 */
export function deriveVotingLiveStatus(
  input: VotingLiveInput,
): VotingLiveStatus {
  const { activePeriod, specialAwards } = input;
  return {
    ballonDorLive: activePeriod?.is_active === true,
    specialAwardsLive: Array.isArray(specialAwards)
      ? specialAwards.some((award) => award?.voting_open === true)
      : false,
  };
}

/** Poll interval for keeping the nav badges in sync with admin toggles. */
export const VOTING_LIVE_REFETCH_MS = 15_000;
