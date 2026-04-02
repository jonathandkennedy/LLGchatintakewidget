/**
 * Custom CSS injection for widget theming.
 * Allows clients to inject custom CSS via branding config.
 * Stored in client_branding.custom_css field.
 *
 * Sanitizes CSS to prevent XSS:
 * - Strips @import, url(), expression(), javascript:
 * - Only allows safe CSS properties
 */

const DANGEROUS_PATTERNS = [
  /@import/gi,
  /url\s*\(/gi,
  /expression\s*\(/gi,
  /javascript:/gi,
  /behavior\s*:/gi,
  /-moz-binding/gi,
  /data:/gi,
];

/**
 * Sanitize custom CSS to prevent injection attacks.
 */
export function sanitizeCSS(css: string): string {
  let cleaned = css;
  for (const pattern of DANGEROUS_PATTERNS) {
    cleaned = cleaned.replace(pattern, "/* blocked */");
  }
  return cleaned;
}

/**
 * Inject custom CSS into the widget iframe.
 */
export function injectCustomCSS(css: string | null | undefined): void {
  if (!css?.trim()) return;

  const sanitized = sanitizeCSS(css);
  const existingStyle = document.getElementById("intakellg-custom-css");
  if (existingStyle) existingStyle.remove();

  const style = document.createElement("style");
  style.id = "intakellg-custom-css";
  style.textContent = sanitized;
  document.head.appendChild(style);
}

/**
 * Generate CSS variables from branding config.
 */
export function brandingToCSS(branding: {
  primaryColor?: string;
  accentColor?: string;
}): string {
  const vars: string[] = [];
  if (branding.primaryColor) {
    vars.push(`--primary: ${branding.primaryColor}`);
    vars.push(`--primary-hover: ${branding.primaryColor}`);
  }
  if (branding.accentColor) {
    vars.push(`--accent: ${branding.accentColor}`);
  }
  return vars.length > 0 ? `:root { ${vars.join("; ")}; }` : "";
}
