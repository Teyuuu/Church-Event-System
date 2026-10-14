-- =============================================================================
-- Migration 05: Realistic Seed Data for Berean Bible Baptist Church
-- =============================================================================

DO $$
DECLARE
    v_event_id UUID;
    v_day1_id UUID;
    v_day2_id UUID;
    v_day3_id UUID;
    v_h1_id UUID;
    v_a1_id UUID;
    v_a2_id UUID;
    v_a3_id UUID;
    v_a4_id UUID;
    v_r1_id UUID;
    v_r2_id UUID;
    v_r3_id UUID;
    v_r4_id UUID;
BEGIN
    -- 1. Insert Event
    INSERT INTO public.events (
        name,
        description,
        venue,
        start_date,
        end_date,
        start_time,
        end_time,
        status,
        capacity,
        has_registration_fee,
        registration_fee,
        currency,
        payment_instructions,
        require_payment_before_checkin,
        expected_walk_ins,
        default_meal_buffer_percentage,
        meals_per_attendee
    ) VALUES (
        'Berean Annual Bible Conference & Camp 2026',
        'Theme: Rooted and Built Up in Christ (Colossians 2:6-7). Three days of preaching, fellowship, prayer, and community building.',
        'Berean Bible Baptist Church Sanctuary & Fellowship Hall',
        CURRENT_DATE,
        CURRENT_DATE + INTERVAL '2 days',
        '08:00:00',
        '17:30:00',
        'registration_open',
        300,
        true,
        250.00,
        'PHP',
        'GCash: 0917-123-4567 (Berean Treasury) or pay in cash at the Church Registrar Desk.',
        false,
        20,
        10.00,
        1.00
    ) RETURNING id INTO v_event_id;

    -- 2. Insert 3 Event Days
    INSERT INTO public.event_days (event_id, event_date, day_number, status, expected_walk_ins, meal_buffer_percentage)
    VALUES (v_event_id, CURRENT_DATE, 1, 'open', 15, 10.00)
    RETURNING id INTO v_day1_id;

    INSERT INTO public.event_days (event_id, event_date, day_number, status, expected_walk_ins, meal_buffer_percentage)
    VALUES (v_event_id, CURRENT_DATE + INTERVAL '1 day', 2, 'scheduled', 10, 10.00)
    RETURNING id INTO v_day2_id;

    INSERT INTO public.event_days (event_id, event_date, day_number, status, expected_walk_ins, meal_buffer_percentage)
    VALUES (v_event_id, CURRENT_DATE + INTERVAL '2 days', 3, 'scheduled', 10, 10.00)
    RETURNING id INTO v_day3_id;

    -- 3. Insert Sample Household & Attendees
    INSERT INTO public.households (family_name, primary_contact)
    VALUES ('Santos Family', '0917-555-0101')
    RETURNING id INTO v_h1_id;

    INSERT INTO public.attendees (household_id, first_name, last_name, contact_number, email, classification)
    VALUES (v_h1_id, 'Benjamin', 'Santos', '0917-555-0101', 'benjamin.santos@example.com', 'member')
    RETURNING id INTO v_a1_id;

    INSERT INTO public.attendees (household_id, first_name, last_name, contact_number, email, classification)
    VALUES (v_h1_id, 'Grace', 'Santos', '0917-555-0102', 'grace.santos@example.com', 'member')
    RETURNING id INTO v_a2_id;

    INSERT INTO public.attendees (first_name, last_name, contact_number, email, classification)
    VALUES ('Timothy', 'Reyes', '0918-555-0202', 'timothy.reyes@example.com', 'youth')
    RETURNING id INTO v_a3_id;

    INSERT INTO public.attendees (first_name, last_name, contact_number, email, classification)
    VALUES ('Pastor David', 'Villanueva', '0920-555-0303', 'pastor.david@example.com', 'pastor')
    RETURNING id INTO v_a4_id;

    -- 4. Insert Registrations
    INSERT INTO public.event_registrations (event_id, attendee_id, registration_status, registration_source, payment_status)
    VALUES (v_event_id, v_a1_id, 'confirmed', 'staff_assisted', 'paid')
    RETURNING id INTO v_r1_id;

    INSERT INTO public.event_registrations (event_id, attendee_id, registration_status, registration_source, payment_status)
    VALUES (v_event_id, v_a2_id, 'confirmed', 'staff_assisted', 'paid')
    RETURNING id INTO v_r2_id;

    INSERT INTO public.event_registrations (event_id, attendee_id, registration_status, registration_source, payment_status)
    VALUES (v_event_id, v_a3_id, 'confirmed', 'online', 'unpaid')
    RETURNING id INTO v_r3_id;

    INSERT INTO public.event_registrations (event_id, attendee_id, registration_status, registration_source, payment_status)
    VALUES (v_event_id, v_a4_id, 'confirmed', 'paper', 'waived')
    RETURNING id INTO v_r4_id;

    -- 5. Day Eligibility (All expected for Day 1; some for Day 2 and Day 3)
    INSERT INTO public.event_day_registrations (event_day_id, registration_id, attendance_expected)
    VALUES
        (v_day1_id, v_r1_id, true), (v_day2_id, v_r1_id, true), (v_day3_id, v_r1_id, true),
        (v_day1_id, v_r2_id, true), (v_day2_id, v_r2_id, true), (v_day3_id, v_r2_id, true),
        (v_day1_id, v_r3_id, true), (v_day2_id, v_r3_id, true), (v_day3_id, v_r3_id, false),
        (v_day1_id, v_r4_id, true), (v_day2_id, v_r4_id, true), (v_day3_id, v_r4_id, true);

    -- 6. Issue QR credentials
    PERFORM public.issue_qr_credential(v_r1_id);
    PERFORM public.issue_qr_credential(v_r2_id);
    PERFORM public.issue_qr_credential(v_r3_id);
    PERFORM public.issue_qr_credential(v_r4_id);

    -- 7. Add sample payment for Benjamin Santos
    INSERT INTO public.payments (registration_id, amount, payment_method, payment_status, reference_number, notes)
    VALUES (v_r1_id, 250.00, 'cash', 'completed', 'OR-1001', 'Paid in full at church office');

    INSERT INTO public.payments (registration_id, amount, payment_method, payment_status, reference_number, notes)
    VALUES (v_r2_id, 250.00, 'gcash', 'completed', 'GCASH-987654321', 'Verified via treasury');

END $$;
