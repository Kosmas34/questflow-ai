-- ============================================================
-- GuestFlow AI — Supabase schema
-- Run this whole file in the Supabase SQL Editor (one shot).
-- ============================================================

-- ---------- PROPERTIES ----------
create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  slug text not null unique,
  type text not null check (type in ('airbnb', 'villa', 'hotel', 'rooms')),
  area text not null default '',
  languages text[] not null default array['el','en'],
  checkin_time text not null default '15:00',
  checkout_time text not null default '11:00',
  wifi_name text not null default '',
  wifi_password text not null default '',
  house_rules text not null default '',
  access_instructions text not null default '',
  phone text not null default '',
  emergency_contact text not null default '',
  -- Wizard: custom greeting shown as the first chat bubble (optional).
  welcome_message text not null default '',
  -- Wizard: which quick buttons the guest page shows.
  quick_buttons text[] not null default array['wifi','checkout','taxi','restaurants','beaches','help'],
  created_at timestamptz not null default now()
);

-- ---------- KNOWLEDGE BASE ----------
create table if not exists public.knowledge_items (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  category text not null check (category in (
    'wifi','checkin_checkout','transport','parking','beaches',
    'food','drinks','supermarket','pharmacy','rules','faq'
  )),
  title text not null,
  content text not null,
  created_at timestamptz not null default now()
);

-- ---------- GUEST SESSIONS (one per QR scan / visit) ----------
create table if not exists public.guest_sessions (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  language text not null default 'el',
  created_at timestamptz not null default now()
);

-- ---------- GUEST MESSAGES (chat log, powers analytics) ----------
create table if not exists public.guest_messages (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  session_id uuid not null references public.guest_sessions (id) on delete cascade,
  role text not null check (role in ('guest','assistant')),
  content text not null,
  topic text not null default 'other',
  language text not null default 'el',
  created_at timestamptz not null default now()
);

-- ---------- GUEST REQUESTS ----------
create table if not exists public.requests (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  session_id uuid references public.guest_sessions (id) on delete set null,
  category text not null default 'other',
  message text not null,
  status text not null default 'new' check (status in ('new','in_progress','done')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- INDEXES ----------
create index if not exists idx_properties_owner on public.properties (owner_id);
create index if not exists idx_knowledge_property on public.knowledge_items (property_id);
create index if not exists idx_sessions_property on public.guest_sessions (property_id, created_at);
create index if not exists idx_messages_property on public.guest_messages (property_id, created_at);
create index if not exists idx_requests_property on public.requests (property_id, status);

-- ---------- ROW LEVEL SECURITY ----------
-- Owners can manage only their own data through the browser client.
-- Guest traffic never touches these tables directly: it goes through
-- Next.js API routes that use the service-role key (bypasses RLS).

alter table public.properties enable row level security;
alter table public.knowledge_items enable row level security;
alter table public.guest_sessions enable row level security;
alter table public.guest_messages enable row level security;
alter table public.requests enable row level security;

create policy "owners manage own properties"
  on public.properties for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "owners manage own knowledge"
  on public.knowledge_items for all
  using (property_id in (select id from public.properties where owner_id = auth.uid()))
  with check (property_id in (select id from public.properties where owner_id = auth.uid()));

create policy "owners read own sessions"
  on public.guest_sessions for select
  using (property_id in (select id from public.properties where owner_id = auth.uid()));

create policy "owners read own messages"
  on public.guest_messages for select
  using (property_id in (select id from public.properties where owner_id = auth.uid()));

create policy "owners read own requests"
  on public.requests for select
  using (property_id in (select id from public.properties where owner_id = auth.uid()));

create policy "owners update own requests"
  on public.requests for update
  using (property_id in (select id from public.properties where owner_id = auth.uid()))
  with check (property_id in (select id from public.properties where owner_id = auth.uid()));

-- ============================================================
-- DEMO DATA — "Sunset Villa Santorini"
-- The dashboard has a "Load demo property" button that calls
-- this function. SECURITY: the function takes NO argument —
-- it always seeds for auth.uid(), so a signed-in user can only
-- ever create demo data for THEMSELVES.
-- ============================================================
create or replace function public.create_demo_property()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  owner uuid := auth.uid();
  pid uuid;
  sid uuid;
begin
  if owner is null then
    raise exception 'Not authenticated';
  end if;

  insert into properties (owner_id, name, slug, type, area, languages,
    checkin_time, checkout_time, wifi_name, wifi_password,
    house_rules, access_instructions, phone, emergency_contact)
  values (owner, 'Sunset Villa Santorini',
    'sunset-villa-' || substr(gen_random_uuid()::text, 1, 6),
    'villa', 'Οία, Σαντορίνη', array['el','en'],
    '15:00', '11:00', 'SunsetVilla_5G', 'caldera2026',
    E'Ησυχία μετά τις 23:00.\nΌχι κάπνισμα στους εσωτερικούς χώρους.\nΌχι πάρτι.\nΤα κατοικίδια επιτρέπονται κατόπιν συνεννόησης.',
    E'Από το πάρκινγκ της Οίας, ακολουθήστε το μονοπάτι προς την καλντέρα για 3 λεπτά. Μπλε πόρτα με πινακίδα "Sunset Villa". Κωδικός κλειδοθήκης: 2468.',
    '+30 694 000 0000', '+30 697 111 1111 (Μαρία, διαχειρίστρια)')
  returning id into pid;

  insert into knowledge_items (property_id, category, title, content) values
    (pid, 'wifi', 'WiFi', 'Δίκτυο: SunsetVilla_5G — Κωδικός: caldera2026. Καλύπτει και τη βεράντα.'),
    (pid, 'checkin_checkout', 'Check-in / Check-out', 'Check-in από 15:00, check-out έως 11:00. Late checkout έως 13:00 με χρέωση 30€, ανάλογα με διαθεσιμότητα.'),
    (pid, 'transport', 'Ταξί & μετακινήσεις', 'Ταξί Οίας: +30 22860 71666. Το ΚΤΕΛ για Φηρά περνάει κάθε 30 λεπτά από τη στάση στην πλατεία (5 λεπτά με τα πόδια). Μεταφορά από/προς αεροδρόμιο κατόπιν συνεννόησης (35€).'),
    (pid, 'parking', 'Πάρκινγκ', 'Δωρεάν δημοτικό πάρκινγκ στην είσοδο της Οίας, 4 λεπτά με τα πόδια από τη βίλα. Δεν υπάρχει ιδιωτική θέση.'),
    (pid, 'beaches', 'Παραλίες', 'Κατακόλυμπο: η πιο κοντινή, 15 λεπτά περπάτημα. Αμμούδι: κατάβαση 214 σκαλιά, ιδανική για μπάνιο από τα βράχια. Μπαξέδες: ήσυχη, 10 λεπτά με αυτοκίνητο.'),
    (pid, 'food', 'Φαγητό', 'Προτάσεις μας: Roka (ελληνική δημιουργική, κάντε κράτηση), Πιτόγυρος στην πλατεία για κάτι γρήγορο, Sunset Ammoudi για ψάρι δίπλα στο κύμα.'),
    (pid, 'drinks', 'Ποτό & καφές', 'Meteor Cafe για πρωινό καφέ με θέα. PK Cocktail Bar για ηλιοβασίλεμα — πηγαίνετε 1 ώρα νωρίτερα για θέση.'),
    (pid, 'supermarket', 'Σούπερ μάρκετ', 'Mini market "Οία Market" 200μ από τη βίλα, ανοιχτό 08:00–23:00. Μεγάλο σούπερ μάρκετ (Σκλαβενίτης) στα Φηρά.'),
    (pid, 'pharmacy', 'Φαρμακείο', 'Φαρμακείο Οίας, κεντρικός δρόμος, ανοιχτό 09:00–21:00. Εφημερεύον στα Φηρά: +30 22860 23444.'),
    (pid, 'rules', 'Κανόνες', 'Ησυχία μετά τις 23:00. Όχι κάπνισμα μέσα. Το τζακούζι λειτουργεί 10:00–22:00.'),
    (pid, 'faq', 'Πετσέτες θαλάσσης', 'Θα βρείτε πετσέτες θαλάσσης στο ντουλάπι του διαδρόμου. Αλλαγή πετσετών κάθε 2 ημέρες.'),
    (pid, 'faq', 'Κλιματισμός', 'Κάθε δωμάτιο έχει δικό του χειριστήριο A/C. Παρακαλούμε σβήνετε τον κλιματισμό όταν λείπετε.');

  -- a little usage history so dashboards & analytics look alive
  for i in 1..14 loop
    insert into guest_sessions (property_id, language, created_at)
    values (pid, case when i % 3 = 0 then 'en' else 'el' end, now() - (i || ' days')::interval)
    returning id into sid;

    insert into guest_messages (property_id, session_id, role, content, topic, language, created_at) values
      (pid, sid, 'guest', 'Ποιος είναι ο κωδικός WiFi;', 'wifi',
        case when i % 3 = 0 then 'en' else 'el' end, now() - (i || ' days')::interval),
      (pid, sid, 'assistant', 'Δίκτυο: SunsetVilla_5G, κωδικός: caldera2026.', 'wifi',
        case when i % 3 = 0 then 'en' else 'el' end, now() - (i || ' days')::interval);

    if i % 2 = 0 then
      insert into guest_messages (property_id, session_id, role, content, topic, language, created_at) values
        (pid, sid, 'guest', 'Τι ώρα είναι το checkout;', 'checkin_checkout', 'el', now() - (i || ' days')::interval),
        (pid, sid, 'assistant', 'Το check-out είναι έως τις 11:00.', 'checkin_checkout', 'el', now() - (i || ' days')::interval);
    end if;
    if i % 4 = 0 then
      insert into guest_messages (property_id, session_id, role, content, topic, language, created_at) values
        (pid, sid, 'guest', 'Which beaches are close by?', 'beaches', 'en', now() - (i || ' days')::interval),
        (pid, sid, 'assistant', 'Katakolympo is a 15-minute walk; Ammoudi is down 214 steps.', 'beaches', 'en', now() - (i || ' days')::interval);
    end if;
  end loop;

  insert into requests (property_id, category, message, status, created_at) values
    (pid, 'housekeeping', 'Χρειαζόμαστε καθαρές πετσέτες στο δωμάτιο.', 'new', now() - interval '3 hours'),
    (pid, 'taxi', 'We need a taxi to the airport tomorrow at 9am.', 'in_progress', now() - interval '1 day'),
    (pid, 'late_checkout', 'Θα θέλαμε late checkout την Κυριακή.', 'done', now() - interval '4 days');

  return pid;
end;
$$;

-- Allow signed-in users to seed a demo property for themselves only.
revoke all on function public.create_demo_property() from public;
grant execute on function public.create_demo_property() to authenticated;
