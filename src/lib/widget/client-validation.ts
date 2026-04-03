/**
 * Client-side input validation with inline error messages.
 * Validates before submitting to the server.
 */

type ValidationError = { field: string; message: string };

export function validatePhone(value: string): ValidationError | null {
  const cleaned = value.replace(/\D/g, "");
  if (cleaned.length < 10) return { field: "phone", message: "Please enter a valid 10-digit phone number" };
  if (cleaned.length > 11) return { field: "phone", message: "Phone number is too long" };
  return null;
}

export function validateEmail(value: string): ValidationError | null {
  if (!value.trim()) return null; // Email is often optional
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value)) return { field: "email", message: "Please enter a valid email address" };
  return null;
}

export function validateName(firstName: string, lastName: string): ValidationError | null {
  if (!firstName.trim()) return { field: "firstName", message: "First name is required" };
  if (!lastName.trim()) return { field: "lastName", message: "Last name is required" };
  if (firstName.length < 2) return { field: "firstName", message: "First name is too short" };
  if (lastName.length < 2) return { field: "lastName", message: "Last name is too short" };
  return null;
}

export function validateText(value: string, minLength = 1): ValidationError | null {
  if (value.trim().length < minLength) {
    return { field: "text", message: minLength > 1 ? `Please enter at least ${minLength} characters` : "This field is required" };
  }
  return null;
}

/**
 * Format phone number as user types.
 */
export function formatPhoneInput(value: string): string {
  const cleaned = value.replace(/\D/g, "");
  if (cleaned.length <= 3) return cleaned;
  if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
  return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
}
