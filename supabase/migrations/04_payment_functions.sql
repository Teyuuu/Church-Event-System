-- =============================================================================
-- Migration 04: Payment and Financial Calculations
-- =============================================================================

CREATE OR REPLACE FUNCTION public.record_payment(
    p_registration_id UUID,
    p_amount NUMERIC,
    p_payment_method TEXT,
    p_reference_number TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_reg RECORD;
    v_event RECORD;
    v_total_paid NUMERIC;
    v_payment_id UUID;
    v_new_status TEXT;
    v_role TEXT;
BEGIN
    v_role := public.get_auth_role();
    IF v_role NOT IN ('admin', 'registrar') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized to record payments');
    END IF;

    SELECT er.*, e.registration_fee, e.has_registration_fee
    INTO v_reg
    FROM public.event_registrations er
    JOIN public.events e ON e.id = er.event_id
    WHERE er.id = p_registration_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Registration not found');
    END IF;

    INSERT INTO public.payments (
        registration_id,
        amount,
        payment_method,
        payment_status,
        reference_number,
        paid_at,
        recorded_by,
        notes
    ) VALUES (
        p_registration_id,
        p_amount,
        p_payment_method,
        'completed',
        p_reference_number,
        now(),
        auth.uid(),
        p_notes
    ) RETURNING id INTO v_payment_id;

    -- Calculate total paid
    SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
    FROM public.payments
    WHERE registration_id = p_registration_id AND payment_status = 'completed';

    IF v_total_paid >= v_reg.registration_fee THEN
        v_new_status := 'paid';
    ELSIF v_total_paid > 0 THEN
        v_new_status := 'partially_paid';
    ELSE
        v_new_status := 'unpaid';
    END IF;

    UPDATE public.event_registrations
    SET payment_status = v_new_status,
        updated_at = now()
    WHERE id = p_registration_id;

    -- Log audit trail
    INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
    VALUES (
        auth.uid(),
        'RECORD_PAYMENT',
        'payments',
        v_payment_id,
        jsonb_build_object(
            'registration_id', p_registration_id,
            'amount', p_amount,
            'payment_method', p_payment_method,
            'new_payment_status', v_new_status
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'payment_id', v_payment_id,
        'total_paid', v_total_paid,
        'registration_fee', v_reg.registration_fee,
        'payment_status', v_new_status
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
