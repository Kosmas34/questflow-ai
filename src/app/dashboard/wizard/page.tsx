import WizardClient from "./WizardClient";

// Server wrapper: reads ?property=<id> (Smart Merge / import mode)
// and hands it to the client wizard.
export default function WizardPage({
  searchParams,
}: {
  searchParams: { property?: string };
}) {
  return <WizardClient importPropertyId={searchParams.property ?? null} />;
}
