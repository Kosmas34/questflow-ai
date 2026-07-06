import Link from "next/link";
import { Building2, ExternalLink } from "lucide-react";
import { supabaseServer } from "@/lib/supabase/server";
import { PROPERTY_TYPE_LABELS, type PropertyType } from "@/lib/types";
import LoadDemoButton from "@/components/LoadDemoButton";

export const dynamic = "force-dynamic";

export default async function PropertiesPage() {
  const supabase = supabaseServer();
  const { data: properties } = await supabase
    .from("properties")
    .select("id, name, slug, type, area, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-3xl">Καταλύματα</h1>
        <div className="flex flex-wrap gap-3">
          <Link href="/dashboard/wizard" className="btn-primary">
            ✨ AI Setup Wizard
          </Link>
          <Link href="/dashboard/properties/new" className="btn-secondary">
            + Χειροκίνητα
          </Link>
        </div>
      </div>

      {(properties ?? []).length === 0 ? (
        <div className="card mt-8 text-center">
          <Building2 className="mx-auto h-10 w-10 text-sea/30" />
          <p className="mt-4 text-sea/70">
            Δεν έχετε ακόμη κατάλυμα. Δημιουργήστε το πρώτο σας ή δοκιμάστε το demo.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/dashboard/wizard" className="btn-primary">
              ✨ AI Setup Wizard
            </Link>
            <LoadDemoButton />
          </div>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {properties!.map((p) => (
            <div key={p.id} className="card flex flex-col">
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
