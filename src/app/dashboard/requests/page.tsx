import { supabaseServer } from "@/lib/supabase/server";
import RequestList from "@/components/RequestList";
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
      <h1 className="font-display text-3xl">Αιτήματα επισκεπτών</h1>
      <p className="mt-2 text-sea/70">
        Ό,τι ζητούν οι επισκέπτες μέσα από τον βοηθό εμφανίζεται εδώ.
      </p>
      <div className="mt-8">
        <RequestList initialRequests={requests ?? []} propertyNames={propertyNames} />
      </div>
    </div>
  );
}
