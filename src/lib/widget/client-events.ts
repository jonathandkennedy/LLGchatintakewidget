/**
 * Client-side widget event tracking.
 * Fires events to the server tracking API for analytics.
 */

let clientId: string | null = null;
let sessionId: string | null = null;

export function initEventTracking(cId: string, sId: string | null) {
  clientId = cId;
  sessionId = sId;
}

export function updateSessionId(sId: string) {
  sessionId = sId;
}

async function trackEvent(eventName: string, properties?: Record<string, unknown>) {
  if (!clientId) return;

  try {
    await fetch("/api/widget/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId,
        sessionId,
        eventName,
        eventProperties: properties,
      }),
    });
  } catch {
    // Silently fail - analytics shouldn't break the widget
  }
}

export function trackWidgetOpened() { trackEvent("widget_opened"); }
export function trackChatStarted() { trackEvent("chat_started"); }
export function trackStepViewed(stepKey: string) { trackEvent("step_viewed", { stepKey }); }
export function trackStepCompleted(stepKey: string) { trackEvent("step_completed", { stepKey }); }
export function trackFlowCompleted() { trackEvent("flow_completed"); }
export function trackCallCtaClicked() { trackEvent("call_cta_clicked"); }
export function trackCallConnected() { trackEvent("call_connected"); }
export function trackLanguageChanged(lang: string) { trackEvent("language_changed", { lang }); }
export function trackVoiceInputUsed() { trackEvent("voice_input_used"); }
export function trackFileUploaded(fileType: string) { trackEvent("file_uploaded", { fileType }); }
export function trackUndoUsed() { trackEvent("undo_used"); }
export function trackBackUsed() { trackEvent("back_used"); }
