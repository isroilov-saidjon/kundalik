-- Profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  google_refresh_token TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Groups table
CREATE TABLE public.groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Group members
CREATE TABLE public.group_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- Events table
CREATE TABLE public.events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  type TEXT DEFAULT 'personal' CHECK (type IN ('personal', 'group', 'geo')),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL,
  location TEXT,
  google_event_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Meeting requests
CREATE TABLE public.meeting_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  proposed_time TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  title TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Geo reminders
CREATE TABLE public.geo_reminders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  destination TEXT NOT NULL,
  trip_date DATE NOT NULL,
  reminder_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geo_reminders ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all, update own
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Events: users see own + group events they belong to
CREATE POLICY "events_select" ON public.events FOR SELECT USING (
  user_id = auth.uid() OR
  group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid())
);
CREATE POLICY "events_insert" ON public.events FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "events_update" ON public.events FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "events_delete" ON public.events FOR DELETE USING (user_id = auth.uid());

-- Groups
CREATE POLICY "groups_select" ON public.groups FOR SELECT USING (
  id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid())
);
CREATE POLICY "groups_insert" ON public.groups FOR INSERT WITH CHECK (created_by = auth.uid());
CREATE POLICY "groups_update" ON public.groups FOR UPDATE USING (created_by = auth.uid());
CREATE POLICY "groups_delete" ON public.groups FOR DELETE USING (created_by = auth.uid());

-- Group members
CREATE POLICY "group_members_select" ON public.group_members FOR SELECT USING (
  group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid())
);
CREATE POLICY "group_members_insert" ON public.group_members FOR INSERT WITH CHECK (
  group_id IN (SELECT id FROM public.groups WHERE created_by = auth.uid())
);
CREATE POLICY "group_members_delete" ON public.group_members FOR DELETE USING (user_id = auth.uid());

-- Meeting requests
CREATE POLICY "meeting_requests_select" ON public.meeting_requests FOR SELECT USING (
  from_user_id = auth.uid() OR to_user_id = auth.uid()
);
CREATE POLICY "meeting_requests_insert" ON public.meeting_requests FOR INSERT WITH CHECK (from_user_id = auth.uid());
CREATE POLICY "meeting_requests_update" ON public.meeting_requests FOR UPDATE USING (
  from_user_id = auth.uid() OR to_user_id = auth.uid()
);

-- Geo reminders
CREATE POLICY "geo_reminders_all" ON public.geo_reminders USING (user_id = auth.uid());

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
