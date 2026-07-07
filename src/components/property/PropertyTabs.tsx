"use client";

// Tabbed property management page. Presentational shell + tab switching;
// all existing feature components (PropertyForm, KnowledgeBase, QrSection,
// RequestList) are reused unchanged inside the tabs.

import { useState } from "react";
import Link from "next/link";
import {
  ExternalLink, Download, Settings, QrCode as QrIcon, Bell,
  BookOpen, MessageCircle, LayoutGrid, CheckCircle2, TrendingUp,
  Sparkles, Wifi, LogOut, Car, UtensilsCrossed, Waves, LifeBuoy,
} from "lucide-react";
import PropertyForm from "@/components/PropertyForm";
import KnowledgeBase from "@/components/KnowledgeBase";
import QrSection from "@/components/QrSection";
import RequestList from "@/components/RequestList";
import DashboardCard from "@/components/DashboardCard";
import StatCard from "@/components/StatCard";
import SectionTitle from "@/components/SectionTitle";
import ActivityItem from "@/components/ActivityItem";
import MobilePreviewFrame from "@/components/MobilePreviewFrame";
import { Pill } from "@/components/StatusBadge";
import {
  KNOWLEDGE_CATEGORY_LABELS, PROPERTY_TYPE_LABELS,
  type GuestRequest, type KnowledgeItem, type Property,
} from "@/lib/types";

type TabKey = "overview" | "assistant" | "knowledge" | "rooms" | "requests" | "settings";

const TABS: { key: TabKey; label: string; icon: typeof BookOpen }[] = [
  { key: "overview", label: "Overview", icon: LayoutGrid },
  { key: "assistant", label: "Guest Assistant", icon: MessageCircle },
  { key: "knowledge", label: "Knowledge Base", icon: BookOpen },
  { key: "rooms", label: "Rooms & QR", icon: QrIcon },
  { key: "requests", label: "Requests", icon: Bell },
  { key: "settings", label: "Settings", icon: Settings },
];

const topicLabel = (t: string | null) =>
  t ? KNOWLEDGE_CATEGORY_LABELS[t as keyof typeof KNOWLEDGE_CATEGORY_LABELS] ?? (t === "other" ? "Άλλο" : t) : "—";

export default function PropertyTabs({
  property,
  initialItems,
  requests,
  stats,
  topTopics,
  healthMissing,
}: {
  property: Property;
  initialItems: KnowledgeItem[];
  requests: GuestRequest[];
  stats: { scans: number; answered: number; openRequests: number; healthPercent: number; topNeed: string | null };
  topTopics: [string, number][];
  healthMissing: string[];
}) {
  const [tab, setTab] = useState<TabKey>("overview");
  const propertyNames = { [property.id]: property.name };

  return (
    <div className="mx-auto max-w-5xl">
      {/* ---------- Header ---------- */}
      <div className="fade-in overflow-hidden rounded-card bg-gradient-to-br from-sea to-aegean-deep text-shore shadow-lift">
        <div className="flex flex-wrap items-start justify-between gap-5 p-6 md:p-7">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl tracking-tight md:text-3xl">{property.name}</h1>
              <Pill tone="success">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" /> AI Assistant Active
              </Pill>
            </div>
            <p className="mt-1.5 text-sm text-shore/70">
              {PROPERTY_TYPE_LABELS[property.type]}
              {property.area ? ` · ${property.area}` : ""}
            </p>
            <p className="mt-2 font-mono text-xs text-shore/50">/guest/{property.slug}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={`/guest/${property.slug}`} target="_blank" rel="noreferrer" className="btn-primary bg-gold text-sea hover:bg-gold/90">
              <ExternalLink className="h-4 w-4" /> Open Guest Page
            </a>
            <a href={`/api/properties/${property.id}/qr-card`} download className="btn-secondary border-shore/25 bg-white/10 text-shore hover:border-gold hover:bg-white/15 hover:text-gold">
              <Download className="h-4 w-4" /> Download QR
            </a>
            <button onClick={() => setTab("settings")} className="btn-secondary border-shore/25 bg-white/10 text-shore hover:border-gold hover:bg-white/15 hover:text-gold">
              <Settings className="h-4 w-4" /> Edit Settings
            </button>
          </div>
        </div>
      </div>

      {/* ---------- KPI cards ---------- */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="QR scans" value={stats.scans} icon={QrIcon} tone="info" />
        <StatCard label="Απαντήσεις" value={stats.answered} icon={CheckCircle2} tone="success" />
        <StatCard label="Ανοιχτά αιτήματα" value={stats.openRequests} icon={Bell} tone="gold" />
        <StatCard label="Knowledge Health" value={`${stats.healthPercent}%`} icon={TrendingUp} tone={stats.healthPercent >= 80 ? "success" : "gold"} />
        <StatCard label="Top guest need" value={topicLabel(stats.topNeed)} icon={Sparkles} tone="neutral" />
      </div>

      {/* ---------- Tabs ---------- */}
      <div className="mt-6 border-b border-sea/10">
        <div className="flex gap-1 overflow-x-auto [scrollbar-width:none]">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                tab === key
                  ? "border-aegean text-aegean"
                  : "border-transparent text-sea/55 hover:text-sea"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
              {key === "requests" && stats.openRequests > 0 && (
                <span className="rounded-full bg-gold/20 px-1.5 text-xs font-semibold text-yellow-800">{stats.openRequests}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ---------- Panels ---------- */}
      <div className="mt-6">
        {tab === "overview" && (
          <OverviewTab property={property} requests={requests} topTopics={topTopics} healthMissing={healthMissing} onGoTo={setTab} />
        )}
        {tab === "assistant" && <AssistantTab property={property} />}
        {tab === "knowledge" && (
          <KnowledgeTab property={property} initialItems={initialItems} />
        )}
        {tab === "rooms" && <QrSection propertyId={property.id} slug={property.slug} />}
        {tab === "requests" && (
          <div className="fade-in">
            {requests.length === 0 ? (
              <DashboardCard title="Αιτήματα" icon={Bell}>
                <p className="py-6 text-center text-sm text-sea/50">Δεν υπάρχουν αιτήματα ακόμη.</p>
              </DashboardCard>
            ) : (
              <RequestList initialRequests={requests} propertyNames={propertyNames} />
            )}
          </div>
        )}
        {tab === "settings" && (
          <DashboardCard title="Ρυθμίσεις καταλύματος" icon={Settings} className="fade-in">
            <p className="mb-5 text-sm text-sea/55">
              Επεξεργαστείτε τα βασικά στοιχεία του καταλύματος. Οι αλλαγές εφαρμόζονται άμεσα στον AI βοηθό.
            </p>
            <PropertyForm property={property} />
          </DashboardCard>
        )}
      </div>
    </div>
  );
}

// ---------------- Overview ----------------
function OverviewTab({
  property, requests, topTopics, healthMissing, onGoTo,
}: {
  property: Property;
  requests: GuestRequest[];
  topTopics: [string, number][];
  healthMissing: string[];
  onGoTo: (t: TabKey) => void;
}) {
  const openReqs = requests.filter((r) => r.status !== "done").slice(0, 4);
  const maxTopic = Math.max(1, ...topTopics.map(([, c]) => c));

  return (
    <div className="fade-in grid gap-6 lg:grid-cols-2">
      <DashboardCard title="Σύνοψη" icon={LayoutGrid}>
        <div className="space-y-3 text-sm">
          <Row label="Check-in" value={property.checkin_time || "—"} />
          <Row label="Check-out" value={property.checkout_time || "—"} />
          <Row label="WiFi" value={property.wifi_name || "—"} />
          <Row label="Τηλέφωνο" value={property.phone || "—"} />
          <Row label="Γλώσσες" value={(property.languages ?? []).map((l) => l.toUpperCase()).join(", ") || "—"} />
        </div>
      </DashboardCard>

      <DashboardCard title="Κορυφαίες ερωτήσεις" icon={TrendingUp}>
        {topTopics.length === 0 ? (
          <p className="text-sm text-sea/50">Δεν υπάρχουν ακόμη ερωτήσεις επισκεπτών.</p>
        ) : (
          <div className="space-y-3">
            {topTopics.map(([topic, count]) => (
              <div key={topic}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-sea/80">{topicLabel(topic)}</span>
                  <span className="text-xs font-medium text-sea/50">{count}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-sand">
                  <div className="h-full rounded-full bg-aegean" style={{ width: `${(count / maxTopic) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </DashboardCard>

      <DashboardCard
        title="Ανοιχτά αιτήματα"
        icon={Bell}
        action={<button onClick={() => onGoTo("requests")} className="text-sm text-aegean hover:underline">Όλα →</button>}
      >
        {openReqs.length === 0 ? (
          <p className="py-4 text-center text-sm text-sea/50">Κανένα ανοιχτό αίτημα. 🎉</p>
        ) : (
          <div className="space-y-1">
            {openReqs.map((r) => (
              <ActivityItem key={r.id} icon={Bell} tone="gold" title={r.message} meta={new Date(r.created_at).toLocaleString("el-GR")} />
            ))}
          </div>
        )}
      </DashboardCard>

      <DashboardCard title="AI προτάσεις" icon={Sparkles} className="border-gold/40 bg-gradient-to-br from-white to-gold/5">
        {healthMissing.length === 0 ? (
          <p className="text-sm text-sea/60">Η βάση γνώσης είναι πλήρης — εξαιρετική δουλειά. ✓</p>
        ) : (
          <>
            <p className="text-sm text-sea/70">Για πληρέστερες απαντήσεις, προσθέστε πληροφορίες για:</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {healthMissing.map((m) => (
                <span key={m} className="rounded-full border border-sea/15 bg-white/70 px-2.5 py-0.5 text-xs text-sea/70">{m}</span>
              ))}
            </div>
            <button onClick={() => onGoTo("knowledge")} className="btn-secondary mt-4 px-4 py-1.5 text-sm">
              Συμπλήρωση γνώσης →
            </button>
          </>
        )}
      </DashboardCard>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-sea/5 pb-2 last:border-0">
      <span className="text-sea/55">{label}</span>
      <span className="font-medium text-sea">{value}</span>
    </div>
  );
}

// ---------------- Guest Assistant (preview) ----------------
function AssistantTab({ property }: { property: Property }) {
  const buttons = (property.quick_buttons as string[] | null) ?? ["wifi", "checkout", "taxi", "restaurants", "beaches", "help"];
  const QUICK: Record<string, { icon: typeof Wifi; label: string }> = {
    wifi: { icon: Wifi, label: "WiFi" },
    checkout: { icon: LogOut, label: "Check-out" },
    taxi: { icon: Car, label: "Ταξί" },
    restaurants: { icon: UtensilsCrossed, label: "Εστιατόρια" },
    beaches: { icon: Waves, label: "Παραλίες" },
    help: { icon: LifeBuoy, label: "Βοήθεια" },
  };

  return (
    <div className="fade-in grid gap-6 lg:grid-cols-2">
      <div>
        <SectionTitle>Live preview</SectionTitle>
        <p className="mb-4 mt-1 text-sm text-sea/55">Έτσι βλέπει ο επισκέπτης τον βοηθό στο κινητό του.</p>
        <MobilePreviewFrame>
          <div className="flex h-full flex-col">
            <div className="bg-gradient-to-br from-sea to-aegean-deep px-4 pb-4 pt-5 text-shore">
              <p className="font-display text-lg leading-tight">{property.name}</p>
              {property.area && <p className="text-xs text-shore/70">{property.area}</p>}
            </div>
            <div className="flex-1 space-y-2 overflow-hidden px-3 py-3">
              <div className="w-fit max-w-[85%] rounded-2xl rounded-bl-sm bg-foam px-3 py-2 text-xs">
                {property.welcome_message?.trim() || "Γεια σας! Πώς μπορώ να βοηθήσω με τη διαμονή σας;"}
              </div>
              <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-aegean px-3 py-2 text-xs text-white">
                Ποιος είναι ο κωδικός WiFi;
              </div>
              {property.wifi_name && (
                <div className="w-fit max-w-[85%] rounded-2xl rounded-bl-sm bg-foam px-3 py-2 text-xs">
                  Το WiFi είναι: {property.wifi_name}. Ο κωδικός είναι: {property.wifi_password || "—"}.
                </div>
              )}
            </div>
            <div className="flex gap-1.5 overflow-hidden px-3 pb-2">
              {buttons.slice(0, 3).map((b) => (
                <span key={b} className="whitespace-nowrap rounded-full border border-sea/15 px-2.5 py-1 text-[10px] text-sea/70">
                  {QUICK[b]?.label ?? b}
                </span>
              ))}
            </div>
            <div className="border-t border-sea/10 px-3 py-2.5">
              <div className="rounded-full bg-sand/60 px-3 py-2 text-[11px] text-sea/40">Γράψτε την ερώτησή σας…</div>
            </div>
          </div>
        </MobilePreviewFrame>
      </div>

      <div className="space-y-6">
        <DashboardCard title="Quick actions" icon={LayoutGrid}>
          <p className="mb-4 text-sm text-sea/55">Τα κουμπιά γρήγορων ερωτήσεων που βλέπει ο επισκέπτης.</p>
          <div className="grid grid-cols-2 gap-2">
            {buttons.map((b) => {
              const q = QUICK[b];
              if (!q) return null;
              const Icon = q.icon;
              return (
                <div key={b} className="flex items-center gap-2 rounded-xl border border-sea/10 bg-sand/40 px-3 py-2.5 text-sm">
                  <Icon className="h-4 w-4 text-aegean" />
                  {q.label}
                </div>
              );
            })}
          </div>
        </DashboardCard>

        <DashboardCard title="Welcome message" icon={MessageCircle}>
          <p className="rounded-xl bg-sand/50 px-4 py-3 text-sm text-sea/80">
            {property.welcome_message?.trim() || "Δεν έχει οριστεί μήνυμα καλωσορίσματος — χρησιμοποιείται το προεπιλεγμένο."}
          </p>
        </DashboardCard>
      </div>
    </div>
  );
}

// ---------------- Knowledge Base (cards per category) ----------------
function KnowledgeTab({ property, initialItems }: { property: Property; initialItems: KnowledgeItem[] }) {
  const byCategory = new Map<string, number>();
  for (const it of initialItems) byCategory.set(it.category, (byCategory.get(it.category) ?? 0) + 1);

  return (
    <div className="fade-in space-y-6">
      {/* category overview cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(Object.keys(KNOWLEDGE_CATEGORY_LABELS) as (keyof typeof KNOWLEDGE_CATEGORY_LABELS)[]).map((cat) => {
          const count = byCategory.get(cat) ?? 0;
          return (
            <div
              key={cat}
              className={`rounded-xl border p-4 transition-all ${
                count > 0 ? "border-aegean/20 bg-white shadow-soft" : "border-dashed border-sea/15 bg-sand/30"
              }`}
            >
              <p className="text-sm font-medium text-sea">{KNOWLEDGE_CATEGORY_LABELS[cat]}</p>
              <p className={`mt-1 text-xs ${count > 0 ? "text-aegean" : "text-sea/40"}`}>
                {count > 0 ? `${count} ${count === 1 ? "καταχώρηση" : "καταχωρήσεις"}` : "Κενό"}
              </p>
            </div>
          );
        })}
      </div>

      <DashboardCard title="Διαχείριση γνώσης" icon={BookOpen}>
        <p className="mb-4 text-sm text-sea/55">
          Ο AI βοηθός απαντά με βάση αυτές τις πληροφορίες. Όσο πιο πλήρεις, τόσο καλύτερες οι απαντήσεις.
        </p>
        <KnowledgeBase propertyId={property.id} initialItems={initialItems} />
      </DashboardCard>
    </div>
  );
}
