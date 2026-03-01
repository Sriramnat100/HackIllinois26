import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Check, ChevronLeft, ChevronRight, ClipboardCheck, Shield, Wrench, Truck, MapPin, Building2, Play, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import axios from "axios";
import { toast } from "sonner";
import { API_URL } from "@/config";

const EQUIPMENT_OPTIONS = [
  { model: "CAT 320 Excavator", serial: "CAT0320X", type: "Excavator" },
  { model: "CAT 336 Excavator", serial: "CAT0336X", type: "Excavator" },
  { model: "CAT D6 Dozer", serial: "CAT0D6X", type: "Dozer" },
  { model: "CAT D8 Dozer", serial: "CAT0D8X", type: "Dozer" },
  { model: "CAT 966 Wheel Loader", serial: "CAT0966X", type: "Wheel Loader" },
  { model: "CAT 980 Wheel Loader", serial: "CAT0980X", type: "Wheel Loader" },
  { model: "CAT 745 Articulated Truck", serial: "CAT0745X", type: "Articulated Truck" },
];

const INSPECTION_TYPES = [
  {
    id: "daily-walkaround",
    name: "Daily Walkaround",
    description: "Quick daily check of critical systems and safety items",
    icon: ClipboardCheck,
    duration: "15-20 min",
    items: "24 checkpoints",
  },
  {
    id: "safety",
    name: "Safety Inspection",
    description: "Comprehensive safety compliance assessment",
    icon: Shield,
    duration: "45-60 min",
    items: "56 checkpoints",
  },
  {
    id: "ta1",
    name: "TA1 Assessment",
    description: "Technical assessment level 1 - detailed component review",
    icon: Wrench,
    duration: "2-3 hours",
    items: "120+ checkpoints",
  },
];

const steps = [
  { id: 1, name: "Equipment", description: "Select equipment" },
  { id: 2, name: "Type", description: "Choose inspection" },
  { id: 3, name: "Review", description: "Confirm & start" },
];

export const InspectionWizard = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [equipmentOptions, setEquipmentOptions] = useState(EQUIPMENT_OPTIONS);
  const [addEquipmentOpen, setAddEquipmentOpen] = useState(false);
  const [newEquipmentModel, setNewEquipmentModel] = useState("");
  const [newEquipmentSerialPrefix, setNewEquipmentSerialPrefix] = useState("CUSTOM");
  const [formData, setFormData] = useState({
    equipment_model: "",
    serial_number: "",
    customer: "",
    location: "",
    inspection_type: "",
  });

  const handleEquipmentSelect = (model) => {
    const equipment = equipmentOptions.find((e) => e.model === model);
    if (equipment) {
      setFormData((prev) => ({
        ...prev,
        equipment_model: equipment.model,
        serial_number: equipment.serial + Math.random().toString().slice(2, 7),
      }));
    }
  };

  const handleAddEquipment = (e) => {
    e.preventDefault();
    const model = newEquipmentModel.trim();
    if (!model) return;
    const prefix = newEquipmentSerialPrefix.trim() || "CUSTOM";
    const serial = prefix + Math.random().toString().slice(2, 7);
    const newEntry = { model, serial: prefix, type: "Other" };
    setEquipmentOptions((prev) => [...prev, newEntry]);
    setFormData((prev) => ({
      ...prev,
      equipment_model: model,
      serial_number: serial,
    }));
    setNewEquipmentModel("");
    setNewEquipmentSerialPrefix("CUSTOM");
    setAddEquipmentOpen(false);
  };

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    } else {
      startInspection();
    }
  };

  const startInspection = async () => {
    try {
      const response = await axios.post(`${API_URL}/inspections`, {
        equipment_model: formData.equipment_model,
        serial_number: formData.serial_number,
        customer: formData.customer,
        location: formData.location,
        inspection_type: formData.inspection_type,
      });
      const inspectionId = response.data?.id;
      if (inspectionId) {
        navigate(`/app/inspections/${inspectionId}/live`);
        return;
      }
    } catch (error) {
      console.error("Error creating inspection:", error);
      toast.error("Backend unavailable — opening live inspection without saving. Report may not load after finishing.");
    }
    // Fallback: use client-side id so user can still use live flow (detail may show "not found" later)
    const fallbackId = `insp-${Date.now().toString(36)}`;
    navigate(`/app/inspections/${fallbackId}/live`);
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.equipment_model && formData.customer && formData.location;
      case 2:
        return formData.inspection_type;
      case 3:
        return true;
      default:
        return false;
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 page-enter">
      {/* Stepper */}
      <div className="mb-10">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "icon-glass w-11 h-11 rounded-xl flex items-center justify-center text-[14px] font-bold transition-all duration-200",
                    currentStep > step.id
                      ? "!bg-emerald-500/90 !border-emerald-400/50 text-white shadow-md"
                      : currentStep === step.id
                      ? "icon-glass-amber !bg-[#F7B500]/90 text-slate-900 shadow-md"
                      : "text-slate-400 dark:text-white/90"
                  )}
                  data-testid={`wizard-step-${step.id}`}
                >
                  {currentStep > step.id ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    step.id
                  )}
                </div>
                <span
                  className={cn(
                    "mt-2 text-[13px] font-semibold",
                    currentStep >= step.id ? "text-slate-900 dark:text-white" : "text-slate-400 dark:text-white/90"
                  )}
                >
                  {step.name}
                </span>
                <span className={cn(
                  "text-[11px]",
                  currentStep >= step.id ? "text-slate-500 dark:text-white" : "text-slate-300 dark:text-white/70"
                )}>
                  {step.description}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "w-20 sm:w-28 h-1 mx-4 rounded-full transition-colors duration-200",
                    currentStep > step.id ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-700"
                  )}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2">
          <div className="card-enterprise">
            <div className="p-6">
              {/* Step 1: Equipment Selection */}
              {currentStep === 1 && (
                <div className="space-y-6" data-testid="step-equipment">
                  <div>
                    <h2 className="text-[18px] font-bold text-slate-900 dark:text-white mb-1">
                      Select Equipment
                    </h2>
                    <p className="text-[13px] text-slate-500 dark:text-white">
                      Choose the equipment you want to inspect
                    </p>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <Label htmlFor="equipment" className="text-[13px] font-semibold text-slate-700 dark:text-white">
                        Equipment Model
                      </Label>
                      <Select
                        value={formData.equipment_model}
                        onValueChange={handleEquipmentSelect}
                      >
                        <SelectTrigger className="mt-2 h-11" data-testid="equipment-select">
                          <SelectValue placeholder="Search and select equipment..." />
                        </SelectTrigger>
                        <SelectContent>
                          {equipmentOptions.map((equipment) => (
                            <SelectItem key={equipment.model} value={equipment.model}>
                              <div className="flex items-center gap-2">
                                <Truck className="w-4 h-4 text-[#F7B500]" />
                                {equipment.model}
                              </div>
                            </SelectItem>
                          ))}
                          <div className="border-t border-slate-200 dark:border-slate-700 mt-1 pt-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start h-9 text-[13px] text-[#F7B500] hover:text-[#E5A800] hover:bg-[#F7B500]/10"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setAddEquipmentOpen(true);
                              }}
                              data-testid="add-equipment-btn"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Add new equipment
                            </Button>
                          </div>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Add new equipment dialog */}
                    <Dialog open={addEquipmentOpen} onOpenChange={setAddEquipmentOpen}>
                      <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                        <DialogHeader>
                          <DialogTitle className="text-slate-900 dark:text-white">Add new equipment</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleAddEquipment} className="grid gap-4 py-2">
                          <div className="grid gap-2">
                            <Label htmlFor="new-equipment-model" className="text-slate-700 dark:text-white">Equipment model name</Label>
                            <Input
                              id="new-equipment-model"
                              placeholder="e.g. CAT 330 Excavator"
                              value={newEquipmentModel}
                              onChange={(e) => setNewEquipmentModel(e.target.value)}
                              className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                              required
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="new-equipment-serial" className="text-slate-700 dark:text-white">Serial number prefix (optional)</Label>
                            <Input
                              id="new-equipment-serial"
                              placeholder="e.g. CAT0330X"
                              value={newEquipmentSerialPrefix}
                              onChange={(e) => setNewEquipmentSerialPrefix(e.target.value)}
                              className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 font-mono"
                            />
                          </div>
                          <DialogFooter className="gap-2 sm:gap-0 pt-2">
                            <Button type="button" variant="outline" onClick={() => setAddEquipmentOpen(false)}>
                              Cancel
                            </Button>
                            <Button type="submit" className="bg-[#F7B500] hover:bg-[#E5A800] text-slate-900">
                              Add equipment
                            </Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>

                    {formData.equipment_model && (
                      <div>
                        <Label htmlFor="serial" className="text-[13px] font-semibold text-slate-700 dark:text-white">
                          Serial Number
                        </Label>
                        <Input
                          id="serial"
                          value={formData.serial_number}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              serial_number: e.target.value,
                            }))
                          }
                          className="mt-2 h-11 bg-slate-50 dark:bg-slate-800 font-mono"
                          data-testid="serial-input"
                        />
                      </div>
                    )}

                    <div>
                      <Label htmlFor="customer" className="text-[13px] font-semibold text-slate-700 dark:text-white">
                        <Building2 className="w-4 h-4 inline mr-1.5 text-slate-400" />
                        Customer
                      </Label>
                      <Input
                        id="customer"
                        placeholder="e.g., BuildCo Industries"
                        value={formData.customer}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            customer: e.target.value,
                          }))
                        }
                        className="mt-2 h-11"
                        data-testid="customer-input"
                      />
                    </div>

                    <div>
                      <Label htmlFor="location" className="text-[13px] font-semibold text-slate-700 dark:text-white">
                        <MapPin className="w-4 h-4 inline mr-1.5 text-slate-400" />
                        Location
                      </Label>
                      <Input
                        id="location"
                        placeholder="e.g., Dallas, TX"
                        value={formData.location}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            location: e.target.value,
                          }))
                        }
                        className="mt-2 h-11"
                        data-testid="location-input"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Inspection Type */}
              {currentStep === 2 && (
                <div className="space-y-6" data-testid="step-type">
                  <div>
                    <h2 className="text-[18px] font-bold text-slate-900 dark:text-white mb-1">
                      Select Inspection Type
                    </h2>
                    <p className="text-[13px] text-slate-500 dark:text-white">
                      Choose the type of inspection to perform
                    </p>
                  </div>

                  <RadioGroup
                    value={formData.inspection_type}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, inspection_type: value }))
                    }
                    className="space-y-3"
                  >
                    {INSPECTION_TYPES.map((type) => (
                      <Label
                        key={type.id}
                        htmlFor={type.id}
                        className={cn(
                          "flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-150",
                          formData.inspection_type === type.name
                            ? "border-[#F7B500] bg-[#F7B500]/5"
                            : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                        )}
                        data-testid={`inspection-type-${type.id}`}
                      >
                        <RadioGroupItem value={type.name} id={type.id} className="mt-1" />
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <div className={cn(
                              "icon-glass icon-glass-lg flex items-center justify-center",
                              formData.inspection_type === type.name 
                                ? "icon-glass-amber" 
                                : ""
                            )}>
                              <type.icon className={cn(
                                "w-5 h-5",
                                formData.inspection_type === type.name 
                                  ? "text-[#F7B500]" 
                                  : "text-slate-400"
                              )} />
                            </div>
                            <div>
                              <span className="font-semibold text-[15px] text-slate-900 dark:text-white">
                                {type.name}
                              </span>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[11px] text-slate-500 dark:text-white bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                  {type.duration}
                                </span>
                                <span className="text-[11px] text-slate-500 dark:text-white bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                  {type.items}
                                </span>
                              </div>
                            </div>
                          </div>
                          <p className="text-[13px] text-slate-500 dark:text-white mt-2 ml-12">
                            {type.description}
                          </p>
                        </div>
                      </Label>
                    ))}
                  </RadioGroup>
                </div>
              )}

              {/* Step 3: Review */}
              {currentStep === 3 && (
                <div className="space-y-6" data-testid="step-review">
                  <div>
                    <h2 className="text-[18px] font-bold text-slate-900 dark:text-white mb-1">
                      Review & Start
                    </h2>
                    <p className="text-[13px] text-slate-500 dark:text-white">
                      Confirm the details before starting the inspection
                    </p>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5 space-y-4">
                    <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-700">
                      <span className="text-[12px] text-slate-500 dark:text-white font-medium uppercase tracking-wide">Equipment</span>
                      <span className="text-[14px] font-semibold text-slate-900 dark:text-white">
                        {formData.equipment_model}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-700">
                      <span className="text-[12px] text-slate-500 dark:text-white font-medium uppercase tracking-wide">Serial Number</span>
                      <span className="text-[14px] font-mono text-slate-700 dark:text-white">
                        {formData.serial_number}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-700">
                      <span className="text-[12px] text-slate-500 dark:text-white font-medium uppercase tracking-wide">Customer</span>
                      <span className="text-[14px] text-slate-700 dark:text-white">
                        {formData.customer}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-700">
                      <span className="text-[12px] text-slate-500 dark:text-white font-medium uppercase tracking-wide">Location</span>
                      <span className="text-[14px] text-slate-700 dark:text-white">
                        {formData.location}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[12px] text-slate-500 dark:text-white font-medium uppercase tracking-wide">Inspection Type</span>
                      <span className="text-[14px] font-semibold text-[#F7B500]">
                        {formData.inspection_type}
                      </span>
                    </div>
                  </div>

                  <div className="bg-[#F7B500]/10 border border-[#F7B500]/20 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="icon-glass icon-glass-lg icon-glass-amber flex-shrink-0">
                        <Play className="w-5 h-5 text-[#F7B500]" />
                      </div>
                      <div>
                        <p className="text-[14px] font-semibold text-slate-900 dark:text-white">Ready to start!</p>
                        <p className="text-[13px] text-slate-600 dark:text-white mt-1">
                          Once you begin, the AI will assist you in capturing findings in real-time. Make sure you have good lighting and a stable camera position.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="flex justify-between mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={currentStep === 1}
                  className="h-11 px-5 text-[14px]"
                  data-testid="wizard-back-btn"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={!canProceed()}
                  className="btn-primary-cat h-11 px-6 text-[14px]"
                  data-testid="wizard-next-btn"
                >
                  {currentStep === 3 ? (
                    <>
                      <Play className="w-4 h-4 mr-1.5" />
                      Start Inspection
                    </>
                  ) : (
                    <>
                      Next
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Card */}
        <div className="lg:col-span-1">
          <div className="card-enterprise sticky top-24">
            <div className="card-header-enterprise">
              <h3 className="text-[14px] font-semibold text-slate-900 dark:text-white">
                Inspection Summary
              </h3>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <span className="text-[11px] text-slate-400 dark:text-white/90 font-semibold uppercase tracking-wider">
                  Equipment
                </span>
                <p className="text-[14px] font-semibold text-slate-900 dark:text-white mt-1">
                  {formData.equipment_model || "Not selected"}
                </p>
              </div>
              {formData.serial_number && (
                <div>
                  <span className="text-[11px] text-slate-400 dark:text-white/90 font-semibold uppercase tracking-wider">
                    Serial
                  </span>
                  <p className="text-[14px] font-mono text-slate-700 dark:text-white mt-1">
                    {formData.serial_number}
                  </p>
                </div>
              )}
              {formData.customer && (
                <div>
                  <span className="text-[11px] text-slate-400 dark:text-white/90 font-semibold uppercase tracking-wider">
                    Customer
                  </span>
                  <p className="text-[14px] text-slate-700 dark:text-white mt-1">
                    {formData.customer}
                  </p>
                </div>
              )}
              {formData.location && (
                <div>
                  <span className="text-[11px] text-slate-400 dark:text-white/90 font-semibold uppercase tracking-wider">
                    Location
                  </span>
                  <p className="text-[14px] text-slate-700 dark:text-white mt-1">
                    {formData.location}
                  </p>
                </div>
              )}
              {formData.inspection_type && (
                <div>
                  <span className="text-[11px] text-slate-400 dark:text-white/90 font-semibold uppercase tracking-wider">
                    Type
                  </span>
                  <p className="text-[14px] font-semibold text-[#F7B500] mt-1">
                    {formData.inspection_type}
                  </p>
                </div>
              )}
              {!formData.equipment_model && (
                <p className="text-[13px] text-slate-400 dark:text-white/90 italic">
                  Fill in the form to see your inspection details
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InspectionWizard;
