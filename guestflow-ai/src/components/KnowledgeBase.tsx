"use client";

import { useState } from "react";
import { Plus, Trash2, Pencil, X, Check } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";
import {
  KNOWLEDGE_CATEGORY_LABELS,
  type KnowledgeCategory,
  type KnowledgeItem,
} from "@/lib/types";

// Owner-facing knowledge base editor: add / edit / delete items per category.
export default function KnowledgeBase({
  propertyId,
  initialItems,
}: {
  propertyId: string;
  initialItems: KnowledgeItem[];
}) {
  const [items, setItems] = useState<KnowledgeItem[]>(initialItems);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ category: KnowledgeCategory; title: string; content: string }>({
    category: "wifi",
    title: "",
    content: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const categories = Object.keys(KNOWLEDGE_CATEGORY_LABELS) as KnowledgeCategory[];

  function startAdd(category?: KnowledgeCategory) {
    setDraft({ category: category ?? "wifi", title: "", content: "" });
    setEditingId(null);
    setAdding(true);
  }

  function startEdit(item: KnowledgeItem) {
    setDraft({ category: item.category, title: item.title, content: item.content });
    setAdding(false);
    setEditingId(item.id);
  }

  async function save() {
    setBusy(true);
    setError(null);
    const supabase = supabaseBrowser();

    if (editingId) {
      const { error } = await supabase
        .from("knowledge_items")
        .update({ ...draft })
        .eq("id", editingId);
      if (error) setError(error.message);
      else {
        setItems((list) => list.map((i) => (i.id === editingId ? { ...i, ...draft } : i)));
        setEditingId(null);
        toast.success("Η πληροφορία ενημερώθηκε.");
      }
    } else {
      const { data, error } = await supabase
        .from("knowledge_items")
        .insert({ ...draft, property_id: propertyId })
        .select("*")
        .single<KnowledgeItem>();
      if (error || !data) setError(error?.message ?? "Αποτυχία αποθήκευσης.");
      else {
        setItems((list) => [...list, data]);
        setAdding(false);
        toast.success("Η πληροφορία προστέθηκε.");
      }
    }
    setBusy(false);
  }

  async function remove(id: string) {
    const supabase = supabaseBrowser();
    const { error } = await supabase.from("knowledge_items").delete().eq("id", id);
    if (!error) {
      setItems((list) => list.filter((i) => i.id !== id));
      toast.success("Η πληροφορία διαγράφηκε.");
    } else {
      toast.error("Η διαγραφή απέτυχε.");
    }
  }

  const editor = (
    <div className="card border-aegean/40">
      <div className="grid gap-4">
        <div>
          <label className="label" htmlFor="kb-cat">Κατηγορία</label>
          <select
            id="kb-cat"
            className="field"
            value={draft.category}
            onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value as KnowledgeCategory }))}
          >
            {categories.map((c) => (
              <option key={c} value={c}>{KNOWLEDGE_CATEGORY_LABELS[c]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="kb-title">Τίτλος</label>
          <input
            id="kb-title"
            className="field"
            value={draft.title}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            placeholder="π.χ. Πετσέτες θαλάσσης"
          />
        </div>
        <div>
          <label className="label" htmlFor="kb-content">Πληροφορία</label>
          <textarea
            id="kb-content"
            className="field min-h-28"
            value={draft.content}
            onChange={(e) => setDraft((d) => ({ ...d, content: e.target.value }))}
            placeholder="Γράψτε την πληροφορία όπως θα τη λέγατε στον επισκέπτη…"
          />
        </div>
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <div className="mt-4 flex gap-3">
        <button onClick={save} disabled={busy || !draft.title || !draft.content} className="btn-primary">
          <Check className="h-4 w-4" /> Αποθήκευση
        </button>
        <button
          onClick={() => { setAdding(false); setEditingId(null); }}
          className="btn-secondary"
        >
          <X className="h-4 w-4" /> Άκυρο
        </button>
      </div>
    </div>
  );

  // Group items by category for display.
  const grouped = categories
    .map((c) => ({ category: c, items: items.filter((i) => i.category === c) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="space-y-6">
      {!adding && !editingId && (
        <button onClick={() => startAdd()} className="btn-primary">
          <Plus className="h-4 w-4" /> Προσθήκη πληροφορίας
        </button>
      )}

      {adding && editor}

      {items.length === 0 && !adding && (
        <div className="card text-center text-sm text-sea/60">
          Δεν υπάρχουν ακόμη πληροφορίες. Ξεκινήστε με WiFi, check-in/out και
          2–3 προτάσεις για φαγητό — αυτά ρωτάνε πρώτα οι επισκέπτες.
        </div>
      )}

      {grouped.map(({ category, items: catItems }) => (
        <section key={category}>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-sea/50">
            {KNOWLEDGE_CATEGORY_LABELS[category]}
          </h3>
          <div className="space-y-2">
            {catItems.map((item) =>
              editingId === item.id ? (
                <div key={item.id}>{editor}</div>
              ) : (
                <div key={item.id} className="card flex items-start justify-between gap-4 py-4">
                  <div className="min-w-0">
                    <p className="font-medium">{item.title}</p>
                    <p className="mt-1 whitespace-pre-line text-sm text-sea/70">{item.content}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() => startEdit(item)}
                      className="rounded-full p-2 text-sea/50 hover:bg-sand hover:text-aegean"
                      title="Επεξεργασία"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => remove(item.id)}
                      className="rounded-full p-2 text-sea/50 hover:bg-red-50 hover:text-red-600"
                      title="Διαγραφή"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
