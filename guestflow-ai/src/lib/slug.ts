// Greek → Latin transliteration for clean guest URLs.
// Used by PropertyForm and the AI Setup Wizard.

const GREEK_MAP: Record<string, string> = {
  α: "a", β: "v", γ: "g", δ: "d", ε: "e", ζ: "z", η: "i", θ: "th",
  ι: "i", κ: "k", λ: "l", μ: "m", ν: "n", ξ: "x", ο: "o", π: "p",
  ρ: "r", σ: "s", ς: "s", τ: "t", υ: "y", φ: "f", χ: "ch", ψ: "ps", ω: "o",
};

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split("")
    .map((c) => GREEK_MAP[c] ?? c)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

/** Unique slug: transliterated name + short random suffix. */
export function uniqueSlug(name: string): string {
  return `${slugify(name) || "property"}-${Math.random().toString(36).slice(2, 8)}`;
}
