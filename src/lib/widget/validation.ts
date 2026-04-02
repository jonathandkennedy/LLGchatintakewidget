import { normalizeUsPhone } from "@/lib/utils/phone";

type FieldError = { fieldKey: string; message: string };

export function validateStepValue(fieldKey: string, value: unknown): { ok: boolean; errors: FieldError[] } {
  const errors: FieldError[] = [];

  switch (fieldKey) {
    case "incident_summary": {
      const text = String(value ?? "").trim();
      if (text.length < 10) {
        errors.push({ fieldKey, message: "Please share a little more detail." });
      }
      break;
    }
    case "matter_type":
    case "injury_status":
    case "medical_treatment_status":
    case "incident_state":
    case "incident_city":
    case "incident_date_range": {
      if (!String(value ?? "").trim()) {
        errors.push({ fieldKey, message: "This field is required." });
      }
      break;
    }
    case "injury_areas": {
      if (!Array.isArray(value) || value.length === 0) {
        errors.push({ fieldKey, message: "Select at least one option." });
      }
      break;
    }
    case "phone": {
      const normalized = normalizeUsPhone(String(value ?? ""));
      if (!normalized) {
        errors.push({ fieldKey, message: "Please enter a valid phone number." });
      }
      break;
    }
    case "email": {
      const text = String(value ?? "").trim();
      if (text && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) {
        errors.push({ fieldKey, message: "Please enter a valid email address." });
      }
      break;
    }
    case "first_name":
    case "last_name": {
      const text = String(value ?? "").trim();
      if (!text) {
        errors.push({ fieldKey, message: "This field is required." });
      }
      break;
    }
    default:
      break;
  }

  return { ok: errors.length === 0, errors };
}
