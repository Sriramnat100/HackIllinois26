import InspectionWizard from "@/components/InspectionWizard";

export default function NewInspection() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50" data-testid="new-inspection-page">
      <InspectionWizard />
    </div>
  );
}
