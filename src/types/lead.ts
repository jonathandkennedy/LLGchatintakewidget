export type LeadStatus =
  | "opened"
  | "started"
  | "in_progress"
  | "intake_completed"
  | "transfer_attempted"
  | "call_connected"
  | "callback_pending";

export type LeadRecord = {
  id: string;
  clientId: string;
  sessionId: string;
  status: LeadStatus;
  matterType?: string | null;
  incidentSummary?: string | null;
  injuryStatus?: string | null;
  injuryAreas?: string[] | null;
  medicalTreatmentStatus?: string | null;
  incidentState?: string | null;
  incidentCity?: string | null;
  incidentDateRange?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phoneE164?: string | null;
  email?: string | null;
  additionalNotes?: string | null;
  createdAt: string;
  updatedAt: string;
};
