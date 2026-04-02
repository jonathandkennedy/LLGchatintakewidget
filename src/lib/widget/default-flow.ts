import type { WidgetFlow } from "@/types/widget";

export const DEFAULT_FLOW: WidgetFlow = {
  id: "default-flow",
  version: 1,
  name: "Default injury intake",
  steps: [
    { key: "welcome", type: "welcome", title: "Injured in an accident?", description: "Answer a few quick questions so we can connect you with our team as fast as possible.", next: "matter_type" },
    { key: "matter_type", type: "single_select", title: "What kind of matter can we help with?", fieldKey: "matter_type", required: true, options: [
      { key: "car_accident", label: "Car accident" },
      { key: "truck_accident", label: "Truck accident" },
      { key: "motorcycle_accident", label: "Motorcycle accident" },
      { key: "slip_fall", label: "Slip and fall" },
      { key: "wrongful_death", label: "Wrongful death" },
      { key: "other_injury", label: "Other injury" },
    ], next: "incident_summary" },
    { key: "incident_summary", type: "long_text", title: "Could you briefly explain what happened?", fieldKey: "incident_summary", required: true, placeholder: "Example: I was rear-ended at a stop light and my neck has been hurting since.", next: "injury_status" },
    { key: "injury_status", type: "single_select", title: "Did you suffer any injuries or are you experiencing pain from the accident?", fieldKey: "injury_status", required: true, options: [
      { key: "yes_injured", label: "Yes, I’m injured" },
      { key: "someone_else_injured", label: "Someone else was injured" },
      { key: "no_injuries", label: "No injuries" },
      { key: "not_sure", label: "Not sure yet" },
    ], branches: [
      { conditions: [{ fieldKey: "injury_status", operator: "in", value: ["yes_injured", "someone_else_injured"] }], nextStepKey: "injury_areas", priority: 1 },
      { conditions: [{ fieldKey: "injury_status", operator: "in", value: ["no_injuries", "not_sure"] }], nextStepKey: "incident_state", priority: 2 },
    ] },
    { key: "injury_areas", type: "multi_select", title: "What injuries or pain are you experiencing?", fieldKey: "injury_areas", required: true, options: [
      { key: "back_neck", label: "Back / neck" },
      { key: "head", label: "Head" },
      { key: "shoulder_arm", label: "Shoulder / arm" },
      { key: "hip_leg", label: "Hip / leg" },
      { key: "cuts_bruising", label: "Cuts / bruising" },
      { key: "emotional_distress", label: "Emotional distress" },
      { key: "other", label: "Other" },
    ], next: "medical_treatment_status" },
    { key: "medical_treatment_status", type: "single_select", title: "Did you receive medical treatment for your injuries?", fieldKey: "medical_treatment_status", required: true, options: [
      { key: "yes", label: "Yes" },
      { key: "no", label: "No" },
      { key: "scheduled", label: "Appointment scheduled" },
      { key: "not_yet", label: "Not yet" },
    ], next: "incident_state" },
    { key: "incident_state", type: "dropdown", title: "In what state did the accident happen?", fieldKey: "incident_state", required: true, next: "incident_city" },
    { key: "incident_city", type: "short_text", title: "And what city did it happen in?", fieldKey: "incident_city", required: true, next: "incident_date_range" },
    { key: "incident_date_range", type: "single_select", title: "When did the accident occur?", fieldKey: "incident_date_range", required: true, options: [
      { key: "today", label: "Today" },
      { key: "last_7_days", label: "Within the last week" },
      { key: "last_30_days", label: "Within the last month" },
      { key: "last_12_months", label: "Within the last year" },
      { key: "over_1_year", label: "More than a year ago" },
      { key: "unknown", label: "I’m not sure" },
    ], next: "full_name" },
    { key: "full_name", type: "name", title: "What’s your full name?", required: true, next: "phone" },
    { key: "phone", type: "phone", title: "In case we get disconnected, what’s the best phone number to reach you?", fieldKey: "phone", required: true, next: "email" },
    { key: "email", type: "email", title: "What’s your email address?", fieldKey: "email", required: false, next: "additional_notes" },
    { key: "additional_notes", type: "textarea_optional", title: "Is there anything else you’d like us to know?", fieldKey: "additional_notes", required: false, next: "transfer_ready" },
    { key: "transfer_ready", type: "transfer_ready", title: "Thanks — based on what you shared, the best next step is to speak with our team now.", description: "Tap below and we’ll connect your call. If we can’t reach the office right away, we’ll save your information and follow up.", next: "connecting" },
    { key: "connecting", type: "connecting", title: "Connecting your call…", description: "Please keep this window open while we connect you.", next: "connected" },
    { key: "connected", type: "connected", title: "You’re being connected now.", description: "If the call drops, we have your information and our team can follow up." },
    { key: "transfer_fallback", type: "fallback", title: "We couldn’t connect the call right away.", description: "We’ve saved your information. A member of our team will reach out as soon as possible.", next: "callback_requested_confirmation" },
    { key: "callback_requested_confirmation", type: "callback_confirmation", title: "You’re all set.", description: "Your information has been sent to our team. We’ll follow up as soon as possible." }
  ]
};
