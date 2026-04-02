/**
 * Fire Google Analytics 4 events + Facebook Pixel events from the widget.
 * These run client-side and require the parent page to have GA4/FB Pixel installed.
 */

type EventParams = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

function getWindow(): Window | null {
  if (typeof window === "undefined") return null;
  // If in iframe, try parent window for analytics
  try {
    return window.parent ?? window;
  } catch {
    return window;
  }
}

/**
 * Send a GA4 event.
 */
export function trackGA4Event(eventName: string, params?: EventParams): void {
  const w = getWindow();
  if (!w) return;

  if (w.gtag) {
    w.gtag("event", eventName, params);
  } else if (w.dataLayer) {
    w.dataLayer.push({ event: eventName, ...params });
  }
}

/**
 * Send a Facebook Pixel event.
 */
export function trackFBEvent(eventName: string, params?: EventParams): void {
  const w = getWindow();
  if (!w?.fbq) return;
  w.fbq("track", eventName, params);
}

/**
 * Track widget opened.
 */
export function trackWidgetOpen(): void {
  trackGA4Event("widget_open", { event_category: "intake" });
  trackFBEvent("ViewContent", { content_name: "intake_widget" });
}

/**
 * Track intake started (first step answered).
 */
export function trackIntakeStart(): void {
  trackGA4Event("intake_start", { event_category: "intake" });
  trackFBEvent("InitiateCheckout", { content_name: "intake_start" });
}

/**
 * Track a step completed.
 */
export function trackStepComplete(stepKey: string, stepNumber: number): void {
  trackGA4Event("intake_step_complete", {
    event_category: "intake",
    step_key: stepKey,
    step_number: stepNumber,
  });
}

/**
 * Track lead captured (intake completed).
 */
export function trackLeadCaptured(matterType?: string): void {
  trackGA4Event("generate_lead", {
    event_category: "intake",
    matter_type: matterType,
    currency: "USD",
    value: 1,
  });
  trackFBEvent("Lead", { content_name: matterType ?? "intake" });
}

/**
 * Track call connected.
 */
export function trackCallConnected(): void {
  trackGA4Event("call_connected", { event_category: "intake" });
  trackFBEvent("Contact", { content_name: "call_connected" });
}
