import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import GuestChat from "@/components/GuestChat";

export const dynamic = "force-dynamic";

// Public guest page — opened from the room QR code.
// Uses the admin client server-side (guests are anonymous);
// only non-sensitive fields are passed to the client.
export default async function GuestPage({ params }: { params: { slug: string } }) {
  const supabase = supabaseAdmin();
  const { data: property } = await supabase
    .from("properties")
    .select("name, slug, area, languages, welcome_message, quick_buttons")
    .eq("slug", params.slug)
    .single();

  if (!property) notFound();

  return (
    <GuestChat
      slug={property.slug}
      name={property.name}
      area={property.area}
      languages={property.languages}
      welcomeMessage={property.welcome_message ?? ""}
      quickButtons={property.quick_buttons ?? null}
    />
  );
}
