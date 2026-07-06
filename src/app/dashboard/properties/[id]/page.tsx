import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import PropertyForm from "@/components/PropertyForm";
import KnowledgeBase from "@/components/KnowledgeBase";
import QrSection from "@/components/QrSection";
import type { KnowledgeItem, Property } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PropertyDetailPage({ params }: { params: { id: string } }) {
  const supabase = supabaseServer();

  const { data: property } = await supabase
    .from("properties")
    .select("*")
    .eq("id", params.id)
    .single<Property>();

  if (!property) notFound();

  const { data: items } = await supabase
    .from("knowledge_items")
    .select("*")
    .eq("property_id", property.id)
    .order("created_at", { ascending: true })
    .returns<KnowledgeItem[]>();

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="font-display text-3xl">{property.name}</h1>
      <p className="mt-1 text-sea/60">
        Guest page: <span className="font-mono text-sm">/guest/{property.slug}</span>
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-10">
          <section>
            <h2 className="mb-4 font-display text-2xl">Στοιχεία καταλύματος</h2>
            <PropertyForm property={property} />
          </section>

          <section>
            <h2 className="mb-1 font-display text-2xl">Βάση γνώσης</h2>
            <p className="mb-4 text-sm text-sea/60">
              Ο AI βοηθός απαντά <b>μόνο</b> με βάση αυτές τις πληροφορίες.
              Όσο πιο πλήρεις είναι, τόσο καλύτερες οι απαντήσεις.
            </p>
            <KnowledgeBase propertyId={property.id} initialItems={items ?? []} />
          </section>
        </div>

        <div>
          <QrSection propertyId={property.id} slug={property.slug} />
        </div>
      </div>
    </div>
  );
}
