-- =============================================================================
-- Migration 01: Initial Schema for Berean Bible Baptist Church Event Check-In
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Profiles Table (Extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'usher' CHECK (role IN ('admin', 'registrar', 'usher', 'kitchen')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger to create profile automatically on auth.users insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, role, is_active)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'full_name', 'Staff Member'),
        COALESCE(new.raw_user_meta_data->>'role', 'usher'),
        true
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Events Table
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    venue TEXT NOT NULL DEFAULT 'Berean Bible Baptist Church Sanctuary',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    registration_opens_at TIMESTAMPTZ,
    registration_closes_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'registration_open', 'registration_closed', 'in_progress', 'completed', 'archived')),
    capacity INTEGER CHECK (capacity IS NULL OR capacity > 0),
    has_registration_fee BOOLEAN NOT NULL DEFAULT false,
    registration_fee NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (registration_fee >= 0),
    currency TEXT NOT NULL DEFAULT 'PHP',
    payment_instructions TEXT,
    payment_deadline TIMESTAMPTZ,
    require_payment_before_checkin BOOLEAN NOT NULL DEFAULT false,
    expected_walk_ins INTEGER NOT NULL DEFAULT 0 CHECK (expected_walk_ins >= 0),
    default_meal_buffer_percentage NUMERIC(5,2) NOT NULL DEFAULT 10.00 CHECK (default_meal_buffer_percentage >= 0),
    meals_per_attendee NUMERIC(4,2) NOT NULL DEFAULT 1.00 CHECK (meals_per_attendee > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_event_dates CHECK (end_date >= start_date)
);

-- 3. Event Days Table
CREATE TABLE IF NOT EXISTS public.event_days (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    event_date DATE NOT NULL,
    day_number INTEGER NOT NULL CHECK (day_number > 0),
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'open', 'closed', 'cancelled')),
    check_in_opens_at TIMESTAMPTZ,
    check_in_closes_at TIMESTAMPTZ,
    expected_walk_ins INTEGER NOT NULL DEFAULT 0 CHECK (expected_walk_ins >= 0),
    meal_buffer_percentage NUMERIC(5,2) CHECK (meal_buffer_percentage IS NULL OR meal_buffer_percentage >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_event_day_date UNIQUE (event_id, event_date),
    CONSTRAINT uq_event_day_number UNIQUE (event_id, day_number)
);

-- 4. Households Table (Optional Family Grouping)
CREATE TABLE IF NOT EXISTS public.households (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_name TEXT NOT NULL,
    primary_contact TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Attendees Table
CREATE TABLE IF NOT EXISTS public.attendees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID REFERENCES public.households(id) ON DELETE SET NULL,
    first_name TEXT NOT NULL,
    middle_name TEXT,
    last_name TEXT NOT NULL,
    contact_number TEXT,
    email TEXT,
    classification TEXT NOT NULL DEFAULT 'visitor' CHECK (classification IN ('member', 'visitor', 'youth', 'pastor', 'worker', 'guest')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Event Registrations Table
CREATE TABLE IF NOT EXISTS public.event_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE RESTRICT,
    attendee_id UUID NOT NULL REFERENCES public.attendees(id) ON DELETE RESTRICT,
    registration_status TEXT NOT NULL DEFAULT 'confirmed' CHECK (registration_status IN ('confirmed', 'cancelled', 'waitlisted')),
    registration_source TEXT NOT NULL DEFAULT 'staff_assisted' CHECK (registration_source IN ('paper', 'online', 'staff_assisted')),
    registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    registered_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partially_paid', 'paid', 'waived', 'refunded')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_event_attendee UNIQUE (event_id, attendee_id)
);

-- 7. Event Day Registrations Table (Daily Eligibility)
CREATE TABLE IF NOT EXISTS public.event_day_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_day_id UUID NOT NULL REFERENCES public.event_days(id) ON DELETE CASCADE,
    registration_id UUID NOT NULL REFERENCES public.event_registrations(id) ON DELETE CASCADE,
    attendance_expected BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_day_registration UNIQUE (event_day_id, registration_id)
);

-- 8. QR Credentials Table (Stores ONLY SHA-256 Hashes)
CREATE TABLE IF NOT EXISTS public.qr_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_id UUID NOT NULL REFERENCES public.event_registrations(id) ON DELETE CASCADE UNIQUE,
    token_hash TEXT NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at TIMESTAMPTZ,
    revoked_reason TEXT
);

-- 9. Attendance Records Table (Strict Daily Check-Ins)
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_id UUID NOT NULL REFERENCES public.event_registrations(id) ON DELETE RESTRICT,
    event_day_id UUID NOT NULL REFERENCES public.event_days(id) ON DELETE RESTRICT,
    checked_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    checked_in_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    check_in_method TEXT NOT NULL DEFAULT 'qr' CHECK (check_in_method IN ('qr', 'manual')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_attendance_day_reg UNIQUE (registration_id, event_day_id)
);

-- 10. Payments Table
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_id UUID NOT NULL REFERENCES public.event_registrations(id) ON DELETE RESTRICT,
    amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    currency TEXT NOT NULL DEFAULT 'PHP',
    payment_method TEXT NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'gcash', 'bank_transfer', 'other')),
    payment_status TEXT NOT NULL DEFAULT 'completed' CHECK (payment_status IN ('completed', 'pending', 'waived', 'refunded', 'voided')),
    reference_number TEXT,
    paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    reason TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events(status);
CREATE INDEX IF NOT EXISTS idx_event_days_event_id ON public.event_days(event_id, event_date);
CREATE INDEX IF NOT EXISTS idx_attendees_name ON public.attendees(last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_event_reg_event ON public.event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_reg_attendee ON public.event_registrations(attendee_id);
CREATE INDEX IF NOT EXISTS idx_day_reg_day_expected ON public.event_day_registrations(event_day_id, attendance_expected);
CREATE INDEX IF NOT EXISTS idx_qr_token_hash ON public.qr_credentials(token_hash) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_attendance_day ON public.attendance_records(event_day_id);
CREATE INDEX IF NOT EXISTS idx_attendance_reg ON public.attendance_records(registration_id);
CREATE INDEX IF NOT EXISTS idx_payments_reg ON public.payments(registration_id);
