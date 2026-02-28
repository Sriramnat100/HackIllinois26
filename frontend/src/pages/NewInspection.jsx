import InspectionWizard from "@/components/InspectionWizard";

export default function NewInspection() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950" data-testid="new-inspection-page">
      <InspectionWizard />
    </div>
  );
}
