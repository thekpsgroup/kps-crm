import { parsePhoneNumber, isValidPhoneNumber, AsYouType } from 'libphonenumber-js';

export function normalizeE164(input: string, defaultCountry = 'US'): string | null {
  try {
    // Remove all non-digit characters except + and spaces
    const cleaned = input.replace(/[^\d+\s-()]/g, '');

    // Try to parse as international format
    if (cleaned.startsWith('+')) {
      const phoneNumber = parsePhoneNumber(cleaned);
      if (phoneNumber && phoneNumber.isValid()) {
        return phoneNumber.number;
      }
    }

    // Try to parse with default country
    const phoneNumber = parsePhoneNumber(cleaned, defaultCountry);
    if (phoneNumber && phoneNumber.isValid()) {
      return phoneNumber.number;
    }

    // If parsing fails, return null
    return null;
  } catch (error) {
    console.warn('Phone number parsing error:', error);
    return null;
  }
}

export function isSameNumber(phone1: string, phone2: string): boolean {
  const normalized1 = normalizeE164(phone1);
  const normalized2 = normalizeE164(phone2);

  if (!normalized1 || !normalized2) {
    return false;
  }

  return normalized1 === normalized2;
}

export function formatPhoneNumber(input: string, format: 'national' | 'international' = 'national'): string {
  try {
    const phoneNumber = parsePhoneNumber(input);
    if (phoneNumber && phoneNumber.isValid()) {
      return format === 'international' ? phoneNumber.formatInternational() : phoneNumber.formatNational();
    }
    return input; // Return original if parsing fails
  } catch (error) {
    return input;
  }
}

export function isValidPhone(input: string, defaultCountry = 'US'): boolean {
  try {
    if (input.startsWith('+')) {
      return isValidPhoneNumber(input);
    }
    return isValidPhoneNumber(input, defaultCountry);
  } catch (error) {
    return false;
  }
}

export function getAsYouTypeFormatter(country = 'US') {
  return new AsYouType(country);
}

// Utility for formatting phone as user types
export function formatAsYouType(input: string, country = 'US'): string {
  const formatter = new AsYouType(country);
  return formatter.input(input);
}
