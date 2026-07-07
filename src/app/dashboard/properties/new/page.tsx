import { Wand2 } from "lucide-react";
import PropertyForm from "@/components/PropertyForm";
import PageHeader from "@/components/PageHeader";
import PremiumButton from "@/components/PremiumButton";
import DashboardCard from "@/components/DashboardCard";

export default function NewPropertyPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Νέο κατάλυμα"
        subtitle="Συμπληρώστε τα βασικά στοιχεία. Μετά τη δημιουργία μπορείτε να προσθέσετε πληροφορίες στη βάση γνώσης και να τυπώσετε το QR."
        actions={
          <PremiumButton href="/dashboard/wizard" variant="secondary" icon={Wand2}>
            AI Setup Wizard
          </PremiumButton>
        }
      />
      <div className="mt-8">
        <DashboardCard>
          <PropertyForm />
        </DashboardCard>
      </div>
    </div>
  );
}
