-- 20261115120000_special_awards_master_control.sql
--
-- Centralised master control: set voting_open / results_visible for ALL four
-- Special Awards of the current edition in ONE atomic operation.
--
-- WHY
--   The admin panel previously had to toggle each award separately through
--   admin_set_special_award_status (one row per call). A missed close left an
--   award open. A single UPDATE statement over the four rows is atomic: any
--   pre-validation failure RAISEs before the write, so the whole transaction
--   rolls back and no award can end up half-updated. Client-side loops of the
--   per-award RPC are NOT used (not atomic).
--
-- WHAT THIS ADDS
--   One new function: admin_set_all_special_award_status(boolean, boolean)
--     * SECURITY DEFINER + private.has_role('admin') guard — identical
--       authorization contract as every sibling admin RPC.
--     * Scope: the four rows of the NEWEST voting_period that has
--       special_awards rows (self-contained; the client cannot pass ids).
--       Older editions are never touched.
--     * Explicit key allow-list: a single _keys CONSTANT holds
--       kopa/yashin/gerd_muller/socrates and is used by the completeness
--       check, the nominee-threshold validation AND the UPDATE itself. The
--       statement never falls back to "every row in the period": an unrelated
--       award row that ever exists in the same voting period is neither
--       counted, nor allowed to block open-all, nor modified. (The table's
--       award_key CHECK currently forbids such a row; this function does not
--       rely on that — defence in depth if the constraint is ever relaxed.)
--     * Completeness check: kopa/yashin/gerd_muller/socrates must all exist
--       in scope, otherwise RAISE (surfaces a broken edition instead of
--       silently updating a subset).
--     * Opening validation: same thresholds as admin_set_special_award_status
--       (yashin -> 3 nominees, others -> 5). ALL awards that would be opened
--       are validated BEFORE any write; one failure aborts everything.
--     * COALESCE NULL semantics (unchanged contract): a NULL argument leaves
--       that column untouched, so "Open Voting for All" never clobbers mixed
--       per-award results_visible states, and "Publish All Results" never
--       clobbers voting states.
--     * Returns the number of rows updated (4 on success).
--
-- WHAT THIS DOES NOT CHANGE
--   * No table, column, trigger, policy or existing function body is touched.
--     admin_set_special_award_status (individual controls) keeps working as-is.
--   * Voting/ballot logic, eligibility, approval gate, results RPCs, scoring
--     and ranking generation are untouched.
--   * Grants: same REVOKE/GRANT pattern as the sibling admin RPCs (EXECUTE to
--     authenticated; the has_role check inside the body is the admin gate).
--
-- PRODUCTION NOTE
--   This file is shipped for review/apply by the normal migration workflow.
--   It was NOT executed against production while being authored.

CREATE OR REPLACE FUNCTION public.admin_set_all_special_award_status(
  _voting_open boolean DEFAULT NULL,
  _results_visible boolean DEFAULT NULL
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  -- The only four awards this master control is allowed to see. Every read
  -- (completeness, threshold validation) and the single write below filter on
  -- this same list, so they can never drift apart.
  _keys CONSTANT text[] := ARRAY['kopa', 'yashin', 'gerd_muller', 'socrates'];
  _period uuid;
  _missing text;
  _award record;
  _min int;
  _blocked text[] := '{}';
  _updated int;
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'not authorized: admin only';
  END IF;

  -- Newest edition that actually has special-award rows (uuid tiebreak keeps
  -- the choice deterministic if two periods somehow shared a year).
  SELECT a.voting_period_id INTO _period
  FROM public.special_awards a
  JOIN public.voting_periods p ON p.id = a.voting_period_id
  ORDER BY p.year DESC, p.id
  LIMIT 1;

  IF _period IS NULL THEN
    RAISE EXCEPTION 'no special awards found';
  END IF;

  -- All four expected awards must exist in the target edition.
  SELECT string_agg(k, ', ' ORDER BY k) INTO _missing
  FROM unnest(_keys) AS k
  WHERE NOT EXISTS (
    SELECT 1 FROM public.special_awards sa
    WHERE sa.voting_period_id = _period AND sa.award_key = k
  );
  IF _missing IS NOT NULL THEN
    RAISE EXCEPTION 'special awards incomplete for the current edition: missing %', _missing;
  END IF;

  -- Pre-validate every award that would be opened BEFORE any write. A single
  -- RAISE rolls back the whole transaction, so partial updates are impossible.
  -- Scoped to _keys: an unrelated row in the same period has no say here.
  IF _voting_open IS TRUE THEN
    FOR _award IN
      SELECT sa.award_key, sa.title, count(c.id)::int AS nominees
      FROM public.special_awards sa
      LEFT JOIN public.special_award_candidates c ON c.award_id = sa.id
      WHERE sa.voting_period_id = _period
        AND sa.award_key = ANY(_keys)
      GROUP BY sa.id, sa.award_key, sa.title
    LOOP
      _min := CASE WHEN _award.award_key = 'yashin' THEN 3 ELSE 5 END;
      IF _award.nominees < _min THEN
        _blocked := _blocked || format('%s (%s/%s nominees)', _award.title, _award.nominees, _min);
      END IF;
    END LOOP;
    IF cardinality(_blocked) > 0 THEN
      RAISE EXCEPTION 'cannot open voting for all four awards: %', array_to_string(_blocked, '; ');
    END IF;
  END IF;

  -- Single atomic statement, restricted to the same four award keys. NULL
  -- arguments keep each column's current value.
  UPDATE public.special_awards
    SET voting_open     = COALESCE(_voting_open, voting_open),
        results_visible = COALESCE(_results_visible, results_visible)
  WHERE voting_period_id = _period
    AND award_key = ANY(_keys);

  GET DIAGNOSTICS _updated = ROW_COUNT;
  RETURN _updated;
END $$;

REVOKE ALL ON FUNCTION public.admin_set_all_special_award_status(boolean, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_all_special_award_status(boolean, boolean) TO authenticated;
