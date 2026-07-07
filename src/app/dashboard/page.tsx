import Link from "next/link";
import {
  QrCode, MessagesSquare, Bell, CheckCircle2, Gauge, Clock,
  Sparkles, TrendingUp, Wand2, Building2, MessageCircle,
} from "lucide-react";
import { supabaseServer } from "@/lib/supabase/server";
import StatCard from "@/components/StatCard";
import LoadDemoButton from "@/components/LoadDemoButton";
import EmptyState from "@/components/EmptyState";
import DashboardCard from "@/components/DashboardCard";
import KnowledgeHealthCard from "@/components/KnowledgeHealthCard";
import InsightCard from "@/components/InsightCard";
import ActivityItem from "@/components/ActivityItem";
import { Pill } from "@/components/StatusBadge";
import { computeInsights, computeKnowledgeHealth } from "@/lib/health";
import { KNOWLEDGE_CATEGORY_LABELS, REQUEST_CATEGORY_LABELS } from "@/lib/types";

export const dynamic = "force-dynamic";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Καλημέρα";
  if (h < 18) return "Καλησπέρα";
  return "Καλό βράδυ";
}

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

  const [sessionsRes, guestMsgsRes, answeredRes, openReqRes, topicsRes, knowledgeRes, recentMsgsRes, dailyRes] =
    await Promise.all([
      supabase.from("guest_sessions").select("id", { count: "exact", head: true }).in("property_id", propertyIds),
      supabase.from("guest_messages").select("id", { count: "exact", head: true }).in("property_id", propertyIds).eq("role", "guest"),
      supabase.from("guest_messages").select("id", { count: "exact", head: true }).in("property_id", propertyIds).eq("role", "assistant"),
      supabase
        .from("requests")
        .select("id, category, message, status, created_at, property_id")
        .in("property_id", propertyIds)
        .neq("status", "done")
        .order("created_at", { ascending: false })
        .limit(5),
      supabase.from("guest_messages").select("topic").in("property_id", propertyIds).eq("role", "guest").order("created_at", { ascending: false }).limit(500),
      supabase.from("knowledge_items").select("property_id, category").in("property_id", propertyIds),
      supabase.from("guest_messages").select("content, created_at, language, property_id").in("property_id", propertyIds).eq("role", "guest").order("created_at", { ascending: false }).limit(6),
      supabase.from("guest_messages").select("created_at").in("property_id", propertyIds).eq("role", "guest").order("created_at", { ascending: false }).limit(1000),
    ]);

  const topicCounts: Record<string, number> = {};
  for (const m of topicsRes.data ?? []) topicCounts[m.topic] = (topicCounts[m.topic] ?? 0) + 1;
  const topTopics = Object.entries(topicCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maxTopic = Math.max(1, ...topTopics.map(([, c]) => c));

  const knowledge = knowledgeRes.data ?? [];
  const healthEntries = (properties ?? []).map((p) => {
    const cats = new Set(knowledge.filter((k) => k.property_id === p.id).map((k) => k.category));
    return { propertyId: p.id, propertyName: p.name, health: computeKnowledgeHealth(p, cats) };
  });
  const avgHealth = Math.round(
    healthEntries.reduce((s, e) => s + e.health.percent, 0) / Math.max(1, healthEntries.length)
  );

  const allCategories = new Set(knowledge.map((k) => k.category));
  const allButtons = new Set((properties ?? []).flatMap((p) => (p.quick_buttons as string[] | null) ?? []));
  const insights = computeInsights(topicCounts, allCategories, allButtons);

  const propertyName = new Map((properties ?? []).map((p) => [p.id, p.name]));
  const totalQuestions = guestMsgsRes.count ?? 0;
  const answered = answeredRes.count ?? 0;

  const days: { label: string; count: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const count = (dailyRes.data ?? []).filter((m) => m.created_at.slice(0, 10) === key).length;
    days.push({ label: d.toLocaleDateString("el-GR", { day: "numeric" }), count });
  }
  const maxDay = Math.max(1, ...days.map((d) => d.count));

  const answerRate = totalQuestions > 0 ? Math.round((answered / totalQuestions) * 100) : 100;
  const hasActivity = totalQuestions > 0;

  return (
    <div className="mx-auto max-w-6xl">
      {/* Mission-control hero */}
      <div className="fade-in overflow-hidden rounded-card bg-gradient-to-br from-sea to-aegean-deep text-shore shadow-lift">
        <div className="flex flex-wrap items-start justify-between gap-6 p-6 md:p-8">
          <div>
            <p className="text-sm text-shore/70">{greeting()} 👋</p>
            <h1 className="mt-1 font-display text-3xl tracking-tight md:text-4xl">Hotel Mission Control</h1>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Pill tone="success">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" /> AI Assistant Active
              </Pill>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs text-shore/80">
                <Building2 className="h-3.5 w-3.5" /> {properties!.length}{" "}
                {properties!.length === 1 ? "κατάλυμα" : "καταλύματα"}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs text-shore/80">
                <Clock className="h-3.5 w-3.5" />
                {new Date().toLocaleDateString("el-GR", { day: "numeric", month: "long", year: "numeric" })}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/wizard" className="btn-primary bg-gold text-sea hover:bg-gold/90">
              <Wand2 className="h-4 w-4" /> AI Setup Wizard
            </Link>
            <Link
              href="/dashboard/properties"
              className="btn-secondary border-shore/25 bg-white/10 text-shore hover:border-gold hover:bg-white/15 hover:text-gold"
            >
              Καταλύματα
            </Link>
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="QR scans" value={sessionsRes.count ?? 0} icon={QrCode} tone="info" />
        <StatCard label="Συνομιλίες" value={sessionsRes.count ?? 0} icon={MessagesSquare} tone="info" hint="guest sessions" />
        <StatCard label="Ανοιχτά αιτήματα" value={openReqRes.data?.length ?? 0} icon={Bell} tone="gold" />
        <StatCard label="Απαντήσεις" value={answered} icon={CheckCircle2} tone="success" />
        <StatCard label="Satisfaction" value={hasActivity ? `${answerRate}%` : "—"} icon={Gauge} tone="success" hint="answer rate" />
        <StatCard label="Knowledge Health" value={`${avgHealth}%`} icon={TrendingUp} tone={avgHealth >= 80 ? "success" : "gold"} />
      </div>

      {/* Main grid */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <DashboardCard title="Επισκόπηση συνομιλιών" icon={MessagesSquare}>
            {hasActivity ? (
              <>
                <div className="flex h-40 items-end gap-1.5">
                  {days.map((d, i) => (
                    <div key={i} className="group flex flex-1 flex-col items-center gap-1">
                      <span className="text-[10px] text-sea/50 opacity-0 transition-opacity group-hover:opacity-100">{d.count}</span>
                      <div
                        className="w-full rounded-t-md bg-gradient-to-t from-aegean/70 to-aegean transition-all duration-300 group-hover:from-aegean group-hover:to-aegean-deep"
                        style={{ height: `${Math.max(4, (d.count / maxDay) * 130)}px` }}
                        title={`${d.count} ερωτήσεις`}
                      />
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-center text-xs text-sea/45">Ερωτήσεις επισκεπτών, τελευταίες 14 ημέρες</p>
              </>
            ) : (
              <div className="flex h-40 flex-col items-center justify-center text-center">
                <MessagesSquare className="h-8 w-8 text-sea/20" />
                <p className="mt-2 text-sm text-sea/50">Δεν υπάρχουν ακόμη συνομιλίες.</p>
                <p className="text-xs text-sea/40">Μόλις οι επισκέπτες σκανάρουν το QR, θα εμφανιστούν εδώ.</p>
              </div>
            )}
          </DashboardCard>

          <DashboardCard
            title="Πρόσφατα αιτήματα"
            icon={Bell}
            action={<Link href="/dashboard/requests" className="text-sm text-aegean hover:underline">Όλα →</Link>}
          >
            {(openReqRes.data ?? []).length === 0 ? (
              <p className="py-6 text-center text-sm text-sea/50">Κανένα ανοιχτό αίτημα. 🎉</p>
            ) : (
              <div className="space-y-1">
                {openReqRes.data!.map((r) => (
                  <ActivityItem
                    key={r.id}
                    icon={Bell}
                    tone="gold"
                    title={r.message}
                    meta={`${REQUEST_CATEGORY_LABELS[r.category] ?? r.category} · ${propertyName.get(r.property_id)} · ${new Date(r.created_at).toLocaleString("el-GR")}`}
                  />
                ))}
              </div>
            )}
          </DashboardCard>

          <DashboardCard title="Πρόσφατη δραστηριότητα" icon={MessageCircle}>
            {(recentMsgsRes.data ?? []).length === 0 ? (
              <p className="py-6 text-center text-sm text-sea/50">Καμία δραστηριότητα ακόμη.</p>
            ) : (
              <div className="space-y-1">
                {recentMsgsRes.data!.map((m, i) => (
                  <ActivityItem
                    key={i}
                    icon={MessageCircle}
                    tone="info"
                    title={m.content}
                    meta={`${propertyName.get(m.property_id)} · ${(m.language ?? "el").toUpperCase()} · ${new Date(m.created_at).toLocaleString("el-GR")}`}
                  />
                ))}
              </div>
            )}
          </DashboardCard>
        </div>

        <div className="space-y-6">
          <DashboardCard title="AI Insights" icon={Sparkles} className="border-gold/40 bg-gradient-to-br from-white to-gold/5">
            {insights.length === 0 ? (
              <p className="text-sm text-sea/50">Καθώς μαζεύονται ερωτήσεις επισκεπτών, θα εμφανίζονται εδώ έξυπνες προτάσεις.</p>
            ) : (
              <div className="space-y-2.5">
                {insights.map((ins) => (
                  <InsightCard key={ins.id} text={ins.text} actionLabel={ins.actionLabel} />
                ))}
              </div>
            )}
          </DashboardCard>

          <DashboardCard title="Κορυφαία θέματα" icon={TrendingUp}>
            {topTopics.length === 0 ? (
              <p className="text-sm text-sea/50">Δεν υπάρχουν ακόμη ερωτήσεις.</p>
            ) : (
              <div className="space-y-3">
                {topTopics.map(([topic, count]) => (
                  <div key={topic}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="text-sea/80">
                        {KNOWLEDGE_CATEGORY_LABELS[topic as keyof typeof KNOWLEDGE_CATEGORY_LABELS] ?? (topic === "other" ? "Άλλο" : topic)}
                      </span>
                      <span className="text-xs font-medium text-sea/50">{count}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-sand">
                      <div className="h-full rounded-full bg-aegean transition-all duration-500" style={{ width: `${(count / maxTopic) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DashboardCard>

          <KnowledgeHealthCard entries={healthEntries} />
        </div>
      </div>
    </div>
  );
}
