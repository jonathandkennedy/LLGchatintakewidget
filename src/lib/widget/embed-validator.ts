/**
 * Embed code validator.
 * Checks that the widget embed script is properly configured.
 */

type ValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
  config: {
    clientSlug: string | null;
    apiBase: string | null;
    position: string | null;
    triggerDelay: string | null;
  };
};

/**
 * Validate an embed script tag string.
 */
export function validateEmbedCode(html: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check basic structure
  if (!html.includes("<script")) {
    errors.push("Missing <script> tag");
    return { valid: false, errors, warnings, config: { clientSlug: null, apiBase: null, position: null, triggerDelay: null } };
  }

  // Extract attributes
  const srcMatch = html.match(/src="([^"]+)"/);
  const slugMatch = html.match(/data-client-slug="([^"]+)"/);
  const apiMatch = html.match(/data-api-base="([^"]+)"/);
  const posMatch = html.match(/data-position="([^"]+)"/);
  const delayMatch = html.match(/data-trigger-delay="([^"]+)"/);

  if (!srcMatch) errors.push("Missing src attribute on script tag");
  if (!slugMatch) errors.push("Missing data-client-slug attribute (required)");

  if (srcMatch && !srcMatch[1].endsWith("widget.js")) {
    warnings.push("Script src should end with /embed/widget.js");
  }

  if (apiMatch && !apiMatch[1].startsWith("http")) {
    errors.push("data-api-base must be a full URL (https://...)");
  }

  if (posMatch && !["left", "right"].includes(posMatch[1])) {
    warnings.push("data-position should be 'left' or 'right'");
  }

  if (!html.includes("defer")) {
    warnings.push("Consider adding 'defer' attribute for better page load performance");
  }

  if (html.includes("async") && html.includes("defer")) {
    warnings.push("Don't use both 'async' and 'defer' - use only 'defer'");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    config: {
      clientSlug: slugMatch?.[1] ?? null,
      apiBase: apiMatch?.[1] ?? null,
      position: posMatch?.[1] ?? null,
      triggerDelay: delayMatch?.[1] ?? null,
    },
  };
}
