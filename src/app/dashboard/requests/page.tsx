import { supabaseServer } from "@/lib/supabase/server";
import RequestList from "@/components/RequestList";
import PageHeader from "@/components/PageHeader";
import type { GuestRequest } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function RequestsPage() {
  const supabase = supabaseServer();

  const [{ data: requests }, { data: properties }] = await Promise.all([
    supabase
      .from("requests")
      .select("*")
      .order("created_at", { ascending: false })
      .returns<GuestRequest[]>(),
    supabase.from("properties").select("id, name"),
  ]);

  const propertyNames = Object.fromEntries((properties ?? []).map((p) => [p.id, p.name]));

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Αιτήματα επισκεπτών"
        subtitle="Ό,τι ζητούν οι επισκέπτες μέσα από τον βοηθό εμφανίζεται εδώ."
      />
      <div className="mt-8">
        <RequestList initialRequests={requests ?? []} propertyNames={propertyNames} />
      </div>
    </div>
  );
}
