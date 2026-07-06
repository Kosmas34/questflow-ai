import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import StatCard from "@/components/StatCard";
import LoadDemoButton from "@/components/LoadDemoButton";
import { KNOWLEDGE_CATEGORY_LABELS, REQUEST_CATEGORY_LABELS } from "@/lib/types";

export const dynamic = "force-dynamic";

// Overview: properties, guests (sessions), questions, open requests,
// most frequent questions/topics.
export default async function DashboardPage() {
  const supabase = supabaseServer();

  const { data: properties } = await supabase
    .from("properties")
    .select("id, name, slug");

  const propertyIds = (properties ?? []).map((p) => p.id);

  if (propertyIds.length === 0) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <h1 className="font-display text-3xl">Καλώς ήρθατε 👋</h1>
        <p className="mt-3 text-sea/70">
          Δεν έχετε ακόμη κατάλυμα. Δημιουργήστε το πρώτο σας ή φορτώστε το
          demo «Sunset Villa Santorini» για να δείτε την εφαρμογή γεμάτη.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link href="/dashboard/wizard" className="btn-primary">
            ✨ AI Setup Wizard — έτοιμο σε 5 λεπτά
          </Link>
          <Link href="/dashboard/properties/new" className="btn-secondary">
            Χειροκίνητη δημιουργία
          </Link>
          <LoadDemoButton />
        </div>
      </div>
    );
  }

  const [sessionsRes, guestMsgsRes, openReqRes, topicsRes] = await Promise.all([
    supabase
      .from("guest_sessions")
      .select("id", { count: "exact", head: true })
      .in("property_id", propertyIds),
    supabase
      .from("guest_messages")
      .select("id", { count: "exact", head: true })
      .in("property_id", propertyIds)
      .eq("role", "guest"),
    supabase
      .from("requests")
      .select("id, category, message, status, created_at, property_id")
      .in("property_id", propertyIds)
      .neq("status", "done")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("guest_messages")
      .select("topic, content")
      .in("property_id", propertyIds)
      .eq("role", "guest")
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  // Most frequent topics from the last 500 guest messages.
  const topicCounts = new Map<string, number>();
  for (const m of topicsRes.data ?? []) {
    topicCounts.set(m.topic, (topicCounts.get(m.topic) ?? 0) + 1);
  }
  const topTopics = [...topicCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const propertyName = new Map((properties ?? []).map((p) => [p.id, p.name]));

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-3xl">Επισκόπηση</h1>
        <Link href="/dashboard/properties/new" className="btn-primary">
          + Νέο κατάλυμα
        </Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Καταλύματα" value={properties!.length} />
        <StatCard label="Επισκέπτες μέσω QR" value={sessionsRes.count ?? 0} hint="μοναδικές συνεδρίες" />
        <StatCard label="Ερωτήσεις" value={guestMsgsRes.count ?? 0} />
        <StatCard label="Ανοιχτά αιτήματα" value={openReqRes.data?.length ?? 0} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Top topics */}
        <section className="card">
          <h2 className="font-display text-xl">Πιο συχνές ερωτήσεις</h2>
          {topTopics.length === 0 ? (
            <p className="mt-4 text-sm text-sea/60">
              Δεν υπάρχουν ακόμη ερωτήσεις επισκεπτών.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {topTopics.map(([topic, count]) => (
                <li key={topic} className="flex items-center justify-between">
                  <span>
                    {KNOWLEDGE_CATEGORY_LABELS[topic as keyof typeof KNOWLEDGE_CATEGORY_LABELS] ??
                      (topic === "other" ? "Άλλο" : topic)}
                  </span>
                  <span className="rounded-full bg-foam px-3 py-0.5 text-sm font-medium text-aegean">
                    {count}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Open requests */}
        <section className="card">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl">Ανοιχτά αιτήματα</h2>
            <Link href="/dashboard/requests" className="text-sm text-aegean hover:underline">
              Όλα τα αιτήματα →
            </Link>
          </div>
          {(openReqRes.data ?? []).length === 0 ? (
            <p className="mt-4 text-sm text-sea/60">Κανένα ανοιχτό αίτημα. 🎉</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {openReqRes.data!.map((r) => (
                <li key={r.id} className="rounded-xl bg-sand/60 px-4 py-3">
                  <p className="text-sm">{r.message}</p>
                  <p className="mt-1 text-xs text-sea/50">
                    {REQUEST_CATEGORY_LABELS[r.category] ?? r.category} ·{" "}
                    {propertyName.get(r.property_id)} ·{" "}
                    {new Date(r.created_at).toLocaleString("el-GR")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
