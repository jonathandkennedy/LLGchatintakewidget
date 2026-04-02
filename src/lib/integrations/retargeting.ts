/**
 * Retargeting pixel support for abandoned intakes.
 * Fires a custom event when a user starts but doesn't complete the flow,
 * allowing ad platforms to retarget these visitors.
 *
 * Configure via embed script:
 *   data-retarget-abandon="true"
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

const ABANDON_KEY = "intakellg_flow_started";
const COMPLETED_KEY = "intakellg_flow_completed";

/**
 * Mark that the user started the intake flow.
 */
export function markFlowStarted(): void {
  try {
    sessionStorage.setItem(ABANDON_KEY, "1");
    sessionStorage.removeItem(COMPLETED_KEY);
  } catch { /* ignore */ }
}

/**
 * Mark that the user completed the intake flow.
 */
export function markFlowCompleted(): void {
  try {
    sessionStorage.setItem(COMPLETED_KEY, "1");
    sessionStorage.removeItem(ABANDON_KEY);
  } catch { /* ignore */ }
}

/**
 * Fire abandon pixel on page unload if flow was started but not completed.
 */
export function setupAbandonTracking(): void {
  if (typeof window === "undefined") return;

  window.addEventListener("beforeunload", () => {
    try {
      const started = sessionStorage.getItem(ABANDON_KEY) === "1";
      const completed = sessionStorage.getItem(COMPLETED_KEY) === "1";

      if (started && !completed) {
        fireAbandonPixel();
      }
    } catch { /* ignore */ }
  });
}

function fireAbandonPixel(): void {
  // Google Ads custom event
  if (window.gtag) {
    window.gtag("event", "intake_abandoned", {
      event_category: "retargeting",
      non_interaction: true,
    });
  }

  // Facebook custom event
  if (window.fbq) {
    window.fbq("trackCustom", "IntakeAbandoned");
  }

  // Google Analytics
  if (window.gtag) {
    window.gtag("event", "intake_abandon", {
      event_category: "engagement",
      event_label: "widget_abandon",
    });
  }
}

/**
 * Fire step-level abandon with the step where they dropped off.
 */
export function fireStepAbandon(stepKey: string, stepNumber: number): void {
  if (window.gtag) {
    window.gtag("event", "intake_step_abandon", {
      event_category: "retargeting",
      step_key: stepKey,
      step_number: stepNumber,
    });
  }
  if (window.fbq) {
    window.fbq("trackCustom", "IntakeStepAbandoned", {
      step_key: stepKey,
      step_number: stepNumber,
    });
  }
}
