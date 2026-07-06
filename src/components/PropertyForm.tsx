"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { PROPERTY_TYPE_LABELS, type Property, type PropertyType } from "@/lib/types";
import { uniqueSlug } from "@/lib/slug";

// One form for both "create property" and "edit property".
// Pass `property` to switch to edit mode.

const EMPTY = {
  name: "",
  type: "airbnb" as PropertyType,
  area: "",
  languages: ["el", "en"],
  checkin_time: "15:00",
  checkout_time: "11:00",
  wifi_name: "",
  wifi_password: "",
  house_rules: "",
  access_instructions: "",
  phone: "",
  emergency_contact: "",
};

const LANGUAGE_OPTIONS = [
  { code: "el", label: "Ελληνικά" },
  { code: "en", label: "English" },
];

export default function PropertyForm({ property }: { property?: Property }) {
  const router = useRouter();
  const [form, setForm] = useState(property ?? EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof EMPTY>(key: K, value: (typeof EMPTY)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleLanguage(code: string) {
    const has = form.languages.includes(code);
    // Always keep at least one language selected.
    if (has && form.languages.length === 1) return;
    set("languages", has ? form.languages.filter((l) => l !== code) : [...form.languages, code]);
  }

  async function save() {
    setSaving(true);
    setError(null);
    const supabase = supabaseBrowser();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Η συνεδρία έληξε. Συνδεθείτε ξανά.");
      setSaving(false);
      return;
    }

    if (property) {
      const { error } = await supabase
        .from("properties")
        .update({ ...form })
        .eq("id", property.id);
      if (error) {
        setError(error.message);
        setSaving(false);
        return;
      }
      router.refresh();
      setSaving(false);
    } else {
      // Unique slug: transliterated name + short random suffix.
      const slug = uniqueSlug(form.name);
      const { data, error } = await supabase
        .from("properties")
        .insert({ ...form, slug, owner_id: user.id })
        .select("id")
        .single();
      if (error || !data) {
        setError(error?.message ?? "Αποτυχία δημιουργίας.");
        setSaving(false);
        return;
      }
      router.push(`/dashboard/properties/${data.id}`);
      router.refresh();
    }
  }

  return (
    <div className="card max-w-2xl">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="p-name">Όνομα καταλύματος *</label>
          <input id="p-name" className="field" value={form.name}
            onChange={(e) => set("name", e.target.value)} placeholder="π.χ. Sunset Villa" />
        </div>

        <div>
          <label className="label" htmlFor="p-type">Τύπος</label>
          <select id="p-type" className="field" value={form.type}
            onChange={(e) => set("type", e.target.value as PropertyType)}>
            {Object.entries(PROPERTY_TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="p-area">Περιοχή</label>
          <input id="p-area" className="field" value={form.area}
            onChange={(e) => set("area", e.target.value)} placeholder="π.χ. Οία, Σαντορίνη" />
        </div>

        <div className="sm:col-span-2">
          <span className="label">Γλώσσες επισκεπτών</span>
          <div className="flex gap-2">
            {LANGUAGE_OPTIONS.map(({ code, label }) => (
              <button
                key={code}
                type="button"
                onClick={() => toggleLanguage(code)}
                className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
                  form.languages.includes(code)
                    ? "bg-aegean text-white"
                    : "border border-sea/20 text-sea/60 hover:border-aegean"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label" htmlFor="p-checkin">Ώρα check-in</label>
          <input id="p-checkin" type="time" className="field" value={form.checkin_time}
            onChange={(e) => set("checkin_time", e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="p-checkout">Ώρα check-out</label>
          <input id="p-checkout" type="time" className="field" value={form.checkout_time}
            onChange={(e) => set("checkout_time", e.target.value)} />
        </div>

        <div>
          <label className="label" htmlFor="p-wifi">Όνομα WiFi</label>
          <input id="p-wifi" className="field" value={form.wifi_name}
            onChange={(e) => set("wifi_name", e.target.value)} placeholder="π.χ. Villa_5G" />
        </div>
        <div>
          <label className="label" htmlFor="p-wifipass">Κωδικός WiFi</label>
          <input id="p-wifipass" className="field" value={form.wifi_password}
            onChange={(e) => set("wifi_password", e.target.value)} />
        </div>

        <div className="sm:col-span-2">
          <label className="label" htmlFor="p-rules">Κανόνες σπιτιού</label>
          <textarea id="p-rules" className="field min-h-24" value={form.house_rules}
            onChange={(e) => set("house_rules", e.target.value)}
            placeholder={"Ησυχία μετά τις 23:00\nΌχι κάπνισμα μέσα"} />
        </div>

        <div className="sm:col-span-2">
          <label className="label" htmlFor="p-access">Οδηγίες πρόσβασης</label>
          <textarea id="p-access" className="field min-h-24" value={form.access_instructions}
            onChange={(e) => set("access_instructions", e.target.value)}
            placeholder="Πώς φτάνει ο επισκέπτης, κλειδοθήκη, κωδικοί…" />
        </div>

        <div>
          <label className="label" htmlFor="p-phone">Τηλέφωνο επικοινωνίας</label>
          <input id="p-phone" className="field" value={form.phone}
            onChange={(e) => set("phone", e.target.value)} placeholder="+30 …" />
        </div>
        <div>
          <label className="label" htmlFor="p-emergency">Emergency contact</label>
          <input id="p-emergency" className="field" value={form.emergency_contact}
            onChange={(e) => set("emergency_contact", e.target.value)} placeholder="+30 …" />
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <button onClick={save} disabled={saving || !form.name} className="btn-primary mt-6">
        {saving ? "Αποθήκευση…" : property ? "Αποθήκευση αλλαγών" : "Δημιουργία καταλύματος"}
      </button>
    </div>
  );
}
