import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import StatCard from "@/components/StatCard";
import LoadDemoButton from "@/components/LoadDemoButton";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import KnowledgeHealthCard from "@/components/KnowledgeHealthCard";
import InsightsCard from "@/components/InsightsCard";
import { computeInsights, computeKnowledgeHealth } from "@/lib/health";
import { KNOWLEDGE_CATEGORY_LABELS, REQUEST_CATEGORY_LABELS } from "@/lib/types";

export const dynamic = "force-dynamic";

// Overview: stats, Knowledge Health, AI Insights, top questions, open requests.
export default async function DashboardPage() {
  const supabase = supabaseServer();

  const { data: properties } = await supabase
    .from("properties")
    .select(
      "id, name, slug, wifi_name, wifi_password, house_rules, access_instructions, phone, emergency_contact, welcome_message, quick_buttons"
    );

  const propertyIds = (properties ?? []).map((p) => p.id);

  if (propertyIds.length === 0) {
    return (
      <div className="mx-auto max-w-xl py-10">
        <EmptyState
          title="Καλώς ήρθατε στο GuestFlow 👋"
          description="Δεν έχετε ακόμη κατάλυμα. Ξεκινήστε με τον AI Setup Wizard — έτοιμο σε λιγότερο από 5 λεπτά — ή φορτώστε το demo για να δείτε την εφαρμογή γεμάτη."
        >
          <Link href="/dashboard/wizard" className="btn-primary">
            ✨ AI Setup Wizard
          </Link>
          <Link href="/dashboard/properties/new" className="btn-secondary">
            Χειροκίνητη δημιουργία
          </Link>
          <LoadDemoButton />
        </EmptyState>
      </div>
    );
  }

  const [sessionsRes, guestMsgsRes, openReqRes, topicsRes, knowledgeRes] = await Promise.all([
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
      .select("topic")
      .in("property_id", propertyIds)
      .eq("role", "guest")
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("knowledge_items")
      .select("property_id, category")
      .in("property_id", propertyIds),
  ]);

  // Topic counts from the last 500 guest messages.
  const topicCounts: Record<string, number> = {};
  for (const m of topicsRes.data ?? []) {
    topicCounts[m.topic] = (topicCounts[m.topic] ?? 0) + 1;
  }
  const topTopics = Object.entries(topicCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Knowledge Health per property.
  const knowledge = knowledgeRes.data ?? [];
  const healthEntries = (properties ?? []).map((p) => {
    const cats = new Set(
      knowledge.filter((k) => k.property_id === p.id).map((k) => k.category)
    );
    return {
      propertyId: p.id,
      propertyName: p.name,
      health: computeKnowledgeHealth(p, cats),
    };
  });

  // AI Insights across all the owner's data (deterministic, no AI call).
  const allCategories = new Set(knowledge.map((k) => k.category));
  const allButtons = new Set(
    (properties ?? []).flatMap((p) => (p.quick_buttons as string[] | null) ?? [])
  );
  const insights = computeInsights(topicCounts, allCategories, allButtons);

  const propertyName = new Map((properties ?? []).map((p) => [p.id, p.name]));

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Επισκόπηση"
        actions={
          <>
            <Link href="/dashboard/wizard" className="btn-primary">
              ✨ AI Setup Wizard
            </Link>
            <Link href="/dashboard/properties/new" className="btn-secondary">
              + Νέο κατάλυμα
            </Link>
          </>
        }
      />

      <div className="fade-in mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Καταλύματα" value={properties!.length} />
        <StatCard label="Επισκέπτες μέσω QR" value={sessionsRes.count ?? 0} hint="μοναδικές συνεδρίες" />
        <StatCard label="Ερωτήσεις" value={guestMsgsRes.count ?? 0} />
        <StatCard label="Ανοιχτά αιτήματα" value={openReqRes.data?.length ?? 0} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <KnowledgeHealthCard entries={healthEntries} />
        <div className="space-y-6">
          <InsightsCard insights={insights} />

          {/* Top topics */}
          <section className="card card-hover fade-in">
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
        </div>
      </div>

      {/* Open requests */}
      <section className="card card-hover fade-in mt-6">
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
  );
}
