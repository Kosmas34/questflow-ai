import PropertyForm from "@/components/PropertyForm";

export default function NewPropertyPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="font-display text-3xl">Νέο κατάλυμα</h1>
      <p className="mt-2 text-sea/70">
        Συμπληρώστε τα βασικά στοιχεία. Μετά τη δημιουργία μπορείτε να
        προσθέσετε πληροφορίες στη βάση γνώσης και να τυπώσετε το QR.
      </p>
      <div className="mt-8">
        <PropertyForm />
      </div>
    </div>
  );
}
