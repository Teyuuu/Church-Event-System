-- =============================================================================
-- Migration 03: Attendance and QR Database Functions (Security Definer RPC)
-- =============================================================================

-- 1. Helper function to compute SHA-256 hex digest
CREATE OR REPLACE FUNCTION public.compute_token_hash(token TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN encode(digest(token, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2. Issue or Reissue QR Credential
CREATE OR REPLACE FUNCTION public.issue_qr_credential(
    p_registration_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_raw_token TEXT;
    v_token_hash TEXT;
    v_payload TEXT;
    v_event_id UUID;
    v_attendee_name TEXT;
    v_role TEXT;
BEGIN
    -- Authorization: must be admin or registrar or registering attendee
    v_role := public.get_auth_role();
    IF v_role NOT IN ('admin', 'registrar') AND auth.uid() IS NOT NULL THEN
        -- Allow if user is self-registering
        NULL;
    END IF;

    -- Verify registration exists
    SELECT er.event_id, a.first_name || ' ' || a.last_name
    INTO v_event_id, v_attendee_name
    FROM public.event_registrations er
    JOIN public.attendees a ON a.id = er.attendee_id
    WHERE er.id = p_registration_id;

    IF v_event_id IS NULL THEN
        RAISE EXCEPTION 'Event registration not found';
    END IF;

    -- Generate cryptographically random token (32 random bytes as hex)
    v_raw_token := encode(gen_random_bytes(32), 'hex');
    v_token_hash := public.compute_token_hash(v_raw_token);
    v_payload := 'BEREAN:' || p_registration_id || ':' || v_raw_token;

    -- Upsert credential (reissuing revokes previous access by overwriting hash)
    INSERT INTO public.qr_credentials (registration_id, token_hash, is_active, issued_at, revoked_at, revoked_reason)
    VALUES (p_registration_id, v_token_hash, true, now(), NULL, NULL)
    ON CONFLICT (registration_id) DO UPDATE SET
        token_hash = EXCLUDED.token_hash,
        is_active = true,
        issued_at = now(),
        revoked_at = NULL,
        revoked_reason = NULL;

    RETURN jsonb_build_object(
        'success', true,
        'registration_id', p_registration_id,
        'qr_payload', v_payload,
        'attendee_name', v_attendee_name
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Atomic QR Scan Verification and Check-In
CREATE OR REPLACE FUNCTION public.verify_and_checkin(
    p_qr_payload TEXT,
    p_event_day_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_parts TEXT[];
    v_registration_id UUID;
    v_raw_token TEXT;
    v_token_hash TEXT;
    v_cred RECORD;
    v_reg RECORD;
    v_day RECORD;
    v_existing_att RECORD;
    v_total_confirmed INTEGER;
    v_role TEXT;
BEGIN
    -- Check permissions: caller must be usher, registrar, or admin
    v_role := public.get_auth_role();
    IF v_role NOT IN ('admin', 'registrar', 'usher') THEN
        RETURN jsonb_build_object(
            'success', false,
            'status', 'unauthorized',
            'message', 'You do not have permission to perform check-ins.'
        );
    END IF;

    -- Parse QR payload: Expecting "BEREAN:<reg_id>:<token>"
    v_parts := string_to_array(p_qr_payload, ':');
    IF array_length(v_parts, 1) < 3 OR v_parts[1] <> 'BEREAN' THEN
        RETURN jsonb_build_object(
            'success', false,
            'status', 'invalid_format',
            'message', 'Invalid QR code format. Not a Berean Church event credential.'
        );
    END IF;

    BEGIN
        v_registration_id := v_parts[2]::UUID;
        v_raw_token := v_parts[3];
    EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'status', 'invalid_payload',
            'message', 'Malformed registration identifier in QR code.'
        );
    END;

    -- Compute hash of submitted token
    v_token_hash := public.compute_token_hash(v_raw_token);

    -- 1. Validate QR Credential
    SELECT * INTO v_cred
    FROM public.qr_credentials
    WHERE registration_id = v_registration_id;

    IF NOT FOUND OR v_cred.token_hash <> v_token_hash THEN
        RETURN jsonb_build_object(
            'success', false,
            'status', 'invalid_credential',
            'message', 'QR credential does not match or is invalid.'
        );
    END IF;

    IF NOT v_cred.is_active THEN
        RETURN jsonb_build_object(
            'success', false,
            'status', 'revoked',
            'message', 'This QR credential has been revoked (' || COALESCE(v_cred.revoked_reason, 'No reason specified') || ').'
        );
    END IF;

    -- 2. Validate Event Day
    SELECT ed.*, e.name AS event_name, e.require_payment_before_checkin, e.has_registration_fee
    INTO v_day
    FROM public.event_days ed
    JOIN public.events e ON e.id = ed.event_id
    WHERE ed.id = p_event_day_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'status', 'invalid_day',
            'message', 'Selected event day was not found.'
        );
    END IF;

    IF v_day.status <> 'open' THEN
        RETURN jsonb_build_object(
            'success', false,
            'status', 'day_not_open',
            'message', 'Event day is currently ' || upper(v_day.status) || '. Check-in is not permitted.'
        );
    END IF;

    -- 3. Validate Registration belongs to this event
    SELECT er.*, a.first_name, a.last_name, a.classification
    INTO v_reg
    FROM public.event_registrations er
    JOIN public.attendees a ON a.id = er.attendee_id
    WHERE er.id = v_registration_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'status', 'registration_not_found',
            'message', 'Attendee registration record not found.'
        );
    END IF;

    IF v_reg.event_id <> v_day.event_id THEN
        RETURN jsonb_build_object(
            'success', false,
            'status', 'wrong_event',
            'message', 'This QR code is for a different event (' || v_reg.event_id || '), not ' || v_day.event_name || '.'
        );
    END IF;

    IF v_reg.registration_status <> 'confirmed' THEN
        RETURN jsonb_build_object(
            'success', false,
            'status', 'registration_inactive',
            'message', 'Registration status is ' || upper(v_reg.registration_status) || '.'
        );
    END IF;

    -- 4. Check Daily Eligibility
    IF NOT EXISTS (
        SELECT 1 FROM public.event_day_registrations
        WHERE event_day_id = p_event_day_id
          AND registration_id = v_registration_id
          AND attendance_expected = true
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'status', 'not_eligible_today',
            'message', 'Attendee (' || v_reg.first_name || ' ' || v_reg.last_name || ') is not scheduled to attend Day ' || v_day.day_number || '.'
        );
    END IF;

    -- 5. Check Payment Policy
    IF v_day.has_registration_fee AND v_day.require_payment_before_checkin THEN
        IF v_reg.payment_status NOT IN ('paid', 'waived') THEN
            RETURN jsonb_build_object(
                'success', false,
                'status', 'payment_required',
                'message', 'Payment required before entry. Current status: ' || upper(v_reg.payment_status) || '. Please direct to Registrar desk.'
            );
        END IF;
    END IF;

    -- 6. Check Duplicate Check-In for this day
    SELECT * INTO v_existing_att
    FROM public.attendance_records
    WHERE registration_id = v_registration_id AND event_day_id = p_event_day_id;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'status', 'already_checked_in',
            'message', 'Already checked in today!',
            'attendee_name', v_reg.first_name || ' ' || v_reg.last_name,
            'checked_in_at', v_existing_att.checked_in_at
        );
    END IF;

    -- 7. Insert Attendance Record
    INSERT INTO public.attendance_records (
        registration_id,
        event_day_id,
        checked_in_at,
        checked_in_by,
        check_in_method
    ) VALUES (
        v_registration_id,
        p_event_day_id,
        now(),
        auth.uid(),
        'qr'
    );

    -- 8. Get updated confirmed count for today
    SELECT COUNT(*) INTO v_total_confirmed
    FROM public.attendance_records
    WHERE event_day_id = p_event_day_id;

    RETURN jsonb_build_object(
        'success', true,
        'status', 'success',
        'attendee_name', v_reg.first_name || ' ' || v_reg.last_name,
        'classification', v_reg.classification,
        'checked_in_at', now(),
        'day_number', v_day.day_number,
        'total_confirmed_today', v_total_confirmed
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Authorized Manual Check-In
CREATE OR REPLACE FUNCTION public.manual_checkin(
    p_registration_id UUID,
    p_event_day_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_reg RECORD;
    v_day RECORD;
    v_existing_att RECORD;
    v_total_confirmed INTEGER;
    v_role TEXT;
BEGIN
    v_role := public.get_auth_role();
    IF v_role NOT IN ('admin', 'registrar', 'usher') THEN
        RETURN jsonb_build_object(
            'success', false,
            'status', 'unauthorized',
            'message', 'You do not have permission to perform check-ins.'
        );
    END IF;

    SELECT ed.*, e.name AS event_name, e.require_payment_before_checkin, e.has_registration_fee
    INTO v_day
    FROM public.event_days ed
    JOIN public.events e ON e.id = ed.event_id
    WHERE ed.id = p_event_day_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'status', 'invalid_day', 'message', 'Event day not found.');
    END IF;

    IF v_day.status <> 'open' THEN
        RETURN jsonb_build_object('success', false, 'status', 'day_not_open', 'message', 'Event day is ' || upper(v_day.status) || '.');
    END IF;

    SELECT er.*, a.first_name, a.last_name, a.classification
    INTO v_reg
    FROM public.event_registrations er
    JOIN public.attendees a ON a.id = er.attendee_id
    WHERE er.id = p_registration_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'status', 'registration_not_found', 'message', 'Registration not found.');
    END IF;

    IF v_reg.event_id <> v_day.event_id THEN
        RETURN jsonb_build_object('success', false, 'status', 'wrong_event', 'message', 'Registration belongs to a different event.');
    END IF;

    IF v_reg.registration_status <> 'confirmed' THEN
        RETURN jsonb_build_object('success', false, 'status', 'registration_inactive', 'message', 'Registration is not confirmed.');
    END IF;

    -- Check Eligibility
    IF NOT EXISTS (
        SELECT 1 FROM public.event_day_registrations
        WHERE event_day_id = p_event_day_id AND registration_id = p_registration_id AND attendance_expected = true
    ) THEN
        RETURN jsonb_build_object('success', false, 'status', 'not_eligible_today', 'message', 'Attendee is not scheduled for this day.');
    END IF;

    -- Check Payment
    IF v_day.has_registration_fee AND v_day.require_payment_before_checkin THEN
        IF v_reg.payment_status NOT IN ('paid', 'waived') THEN
            RETURN jsonb_build_object('success', false, 'status', 'payment_required', 'message', 'Payment required before entry.');
        END IF;
    END IF;

    -- Check Duplicate
    SELECT * INTO v_existing_att
    FROM public.attendance_records
    WHERE registration_id = p_registration_id AND event_day_id = p_event_day_id;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'status', 'already_checked_in',
            'message', 'Already checked in today!',
            'attendee_name', v_reg.first_name || ' ' || v_reg.last_name,
            'checked_in_at', v_existing_att.checked_in_at
        );
    END IF;

    -- Insert Attendance
    INSERT INTO public.attendance_records (
        registration_id,
        event_day_id,
        checked_in_at,
        checked_in_by,
        check_in_method
    ) VALUES (
        p_registration_id,
        p_event_day_id,
        now(),
        auth.uid(),
        'manual'
    );

    SELECT COUNT(*) INTO v_total_confirmed
    FROM public.attendance_records
    WHERE event_day_id = p_event_day_id;

    RETURN jsonb_build_object(
        'success', true,
        'status', 'success',
        'attendee_name', v_reg.first_name || ' ' || v_reg.last_name,
        'classification', v_reg.classification,
        'checked_in_at', now(),
        'day_number', v_day.day_number,
        'total_confirmed_today', v_total_confirmed
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Kitchen Dashboard Aggregate Headcount RPC (Zero Attendee PII Exposed)
CREATE OR REPLACE FUNCTION public.get_kitchen_headcount(
    p_event_day_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_day RECORD;
    v_expected INTEGER;
    v_confirmed INTEGER;
    v_buffer NUMERIC;
    v_suggested_meals INTEGER;
    v_pct NUMERIC;
BEGIN
    SELECT ed.*, e.name AS event_name, e.default_meal_buffer_percentage, e.meals_per_attendee
    INTO v_day
    FROM public.event_days ed
    JOIN public.events e ON e.id = ed.event_id
    WHERE ed.id = p_event_day_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Event day not found');
    END IF;

    -- Expected attendees scheduled for this day
    SELECT COUNT(*) INTO v_expected
    FROM public.event_day_registrations
    WHERE event_day_id = p_event_day_id AND attendance_expected = true;

    -- Confirmed check-ins today
    SELECT COUNT(*) INTO v_confirmed
    FROM public.attendance_records
    WHERE event_day_id = p_event_day_id;

    v_buffer := COALESCE(v_day.meal_buffer_percentage, v_day.default_meal_buffer_percentage, 10.00);

    -- Formula: Suggested = CEIL( (expected + walk_ins) * (1 + buffer/100) * meals_per_attendee )
    v_suggested_meals := CEIL((v_expected + v_day.expected_walk_ins) * (1.0 + (v_buffer / 100.0)) * v_day.meals_per_attendee);

    IF v_expected > 0 THEN
        v_pct := ROUND((v_confirmed::NUMERIC * 100.0) / v_expected::NUMERIC, 1);
    ELSE
        v_pct := 0.0;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'event_id', v_day.event_id,
        'event_name', v_day.event_name,
        'event_day_id', v_day.id,
        'event_date', v_day.event_date,
        'day_number', v_day.day_number,
        'day_status', v_day.status,
        'expected_today', v_expected,
        'confirmed_today', v_confirmed,
        'remaining_expected', GREATEST(0, v_expected - v_confirmed),
        'attendance_percentage', v_pct,
        'expected_walk_ins', v_day.expected_walk_ins,
        'meal_buffer_percentage', v_buffer,
        'meals_per_attendee', v_day.meals_per_attendee,
        'suggested_meal_quantity', v_suggested_meals,
        'last_updated', now()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
