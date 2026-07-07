import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import PropertyTabs from "@/components/property/PropertyTabs";
import { computeKnowledgeHealth } from "@/lib/health";
import type { GuestRequest, KnowledgeItem, Property } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PropertyDetailPage({ params }: { params: { id: string } }) {
  const supabase = supabaseServer();

  const { data: property } = await supabase
    .from("properties")
    .select("*")
    .eq("id", params.id)
    .single<Property>();

  if (!property) notFound();

  const [itemsRes, sessionsRes, answeredRes, requestsRes, topicsRes] = await Promise.all([
    supabase.from("knowledge_items").select("*").eq("property_id", property.id).order("created_at", { ascending: true }).returns<KnowledgeItem[]>(),
    supabase.from("guest_sessions").select("id", { count: "exact", head: true }).eq("property_id", property.id),
    supabase.from("guest_messages").select("id", { count: "exact", head: true }).eq("property_id", property.id).eq("role", "assistant"),
    supabase.from("requests").select("*").eq("property_id", property.id).order("created_at", { ascending: false }).returns<GuestRequest[]>(),
    supabase.from("guest_messages").select("topic").eq("property_id", property.id).eq("role", "guest").limit(500),
  ]);

  const items = itemsRes.data ?? [];
  const requests = requestsRes.data ?? [];

  // Knowledge health
  const cats = new Set(items.map((i) => i.category));
  const health = computeKnowledgeHealth(property, cats);

  // Top guest need
  const topicCounts: Record<string, number> = {};
  for (const m of topicsRes.data ?? []) topicCounts[m.topic] = (topicCounts[m.topic] ?? 0) + 1;
  const topTopics = Object.entries(topicCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const stats = {
    scans: sessionsRes.count ?? 0,
    answered: answeredRes.count ?? 0,
    openRequests: requests.filter((r) => r.status !== "done").length,
    healthPercent: health.percent,
    topNeed: topTopics[0]?.[0] ?? null,
  };

  return (
    <PropertyTabs
      property={property}
      initialItems={items}
      requests={requests}
      stats={stats}
      topTopics={topTopics}
      healthMissing={health.missing.map((m) => m.label)}
    />
  );
}
