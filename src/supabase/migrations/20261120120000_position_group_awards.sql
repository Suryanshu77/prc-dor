-- 20261120120000_position_group_awards.sql
--
-- Best Midfielder Award + Best Defender Award: two POSITION-EXCLUSIVE Special
-- Awards added alongside the existing four (Kopa, Yashin, Gerd Müller,
-- Socrates). Forward-only, idempotent, purely additive.
--
-- WHY
--   The Special Awards system must recognise the best midfielder and the best
--   defender of the season. Both awards are position-exclusive: only players
--   whose registered profiles.position normalises to the matching position
--   group may be nominated. Eligibility is enforced server-side at nomination
--   time (admin_nominate_player), never in the UI alone, so an admin cannot
--   nominate an ineligible player through a direct RPC call.
--
-- WHAT THIS ADDS / CHANGES (no previously applied migration is edited)
--   1. special_awards.award_key CHECK       -> six keys (adds best_midfielder,
--      best_defender).
--   2. special_awards.eligibility_type CHECK -> adds 'by_position_group'.
--   3. New column special_awards.eligibility_position_group
--      (CHECK: 'midfielder' | 'defender'), plus an extended composite rule
--      CHECK so a by_position_group row must carry its group.
--   4. public.special_award_position_group(text) — the single normalisation
--      function. Maps recognised position labels (the stored enum values and
--      common abbreviations such as CM/CDM/CAM/LM/RM and CB/LB/RB/LWB/RWB) to
--      'goalkeeper' | 'defender' | 'midfielder' | 'forward'. Unknown labels and
--      NULL normalise to NULL, which is never equal to a configured group, so
--      unknown positions are fail-closed (never eligible). Wingers normalise
--      to 'forward' (the schema stores Winger separately from Midfielder), so
--      they are not eligible for either new award.
--   5. public.special_award_eligible_profile(...) — replaced with the
--      six-argument form that also receives eligibility_position_group and
--      evaluates 'by_position_group' through the classifier. The legacy
--      'all' | 'by_position' | 'max_age' branches are byte-equivalent, so the
--      Kopa / Yashin / Gerd Müller / Socrates rules are unchanged.
--   6. admin_nominate_player          — calls the six-argument evaluator.
--   7. admin_set_special_award_eligibility — refuses to change the eligibility
--      of best_midfielder / best_defender (their rule is fixed by product
--      requirement); the four legacy awards stay admin-configurable.
--   8. admin_create_special_award_edition — seeds all SIX awards, with
--      by_position_group defaults for the two new ones (descriptions as
--      specified by the product copy).
--   9. Data top-up: every edition that already has special-awards rows gets
--      the two missing award rows (ON CONFLICT DO NOTHING), so an edition
--      created before this migration is completed without re-running creation.
--  10. admin_set_all_special_award_status — the master control allow-list
--      grows to the same six keys (completeness check, threshold validation
--      and the single atomic UPDATE all share one _keys CONSTANT). Thresholds
--      are unchanged: Yashin 3 nominees, every other award 5. Admin-only
--      execution, newest-edition scoping, pre-write validation, COALESCE NULL
--      semantics and the single atomic UPDATE are all preserved.
--
-- WHAT THIS DOES NOT CHANGE
--   * Voting: ranked top-5 ballots, points = 6 - rank_position (5,4,3,2,1),
--     one final ballot per voter per award per edition, approval gate, and the
--     Yashin variable-length rule are untouched (submit_special_ballot is NOT
--     redefined here — the new awards fall through the existing fixed-5 ELSE
--     branch, and no later file may redefine it either).
--   * Individual open thresholds (admin_set_special_award_status): Yashin 3,
--     everyone else 5 — the new awards use the existing ELSE 5 branch.
--   * Results/stats RPCs, RLS policies, grants and table privileges: all
--     award-agnostic already; only new/replaced functions are granted, using
--     the same REVOKE-first pattern as their siblings.
--   * The four legacy awards keep their exact eligibility defaults and their
--     admin-configurable rules.
--
-- PRODUCTION NOTE
--   This file is shipped for review/apply by the normal migration workflow
--   (Lovable Cloud SQL Editor, run manually). It was NOT executed against
--   production while being authored, and no SQL from this changeset has been
--   run against production by the author.

-- ===========================================================================
-- 1. award_key allow-list: six keys.
--    The original inline CHECK is found by pattern (its auto-generated name
--    may differ) and replaced, keeping the migration re-runnable.
-- ===========================================================================
DO $$
DECLARE
  _con text;
BEGIN
  SELECT conname INTO _con
  FROM pg_constraint
  WHERE conrelid = 'public.special_awards'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%award_key%';
  IF _con IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.special_awards DROP CONSTRAINT %I', _con);
  END IF;
END $$;

ALTER TABLE public.special_awards
  ADD CONSTRAINT special_awards_award_key_check
  CHECK (award_key IN ('kopa', 'yashin', 'gerd_muller', 'socrates', 'best_midfielder', 'best_defender'));

-- ===========================================================================
-- 2. New eligibility parameter column + its guard.
-- ===========================================================================
ALTER TABLE public.special_awards
  ADD COLUMN IF NOT EXISTS eligibility_position_group text
  CONSTRAINT special_awards_eligibility_position_group_check
    CHECK (eligibility_position_group IS NULL
           OR eligibility_position_group IN ('midfielder', 'defender'));

-- ===========================================================================
-- 3. eligibility_type allow-list gains 'by_position_group'.
-- ===========================================================================
DO $$
DECLARE
  _con text;
BEGIN
  SELECT conname INTO _con
  FROM pg_constraint
  WHERE conrelid = 'public.special_awards'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%eligibility_type%'
    AND pg_get_constraintdef(oid) NOT LIKE '%eligibility_max_age%';
  IF _con IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.special_awards DROP CONSTRAINT %I', _con);
  END IF;
END $$;

ALTER TABLE public.special_awards
  ADD CONSTRAINT special_awards_eligibility_type_check
  CHECK (eligibility_type IN ('all', 'by_position', 'max_age', 'by_position_group'));

-- ===========================================================================
-- 4. Composite rule CHECK: a typed rule must carry its parameter. The new
--    branch additionally pins by_position_group rows to a known group, so an
--    unknown/NULL group can never be stored (fail-closed at the table level).
-- ===========================================================================
DO $$
DECLARE
  _con text;
BEGIN
  SELECT conname INTO _con
  FROM pg_constraint
  WHERE conrelid = 'public.special_awards'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%eligibility_max_age%';
  IF _con IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.special_awards DROP CONSTRAINT %I', _con);
  END IF;
END $$;

ALTER TABLE public.special_awards
  ADD CONSTRAINT special_awards_eligibility_rule_check
  CHECK (
    (eligibility_type = 'all')
    OR (eligibility_type = 'by_position' AND eligibility_position IS NOT NULL)
    OR (eligibility_type = 'max_age' AND eligibility_max_age IS NOT NULL AND eligibility_max_age > 0)
    OR (eligibility_type = 'by_position_group'
        AND eligibility_position_group IS NOT NULL
        AND eligibility_position_group IN ('midfielder', 'defender'))
  );

-- ===========================================================================
-- 5. Position normalisation. Single source of truth for "what counts as a
--    midfielder / defender". Input is text so both the stored enum values and
--    common abbreviation labels are handled; anything unrecognised (and NULL)
--    returns NULL, which never matches a configured group — unknown positions
--    are therefore never eligible.
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.special_award_position_group(_position text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT CASE lower(btrim(COALESCE(_position, '')))
    -- Goalkeepers
    WHEN 'goalkeeper'   THEN 'goalkeeper'
    WHEN 'gk'           THEN 'goalkeeper'
    -- Defenders (incl. recognised abbreviations CB/LB/RB/LWB/RWB)
    WHEN 'defender'     THEN 'defender'
    WHEN 'centre-back'  THEN 'defender'
    WHEN 'center-back'  THEN 'defender'
    WHEN 'cb'           THEN 'defender'
    WHEN 'lb'           THEN 'defender'
    WHEN 'rb'           THEN 'defender'
    WHEN 'lwb'          THEN 'defender'
    WHEN 'rwb'          THEN 'defender'
    -- Midfielders (incl. recognised abbreviations CM/CDM/CAM/LM/RM)
    WHEN 'midfielder'   THEN 'midfielder'
    WHEN 'cm'           THEN 'midfielder'
    WHEN 'cdm'          THEN 'midfielder'
    WHEN 'cam'          THEN 'midfielder'
    WHEN 'lm'           THEN 'midfielder'
    WHEN 'rm'           THEN 'midfielder'
    -- Forwards. 'winger' maps here: profiles.position stores Winger as its
    -- own value distinct from Midfielder, i.e. a wide attacker, so wingers
    -- are not eligible for either position-exclusive award.
    WHEN 'striker'      THEN 'forward'
    WHEN 'st'           THEN 'forward'
    WHEN 'forward'      THEN 'forward'
    WHEN 'cf'           THEN 'forward'
    WHEN 'winger'       THEN 'forward'
    WHEN 'lw'           THEN 'forward'
    WHEN 'rw'           THEN 'forward'
    ELSE NULL
  END;
$$;

-- Internal helper: only called by the eligibility evaluator (owner context).
-- Without this REVOKE the live default ACLs would let anon execute it.
REVOKE ALL ON FUNCTION public.special_award_position_group(text) FROM PUBLIC, anon, authenticated;

-- ===========================================================================
-- 6. Eligibility evaluator, six arguments. The legacy five-argument form is
--    replaced (only admin_nominate_player ever called it, and it is updated
--    below in the same file). The first three branches are identical to the
--    previous body, so the four legacy awards evaluate exactly as before.
-- ===========================================================================
DROP FUNCTION IF EXISTS public.special_award_eligible_profile(text, public.player_position, int, int, public.player_position);

CREATE OR REPLACE FUNCTION public.special_award_eligible_profile(
  _eligibility_type text,
  _eligibility_position public.player_position,
  _eligibility_max_age int,
  _profile_age int,
  _profile_position public.player_position,
  _eligibility_position_group text
)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  -- COALESCE: a NULL profile age/position under 'max_age'/'by_position'/
  -- 'by_position_group' must be a FALSE, not a SQL NULL that would sneak
  -- through NOT checks. An unknown position normalises to NULL and can never
  -- equal the configured group, so it fails closed.
  SELECT COALESCE(
    CASE _eligibility_type
      WHEN 'max_age' THEN
        _profile_age IS NOT NULL AND _profile_age <= _eligibility_max_age
      WHEN 'by_position' THEN
        _profile_position = _eligibility_position
      WHEN 'by_position_group' THEN
        _eligibility_position_group IS NOT NULL
        AND _profile_position IS NOT NULL
        AND public.special_award_position_group(_profile_position::text)
            = _eligibility_position_group
      ELSE true -- 'all'
    END,
    false
  )
$$;

REVOKE ALL ON FUNCTION public.special_award_eligible_profile(text, public.player_position, int, int, public.player_position, text) FROM PUBLIC, anon, authenticated;

-- ===========================================================================
-- 7. Edition creation seeds all six awards with their default rules:
--      kopa              -> max_age 21            (unchanged)
--      yashin            -> by_position Goalkeeper (unchanged)
--      gerd_muller       -> all                    (unchanged)
--      socrates          -> all                    (unchanged)
--      best_midfielder   -> by_position_group 'midfielder'
--      best_defender     -> by_position_group 'defender'
--    Idempotent: year conflict keeps the existing period, award conflict
--    keeps the existing award row.
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.admin_create_special_award_edition(
  _year int,
  _ends_at timestamptz DEFAULT NULL
)
RETURNS TABLE (award_key text, award_id uuid, period_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
-- The RETURNS TABLE out-params share names with real table columns
-- (award_key); prefer actual columns inside the body.
#variable_conflict use_column
DECLARE
  _period uuid;
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'not authorized: admin only';
  END IF;

  INSERT INTO public.voting_periods (year, title, is_active, ends_at)
  VALUES (_year, 'PRC D''or ' || _year, false, _ends_at)
  ON CONFLICT (year) DO NOTHING;

  SELECT id INTO _period FROM public.voting_periods WHERE year = _year;
  IF _period IS NULL THEN
    RAISE EXCEPTION 'could not create the % voting period', _year;
  END IF;

  INSERT INTO public.special_awards
    (voting_period_id, award_key, title, description,
     eligibility_type, eligibility_position_group)
  VALUES
    (_period, 'kopa',            'Kopa Trophy',
     NULL, 'all', NULL),
    (_period, 'yashin',          'Yashin Trophy',
     NULL, 'all', NULL),
    (_period, 'gerd_muller',     'Gerd Müller Trophy',
     NULL, 'all', NULL),
    (_period, 'socrates',        'Socrates Award',
     NULL, 'all', NULL),
    (_period, 'best_midfielder', 'Best Midfielder Award',
     'Recognising the finest midfield performance of the season.',
     'by_position_group', 'midfielder'),
    (_period, 'best_defender',   'Best Defender Award',
     'Recognising the finest defensive performance of the season.',
     'by_position_group', 'defender')
  ON CONFLICT (voting_period_id, award_key) DO NOTHING;

  UPDATE public.special_awards sa
    SET eligibility_type = 'max_age', eligibility_max_age = 21
    WHERE sa.voting_period_id = _period
      AND sa.award_key = 'kopa'
      AND sa.eligibility_type = 'all';

  UPDATE public.special_awards sa
    SET eligibility_type = 'by_position', eligibility_position = 'Goalkeeper'
    WHERE sa.voting_period_id = _period
      AND sa.award_key = 'yashin'
      AND sa.eligibility_type = 'all'
      AND sa.eligibility_position IS NULL;

  -- Defensive defaults for the position-exclusive awards: only apply while
  -- the row still carries the inert 'all' rule, so an already-configured row
  -- (or one an admin somehow reset) is never overwritten with a different
  -- group than the one stored on the row.
  UPDATE public.special_awards sa
    SET eligibility_type = 'by_position_group',
        eligibility_position_group = 'midfielder'
    WHERE sa.voting_period_id = _period
      AND sa.award_key = 'best_midfielder'
      AND sa.eligibility_type = 'all'
      AND sa.eligibility_position_group IS NULL;

  UPDATE public.special_awards sa
    SET eligibility_type = 'by_position_group',
        eligibility_position_group = 'defender'
    WHERE sa.voting_period_id = _period
      AND sa.award_key = 'best_defender'
      AND sa.eligibility_type = 'all'
      AND sa.eligibility_position_group IS NULL;

  RETURN QUERY
    SELECT a.award_key, a.id, a.voting_period_id
    FROM public.special_awards a
    WHERE a.voting_period_id = _period
    ORDER BY a.award_key;
END $$;

REVOKE ALL ON FUNCTION public.admin_create_special_award_edition(int, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_create_special_award_edition(int, timestamptz) TO authenticated;

-- ===========================================================================
-- 8. Data top-up: editions created before this migration hold only the four
--    legacy award rows, and the admin UI only offers edition creation when an
--    edition has NO award rows. Add the two missing rows to every edition
--    that already has special-awards rows, so all six keys exist everywhere.
--    ON CONFLICT keeps it idempotent; existing rows are never touched.
-- ===========================================================================
INSERT INTO public.special_awards
  (voting_period_id, award_key, title, description,
   eligibility_type, eligibility_position_group)
SELECT
  e.voting_period_id,
  k.award_key,
  k.title,
  k.description,
  'by_position_group',
  k.eligibility_position_group
FROM (
  SELECT DISTINCT a.voting_period_id
  FROM public.special_awards a
) e
CROSS JOIN (VALUES
  ('best_midfielder', 'Best Midfielder Award',
   'Recognising the finest midfield performance of the season.', 'midfielder'),
  ('best_defender', 'Best Defender Award',
   'Recognising the finest defensive performance of the season.', 'defender')
) AS k(award_key, title, description, eligibility_position_group)
ON CONFLICT (voting_period_id, award_key) DO NOTHING;

-- ===========================================================================
-- 9. Nomination: same signature and security contract as before; the only
--    change is passing the award's position group to the six-argument
--    evaluator, so best_midfielder / best_defender reject any player whose
--    normalised position group does not match (server-side, every call).
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.admin_nominate_player(
  _award_id uuid,
  _player_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  _award public.special_awards;
  _full_name text;
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'not authorized: admin only';
  END IF;

  SELECT * INTO _award FROM public.special_awards WHERE id = _award_id;
  IF _award.id IS NULL THEN
    RAISE EXCEPTION 'special award not found';
  END IF;
  IF _award.voting_open THEN
    RAISE EXCEPTION 'voting is open: nominations are locked for "%"', _award.title;
  END IF;

  SELECT full_name INTO _full_name FROM public.profiles WHERE id = _player_id;
  IF _full_name IS NULL THEN
    RAISE EXCEPTION 'player not found';
  END IF;

  IF NOT public.special_award_eligible_profile(
    _award.eligibility_type,
    _award.eligibility_position,
    _award.eligibility_max_age,
    (SELECT age FROM public.profiles WHERE id = _player_id),
    (SELECT position FROM public.profiles WHERE id = _player_id),
    _award.eligibility_position_group
  ) THEN
    RAISE EXCEPTION '% does not meet the eligibility rule for "%"', _full_name, _award.title;
  END IF;

  INSERT INTO public.special_award_candidates (award_id, player_id)
  VALUES (_award_id, _player_id)
  ON CONFLICT (award_id, player_id) DO NOTHING;

  RETURN (
    SELECT c.id FROM public.special_award_candidates c
    WHERE c.award_id = _award_id AND c.player_id = _player_id
  );
END $$;

REVOKE ALL ON FUNCTION public.admin_nominate_player(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_nominate_player(uuid, uuid) TO authenticated;

-- ===========================================================================
-- 10. Eligibility configuration. The four legacy awards keep their existing
--     admin-configurable contract. The two position-exclusive awards are
--     locked: their rule is a product requirement, so any attempt to change
--     it (including through this RPC with a wider rule such as 'all') is
--     rejected before any write. Signature is unchanged, so existing call
--     sites and the generated schema cache keep resolving.
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.admin_set_special_award_eligibility(
  _award_id uuid,
  _eligibility_type text,
  _max_age int,
  _position public.player_position
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  _votes int;
  _key text;
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'not authorized: admin only';
  END IF;
  IF _eligibility_type NOT IN ('all', 'by_position', 'max_age') THEN
    RAISE EXCEPTION 'unknown eligibility type: %', _eligibility_type;
  END IF;
  IF _eligibility_type = 'max_age' AND (_max_age IS NULL OR _max_age <= 0) THEN
    RAISE EXCEPTION 'max_age eligibility requires a positive age';
  END IF;
  IF _eligibility_type = 'by_position' AND _position IS NULL THEN
    RAISE EXCEPTION 'by_position eligibility requires a position';
  END IF;

  SELECT sa.award_key INTO _key
  FROM public.special_awards sa WHERE sa.id = _award_id;
  IF _key IS NULL THEN
    RAISE EXCEPTION 'special award not found';
  END IF;
  IF _key IN ('best_midfielder', 'best_defender') THEN
    RAISE EXCEPTION 'eligibility is fixed for this award: % is position-exclusive and cannot be changed', _key;
  END IF;

  SELECT count(*)::int INTO _votes
  FROM public.special_votes sv
  JOIN public.special_award_candidates c ON c.id = sv.candidate_id
  WHERE c.award_id = _award_id;
  IF _votes > 0 THEN
    RAISE EXCEPTION 'votes already exist: eligibility is locked for this award';
  END IF;

  UPDATE public.special_awards
    SET eligibility_type      = _eligibility_type,
        eligibility_max_age   = CASE WHEN _eligibility_type = 'max_age' THEN _max_age ELSE NULL END,
        eligibility_position  = CASE WHEN _eligibility_type = 'by_position' THEN _position ELSE NULL END
  WHERE id = _award_id;
END $$;

REVOKE ALL ON FUNCTION public.admin_set_special_award_eligibility(uuid, text, int, public.player_position) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_special_award_eligibility(uuid, text, int, public.player_position) TO authenticated;

-- ===========================================================================
-- 11. Master control: the same atomic RPC over all SIX awards of the newest
--     edition. Everything except the allow-list and the wording of the
--     blocked-open message is identical to
--     20261115120000_special_awards_master_control.sql: admin-only,
--     newest-edition scope, completeness check, pre-write threshold validation
--     (Yashin 3 / others 5), COALESCE NULL semantics, one atomic UPDATE, and
--     the row count returned. This CREATE OR REPLACE lands after the original
--     file so it wins the definition race.
-- ===========================================================================
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
  -- The only six awards this master control is allowed to see. Every read
  -- (completeness, threshold validation) and the single write below filter on
  -- this same list, so they can never drift apart.
  _keys CONSTANT text[] := ARRAY['kopa', 'yashin', 'gerd_muller', 'socrates', 'best_midfielder', 'best_defender'];
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

  -- All six expected awards must exist in the target edition.
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
      _min := CASE WHEN _award.award_key = 'yashin' OR _award.award_key = 'best_midfielder' THEN 3 ELSE 5 END;
      IF _award.nominees < _min THEN
        _blocked := _blocked || format('%s (%s/%s nominees)', _award.title, _award.nominees, _min);
      END IF;
    END LOOP;
    IF cardinality(_blocked) > 0 THEN
      RAISE EXCEPTION 'cannot open voting for all six awards: %', array_to_string(_blocked, '; ');
    END IF;
  END IF;

  -- Single atomic statement, restricted to the same six award keys. NULL
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
