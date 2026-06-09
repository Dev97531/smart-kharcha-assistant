
-- shared updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 1. committees (table first, then RLS — helper functions added after tables exist)
CREATE TABLE public.committees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  monthly_amount numeric NOT NULL CHECK (monthly_amount > 0),
  total_months int NOT NULL CHECK (total_months > 0 AND total_months <= 120),
  start_month date NOT NULL,
  payout_method text NOT NULL CHECK (payout_method IN ('rotation', 'draw')),
  organizer_id uuid NOT NULL,
  organizer_name text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.committees TO authenticated;
GRANT ALL ON public.committees TO service_role;

-- 2. committee_members
CREATE TABLE public.committee_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  committee_id uuid NOT NULL REFERENCES public.committees(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  user_id uuid,
  rotation_order int,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_committee_members_committee ON public.committee_members(committee_id);
CREATE INDEX idx_committee_members_user ON public.committee_members(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.committee_members TO authenticated;
GRANT ALL ON public.committee_members TO service_role;

-- 3. committee_contributions
CREATE TABLE public.committee_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  committee_id uuid NOT NULL REFERENCES public.committees(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.committee_members(id) ON DELETE CASCADE,
  month_number int NOT NULL CHECK (month_number > 0),
  paid boolean NOT NULL DEFAULT false,
  paid_on date,
  method text CHECK (method IN ('online', 'cash')),
  note text,
  marked_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (committee_id, member_id, month_number)
);
CREATE INDEX idx_committee_contrib_committee ON public.committee_contributions(committee_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.committee_contributions TO authenticated;
GRANT ALL ON public.committee_contributions TO service_role;

-- 4. committee_payouts
CREATE TABLE public.committee_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  committee_id uuid NOT NULL REFERENCES public.committees(id) ON DELETE CASCADE,
  month_number int NOT NULL CHECK (month_number > 0),
  recipient_member_id uuid NOT NULL REFERENCES public.committee_members(id) ON DELETE CASCADE,
  payout_date date NOT NULL,
  method text NOT NULL CHECK (method IN ('online', 'cash')),
  amount numeric NOT NULL CHECK (amount >= 0),
  note text,
  recorded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (committee_id, month_number)
);
CREATE INDEX idx_committee_payouts_committee ON public.committee_payouts(committee_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.committee_payouts TO authenticated;
GRANT ALL ON public.committee_payouts TO service_role;

-- Helper functions (now that tables exist)
CREATE OR REPLACE FUNCTION public.is_committee_participant(_committee_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.committees c
    WHERE c.id = _committee_id AND c.organizer_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.committee_members m
    WHERE m.committee_id = _committee_id AND m.user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_committee_organizer(_committee_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.committees c
    WHERE c.id = _committee_id AND c.organizer_id = _user_id
  );
$$;

-- Enable RLS and create policies
ALTER TABLE public.committees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view committees"
  ON public.committees FOR SELECT TO authenticated
  USING (public.is_committee_participant(id, auth.uid()));

CREATE POLICY "Authenticated can create committees as organizer"
  ON public.committees FOR INSERT TO authenticated
  WITH CHECK (organizer_id = auth.uid());

CREATE POLICY "Organizer can update own committee"
  ON public.committees FOR UPDATE TO authenticated
  USING (organizer_id = auth.uid())
  WITH CHECK (organizer_id = auth.uid());

CREATE POLICY "Organizer can delete own committee"
  ON public.committees FOR DELETE TO authenticated
  USING (organizer_id = auth.uid());

CREATE TRIGGER trg_committees_updated_at
  BEFORE UPDATE ON public.committees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.committee_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view members"
  ON public.committee_members FOR SELECT TO authenticated
  USING (public.is_committee_participant(committee_id, auth.uid()));

CREATE POLICY "Organizer can add members"
  ON public.committee_members FOR INSERT TO authenticated
  WITH CHECK (public.is_committee_organizer(committee_id, auth.uid()));

CREATE POLICY "Organizer can update members"
  ON public.committee_members FOR UPDATE TO authenticated
  USING (public.is_committee_organizer(committee_id, auth.uid()))
  WITH CHECK (public.is_committee_organizer(committee_id, auth.uid()));

CREATE POLICY "Organizer can delete members"
  ON public.committee_members FOR DELETE TO authenticated
  USING (public.is_committee_organizer(committee_id, auth.uid()));

ALTER TABLE public.committee_contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view contributions"
  ON public.committee_contributions FOR SELECT TO authenticated
  USING (public.is_committee_participant(committee_id, auth.uid()));

CREATE POLICY "Organizer can insert contributions"
  ON public.committee_contributions FOR INSERT TO authenticated
  WITH CHECK (public.is_committee_organizer(committee_id, auth.uid()));

CREATE POLICY "Organizer can update contributions"
  ON public.committee_contributions FOR UPDATE TO authenticated
  USING (public.is_committee_organizer(committee_id, auth.uid()))
  WITH CHECK (public.is_committee_organizer(committee_id, auth.uid()));

CREATE POLICY "Organizer can delete contributions"
  ON public.committee_contributions FOR DELETE TO authenticated
  USING (public.is_committee_organizer(committee_id, auth.uid()));

CREATE TRIGGER trg_committee_contrib_updated_at
  BEFORE UPDATE ON public.committee_contributions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.committee_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view payouts"
  ON public.committee_payouts FOR SELECT TO authenticated
  USING (public.is_committee_participant(committee_id, auth.uid()));

CREATE POLICY "Organizer can insert payouts"
  ON public.committee_payouts FOR INSERT TO authenticated
  WITH CHECK (public.is_committee_organizer(committee_id, auth.uid()));

CREATE POLICY "Organizer can update payouts"
  ON public.committee_payouts FOR UPDATE TO authenticated
  USING (public.is_committee_organizer(committee_id, auth.uid()))
  WITH CHECK (public.is_committee_organizer(committee_id, auth.uid()));

CREATE POLICY "Organizer can delete payouts"
  ON public.committee_payouts FOR DELETE TO authenticated
  USING (public.is_committee_organizer(committee_id, auth.uid()));

CREATE TRIGGER trg_committee_payouts_updated_at
  BEFORE UPDATE ON public.committee_payouts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER TABLE public.committees REPLICA IDENTITY FULL;
ALTER TABLE public.committee_members REPLICA IDENTITY FULL;
ALTER TABLE public.committee_contributions REPLICA IDENTITY FULL;
ALTER TABLE public.committee_payouts REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.committees;
ALTER PUBLICATION supabase_realtime ADD TABLE public.committee_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.committee_contributions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.committee_payouts;
