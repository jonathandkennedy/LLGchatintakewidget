/**
 * Pre-built canned responses for common lead follow-up scenarios.
 * Used in the admin lead detail page for quick replies.
 */

export type CannedResponse = {
  id: string;
  label: string;
  category: "followup" | "callback" | "info" | "close";
  template: string;
};

export const CANNED_RESPONSES: CannedResponse[] = [
  // Follow-ups
  {
    id: "followup_initial",
    label: "Initial Follow-up",
    category: "followup",
    template: "Hi {{name}}, thank you for reaching out about your {{matter_type}}. I wanted to follow up and see if you have any questions. Please call us at {{firm_phone}} or reply to this message.",
  },
  {
    id: "followup_second",
    label: "Second Follow-up",
    category: "followup",
    template: "Hi {{name}}, I'm following up on your case inquiry from {{date}}. We'd love to help you. Are you still looking for legal assistance? Reply YES and we'll get you connected right away.",
  },
  {
    id: "followup_docs",
    label: "Request Documents",
    category: "followup",
    template: "Hi {{name}}, to move forward with your {{matter_type}} case, we'll need a few documents: police report, insurance info, and any medical records. Can you send those our way?",
  },

  // Callbacks
  {
    id: "callback_scheduled",
    label: "Callback Scheduled",
    category: "callback",
    template: "Hi {{name}}, we've scheduled a callback for you. An attorney will call you at {{phone}} within the next 30 minutes. Please keep your phone nearby.",
  },
  {
    id: "callback_missed",
    label: "Missed Callback",
    category: "callback",
    template: "Hi {{name}}, we tried calling you but couldn't reach you. Please call us back at {{firm_phone}} at your earliest convenience, or let us know a good time to try again.",
  },

  // Info
  {
    id: "info_consultation",
    label: "Free Consultation",
    category: "info",
    template: "Hi {{name}}, just a reminder that your consultation is completely free and confidential. There's no obligation, and we don't get paid unless you win your case.",
  },
  {
    id: "info_timeline",
    label: "Case Timeline",
    category: "info",
    template: "Hi {{name}}, most {{matter_type}} cases are resolved within 6-18 months. The first step is a free case review, which we can do over the phone in about 15 minutes.",
  },

  // Close
  {
    id: "close_not_interested",
    label: "Close - Not Interested",
    category: "close",
    template: "Hi {{name}}, we understand this may not be the right time. Your case information is saved, and you're welcome to reach out anytime in the future. Wishing you all the best.",
  },
  {
    id: "close_referred",
    label: "Close - Referred Out",
    category: "close",
    template: "Hi {{name}}, after reviewing your case, we believe you'd be better served by a specialist in this area. We've referred your information to a trusted partner who will be reaching out to you.",
  },
];

/**
 * Fill template variables with lead data.
 */
export function fillTemplate(template: string, data: Record<string, string | null | undefined>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] ?? "");
}

export function getResponsesByCategory(category: string): CannedResponse[] {
  return CANNED_RESPONSES.filter((r) => r.category === category);
}
