
-- Roles enum + user_roles + has_role
CREATE TYPE public.app_role AS ENUM ('tester','analyzer','integrator','admin');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "roles readable by authenticated" ON public.user_roles FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  is_online BOOLEAN NOT NULL DEFAULT false,
  case_load INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles readable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- Vehicles
CREATE TABLE public.vehicles (
  vehicle_id TEXT PRIMARY KEY,
  model TEXT NOT NULL,
  fleet TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.vehicles TO authenticated;
GRANT ALL ON public.vehicles TO service_role;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vehicles readable" ON public.vehicles FOR SELECT TO authenticated USING (true);
CREATE POLICY "vehicles insert by authenticated" ON public.vehicles FOR INSERT TO authenticated WITH CHECK (true);

-- Sessions
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id TEXT NOT NULL REFERENCES public.vehicles(vehicle_id),
  tester_id UUID NOT NULL REFERENCES auth.users(id),
  start_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_time TIMESTAMPTZ,
  samples JSONB NOT NULL DEFAULT '[]'::jsonb,
  dtc_code TEXT,
  completeness_score INTEGER,
  status TEXT NOT NULL DEFAULT 'recording',
  sent_to_analyzer_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sessions TO authenticated;
GRANT ALL ON public.sessions TO service_role;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sessions readable by authenticated" ON public.sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "testers manage own sessions" ON public.sessions FOR INSERT TO authenticated WITH CHECK (tester_id = auth.uid());
CREATE POLICY "testers update own sessions" ON public.sessions FOR UPDATE TO authenticated USING (tester_id = auth.uid());

-- Analyses
CREATE TABLE public.analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  vehicle_id TEXT NOT NULL REFERENCES public.vehicles(vehicle_id),
  analyzer_id UUID NOT NULL REFERENCES auth.users(id),
  dtc_code TEXT,
  deviation_summary JSONB,
  ai_suggested_causes JSONB,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.analyses TO authenticated;
GRANT ALL ON public.analyses TO service_role;
ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "analyses readable" ON public.analyses FOR SELECT TO authenticated USING (true);
CREATE POLICY "analyzers insert own" ON public.analyses FOR INSERT TO authenticated WITH CHECK (analyzer_id = auth.uid());
CREATE POLICY "analyzers update own" ON public.analyses FOR UPDATE TO authenticated USING (analyzer_id = auth.uid());

-- Reports
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  vehicle_id TEXT NOT NULL REFERENCES public.vehicles(vehicle_id),
  issue TEXT NOT NULL,
  evidence TEXT NOT NULL,
  recommended_fix TEXT NOT NULL,
  history_notes TEXT,
  sent_to_integrator_id UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reports readable" ON public.reports FOR SELECT TO authenticated USING (true);
CREATE POLICY "reports insert by authenticated" ON public.reports FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "reports update by authenticated" ON public.reports FOR UPDATE TO authenticated USING (true);

-- Field checks
CREATE TABLE public.field_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  vehicle_id TEXT NOT NULL REFERENCES public.vehicles(vehicle_id),
  integrator_id UUID NOT NULL REFERENCES auth.users(id),
  checklist_results JSONB,
  outcome TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.field_checks TO authenticated;
GRANT ALL ON public.field_checks TO service_role;
ALTER TABLE public.field_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "field_checks readable" ON public.field_checks FOR SELECT TO authenticated USING (true);
CREATE POLICY "integrators insert own" ON public.field_checks FOR INSERT TO authenticated WITH CHECK (integrator_id = auth.uid());

-- Messages
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id TEXT NOT NULL REFERENCES public.vehicles(vehicle_id),
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  sender_role app_role NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages readable" ON public.messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "messages insert own" ON public.messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid());

-- Notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  vehicle_id TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email
  ) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Seed vehicles
INSERT INTO public.vehicles (vehicle_id, model, fleet) VALUES
  ('AL-TRK-0142','Ashok Leyland 4225','North Fleet'),
  ('AL-TRK-0198','Ashok Leyland 3520','South Fleet'),
  ('AL-TRK-0311','Ashok Leyland 2820','East Fleet'),
  ('AL-TRK-0427','Ashok Leyland 4923','West Fleet')
ON CONFLICT DO NOTHING;
