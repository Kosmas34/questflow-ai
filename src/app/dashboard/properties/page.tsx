import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { supabaseServer } from "@/lib/supabase/server";
import { PROPERTY_TYPE_LABELS, type PropertyType } from "@/lib/types";
import LoadDemoButton from "@/components/LoadDemoButton";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";

export const dynamic = "force-dynamic";

export default async function PropertiesPage() {
  const supabase = supabaseServer();
  const { data: properties } = await supabase
    .from("properties")
    .select("id, name, slug, type, area, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Καταλύματα"
        actions={
          <>
            <Link href="/dashboard/wizard" className="btn-primary">
              ✨ AI Setup Wizard
            </Link>
            <Link href="/dashboard/properties/new" className="btn-secondary">
              + Χειροκίνητα
            </Link>
          </>
        }
      />

      {(properties ?? []).length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No properties yet"
            description="Δεν έχετε ακόμη κατάλυμα. Δημιουργήστε το πρώτο σας με τον AI Setup Wizard σε λιγότερο από 5 λεπτά, ή δοκιμάστε το demo."
          >
            <Link href="/dashboard/wizard" className="btn-primary">
              Create your first property
            </Link>
            <LoadDemoButton />
          </EmptyState>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 fade-in">
          {properties!.map((p) => (
            <div key={p.id} className="card card-hover fade-in flex flex-col">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl">{p.name}</h2>
                  <p className="mt-1 text-sm text-sea/60">
                    {PROPERTY_TYPE_LABELS[p.type as PropertyType]} · {p.area}
                  </p>
                </div>
                <a
                  href={`/guest/${p.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full p-2 text-sea/50 hover:bg-sand hover:text-aegean"
                  title="Άνοιγμα guest page"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
              <p className="mt-2 truncate text-xs text-sea/40">/guest/{p.slug}</p>
              <div className="mt-4 flex gap-3">
                <Link href={`/dashboard/properties/${p.id}`} className="btn-secondary flex-1">
                  Διαχείριση
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
