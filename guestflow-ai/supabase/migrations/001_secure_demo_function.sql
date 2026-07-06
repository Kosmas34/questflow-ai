-- ============================================================
-- Migration 001 — security hardening for existing installs.
-- If you already ran an older schema.sql, run THIS file once.
-- Fresh installs only need the updated schema.sql.
-- ============================================================

-- Remove the old function that accepted an arbitrary owner uuid.
drop function if exists public.create_demo_property(uuid);

-- Recreate without arguments: always seeds for the signed-in user.
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

revoke all on function public.create_demo_property() from public;
grant execute on function public.create_demo_property() to authenticated;
