import { supabaseServer } from "@/lib/supabase/server";
import StatCard from "@/components/StatCard";
import BarRow from "@/components/BarRow";
import PageHeader from "@/components/PageHeader";
import {
  KNOWLEDGE_CATEGORY_LABELS,
  REQUEST_CATEGORY_LABELS,
} from "@/lib/types";

export const dynamic = "force-dynamic";

function countBy<T>(rows: T[], key: (row: T) => string): [string, number][] {
  const map = new Map<string, number>();
  for (const row of rows) {
    const k = key(row);
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

export default async function AnalyticsPage() {
  const supabase = supabaseServer();

  const [{ data: messages }, { data: requests }, { data: sessions }] = await Promise.all([
    supabase
      .from("guest_messages")
      .select("topic, language, created_at, role")
      .eq("role", "guest")
      .order("created_at", { ascending: false })
      .limit(2000),
    supabase.from("requests").select("category"),
    supabase.from("guest_sessions").select("id, language", { count: "exact" }),
  ]);

  const guestMessages = messages ?? [];
  const totalQuestions = guestMessages.length;

  const topics = countBy(guestMessages, (m) => m.topic);
  const languages = countBy(sessions ?? [], (s) => s.language);
  const requestCats = countBy(requests ?? [], (r) => r.category);

  // Usage per day, last 14 days.
  const days: { label: string; count: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayKey = d.toISOString().slice(0, 10);
    const count = guestMessages.filter((m) => m.created_at.slice(0, 10) === dayKey).length;
    days.push({
      label: d.toLocaleDateString("el-GR", { day: "numeric", month: "short" }),
      count,
    });
  }
  const maxDay = Math.max(1, ...days.map((d) => d.count));
  const maxTopic = Math.max(1, ...topics.map(([, c]) => c));
  const maxReq = Math.max(1, ...requestCats.map(([, c]) => c));

  const topicLabel = (t: string) =>
    KNOWLEDGE_CATEGORY_LABELS[t as keyof typeof KNOWLEDGE_CATEGORY_LABELS] ??
    (t === "other" ? "Άλλο" : t);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Analytics" subtitle="Τι ρωτούν οι επισκέπτες σας και πότε." />

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <StatCard label="Συνολικές ερωτήσεις" value={totalQuestions} />
        <StatCard label="Συνεδρίες επισκεπτών" value={sessions?.length ?? 0} />
        <StatCard label="Αιτήματα" value={requests?.length ?? 0} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Topics */}
        <section className="card card-hover fade-in">
          <h2 className="font-display text-xl">Συχνότερα θέματα</h2>
          <div className="mt-5 space-y-3">
            {topics.length === 0 && <p className="text-sm text-sea/60">Χωρίς δεδομένα ακόμη.</p>}
            {topics.slice(0, 8).map(([topic, count]) => (
              <BarRow key={topic} label={topicLabel(topic)} value={count} max={maxTopic} />
            ))}
          </div>
        </section>

        {/* Languages */}
        <section className="card card-hover fade-in">
          <h2 className="font-display text-xl">Γλώσσες επισκεπτών</h2>
          <div className="mt-5 space-y-3">
            {languages.length === 0 && <p className="text-sm text-sea/60">Χωρίς δεδομένα ακόμη.</p>}
            {languages.map(([l, count]) => (
              <BarRow
                key={l}
                label={l === "el" ? "Ελληνικά" : l === "en" ? "English" : l}
                value={count}
                max={Math.max(1, ...languages.map(([, c]) => c))}
              />
            ))}
          </div>
        </section>

        {/* Requests per category */}
        <section className="card card-hover fade-in">
          <h2 className="font-display text-xl">Αιτήματα ανά κατηγορία</h2>
          <div className="mt-5 space-y-3">
            {requestCats.length === 0 && <p className="text-sm text-sea/60">Χωρίς δεδομένα ακόμη.</p>}
            {requestCats.map(([cat, count]) => (
              <BarRow
                key={cat}
                label={REQUEST_CATEGORY_LABELS[cat] ?? cat}
                value={count}
                max={maxReq}
              />
            ))}
          </div>
        </section>

        {/* Usage per day */}
        <section className="card card-hover fade-in">
          <h2 className="font-display text-xl">Χρήση ανά ημέρα</h2>
          <p className="mt-1 text-xs text-sea/50">Ερωτήσεις επισκεπτών, τελευταίες 14 ημέρες</p>
          <div className="mt-5 flex h-40 items-end gap-1.5">
            {days.map((d, i) => (
              <div key={i} className="group flex flex-1 flex-col items-center gap-1">
                <span className="text-[10px] text-sea/60 opacity-0 transition-opacity group-hover:opacity-100">
                  {d.count}
                </span>
                <div
                  className="w-full rounded-t bg-aegean/80 transition-colors group-hover:bg-aegean"
                  style={{ height: `${Math.max(4, (d.count / maxDay) * 120)}px` }}
                  title={`${d.label}: ${d.count}`}
                />
                <span className="hidden text-[9px] text-sea/40 sm:block">{d.label}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
