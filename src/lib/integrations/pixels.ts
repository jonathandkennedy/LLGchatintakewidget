/**
 * Conversion pixel support for the embed script.
 * Fires Google Ads conversion and Facebook Pixel events
 * from the parent page when widget events occur.
 *
 * Usage: Include this in the embed script to automatically
 * track conversions without requiring the client to add custom code.
 */

// Google Ads Conversion
export function fireGoogleConversion(conversionId?: string, conversionLabel?: string): void {
  if (typeof window === "undefined") return;
  const w = window as Window & { gtag?: (...args: unknown[]) => void };
  if (!w.gtag || !conversionId) return;

  w.gtag("event", "conversion", {
    send_to: `${conversionId}/${conversionLabel ?? ""}`,
    value: 1.0,
    currency: "USD",
  });
}

// Facebook Conversion API (via pixel)
export function fireFacebookConversion(eventName = "Lead"): void {
  if (typeof window === "undefined") return;
  const w = window as Window & { fbq?: (...args: unknown[]) => void };
  if (!w.fbq) return;
  w.fbq("track", eventName);
}

/**
 * Enhanced embed script pixel configuration.
 * Pass these as data attributes on the script tag:
 *
 * data-google-conversion-id="AW-123456789"
 * data-google-conversion-label="abcdef"
 * data-fb-pixel-event="Lead"
 */
export function getPixelConfig(scriptEl: HTMLScriptElement | null) {
  return {
    googleConversionId: scriptEl?.getAttribute("data-google-conversion-id") ?? undefined,
    googleConversionLabel: scriptEl?.getAttribute("data-google-conversion-label") ?? undefined,
    fbPixelEvent: scriptEl?.getAttribute("data-fb-pixel-event") ?? "Lead",
  };
}
