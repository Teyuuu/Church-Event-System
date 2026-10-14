-- =============================================================================
-- Migration 02: Row Level Security (RLS) Policies
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_day_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper functions to check caller role
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS TEXT AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid() AND is_active = true;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin' AND is_active = true
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('admin', 'registrar', 'usher', 'kitchen') AND is_active = true
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- 1. Profiles Policies
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Active staff can read profiles" ON public.profiles;
CREATE POLICY "Active staff can read profiles"
    ON public.profiles FOR SELECT
    USING (public.is_staff() OR auth.uid() = id);

DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
CREATE POLICY "Admins can manage all profiles"
    ON public.profiles FOR ALL
    USING (public.is_admin());

DROP POLICY IF EXISTS "Users can update own non-role profile details" ON public.profiles;
CREATE POLICY "Users can update own non-role profile details"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (
        auth.uid() = id AND
        role = (SELECT role FROM public.profiles WHERE id = auth.uid()) AND
        is_active = (SELECT is_active FROM public.profiles WHERE id = auth.uid())
    );

-- -----------------------------------------------------------------------------
-- 2. Events & Event Days Policies
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view open events" ON public.events;
CREATE POLICY "Public can view open events"
    ON public.events FOR SELECT
    USING (status IN ('registration_open', 'in_progress') OR public.is_staff());

DROP POLICY IF EXISTS "Admins can modify events" ON public.events;
CREATE POLICY "Admins can modify events"
    ON public.events FOR ALL
    USING (public.is_admin());

DROP POLICY IF EXISTS "Public can view event days of open events" ON public.event_days;
CREATE POLICY "Public can view event days of open events"
    ON public.event_days FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.events e
            WHERE e.id = event_days.event_id AND (e.status IN ('registration_open', 'in_progress') OR public.is_staff())
        )
    );

DROP POLICY IF EXISTS "Admins can modify event days" ON public.event_days;
CREATE POLICY "Admins can modify event days"
    ON public.event_days FOR ALL
    USING (public.is_admin());

-- -----------------------------------------------------------------------------
-- 3. Attendees & Households Policies
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Staff can view attendees" ON public.attendees;
CREATE POLICY "Staff can view attendees"
    ON public.attendees FOR SELECT
    USING (public.get_auth_role() IN ('admin', 'registrar', 'usher'));

DROP POLICY IF EXISTS "Admin and registrars can insert attendees" ON public.attendees;
CREATE POLICY "Admin and registrars can insert attendees"
    ON public.attendees FOR INSERT
    WITH CHECK (public.get_auth_role() IN ('admin', 'registrar'));

DROP POLICY IF EXISTS "Admin and registrars can update attendees" ON public.attendees;
CREATE POLICY "Admin and registrars can update attendees"
    ON public.attendees FOR UPDATE
    USING (public.get_auth_role() IN ('admin', 'registrar'));

DROP POLICY IF EXISTS "Staff can view households" ON public.households;
CREATE POLICY "Staff can view households"
    ON public.households FOR SELECT
    USING (public.get_auth_role() IN ('admin', 'registrar'));

DROP POLICY IF EXISTS "Admin and registrars can modify households" ON public.households;
CREATE POLICY "Admin and registrars can modify households"
    ON public.households FOR ALL
    USING (public.get_auth_role() IN ('admin', 'registrar'));

-- -----------------------------------------------------------------------------
-- 4. Event Registrations Policies
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Staff can view registrations" ON public.event_registrations;
CREATE POLICY "Staff can view registrations"
    ON public.event_registrations FOR SELECT
    USING (public.get_auth_role() IN ('admin', 'registrar', 'usher'));

DROP POLICY IF EXISTS "Admin and registrars can insert registrations" ON public.event_registrations;
CREATE POLICY "Admin and registrars can insert registrations"
    ON public.event_registrations FOR INSERT
    WITH CHECK (public.get_auth_role() IN ('admin', 'registrar'));

DROP POLICY IF EXISTS "Admin and registrars can update registrations" ON public.event_registrations;
CREATE POLICY "Admin and registrars can update registrations"
    ON public.event_registrations FOR UPDATE
    USING (public.get_auth_role() IN ('admin', 'registrar'));

-- -----------------------------------------------------------------------------
-- 5. Event Day Registrations Policies
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Staff can view day registrations" ON public.event_day_registrations;
CREATE POLICY "Staff can view day registrations"
    ON public.event_day_registrations FOR SELECT
    USING (public.is_staff());

DROP POLICY IF EXISTS "Admin and registrars can manage day registrations" ON public.event_day_registrations;
CREATE POLICY "Admin and registrars can manage day registrations"
    ON public.event_day_registrations FOR ALL
    USING (public.get_auth_role() IN ('admin', 'registrar'));

-- -----------------------------------------------------------------------------
-- 6. QR Credentials Policies
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admin and registrars can view qr credentials" ON public.qr_credentials;
CREATE POLICY "Admin and registrars can view qr credentials"
    ON public.qr_credentials FOR SELECT
    USING (public.get_auth_role() IN ('admin', 'registrar'));

DROP POLICY IF EXISTS "Admin can manage qr credentials" ON public.qr_credentials;
CREATE POLICY "Admin can manage qr credentials"
    ON public.qr_credentials FOR ALL
    USING (public.is_admin());

-- -----------------------------------------------------------------------------
-- 7. Attendance Records Policies
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Staff can view attendance records" ON public.attendance_records;
CREATE POLICY "Staff can view attendance records"
    ON public.attendance_records FOR SELECT
    USING (public.get_auth_role() IN ('admin', 'registrar', 'usher'));

-- Direct manual insertion reserved for admin corrections; normal check-ins run through RPC
DROP POLICY IF EXISTS "Admins can manage attendance records directly" ON public.attendance_records;
CREATE POLICY "Admins can manage attendance records directly"
    ON public.attendance_records FOR ALL
    USING (public.is_admin());

-- -----------------------------------------------------------------------------
-- 8. Payments Policies
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admin and registrars can view payments" ON public.payments;
CREATE POLICY "Admin and registrars can view payments"
    ON public.payments FOR SELECT
    USING (public.get_auth_role() IN ('admin', 'registrar'));

DROP POLICY IF EXISTS "Admin and registrars can record payments" ON public.payments;
CREATE POLICY "Admin and registrars can record payments"
    ON public.payments FOR INSERT
    WITH CHECK (public.get_auth_role() IN ('admin', 'registrar'));

DROP POLICY IF EXISTS "Admins can update payments" ON public.payments;
CREATE POLICY "Admins can update payments"
    ON public.payments FOR UPDATE
    USING (public.is_admin());

-- -----------------------------------------------------------------------------
-- 9. Audit Logs Policies
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view audit logs"
    ON public.audit_logs FOR SELECT
    USING (public.is_admin());
