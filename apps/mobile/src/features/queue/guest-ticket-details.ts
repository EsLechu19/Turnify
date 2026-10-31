export const GUEST_AGE_RANGES = ['under_18', '18_24', '25_34', '35_44', '45_plus'] as const;
export const GUEST_GENDERS = ['male', 'female', 'prefer_not_to_say'] as const;

export type GuestAgeRange = (typeof GUEST_AGE_RANGES)[number];
export type GuestGender = (typeof GUEST_GENDERS)[number];

export type GuestDetails = {
  name: string;
  ageRange?: GuestAgeRange | null;
  gender?: GuestGender | null;
  phone?: string | null;
  whatsappConsent?: boolean;
};

export const GUEST_PHONE_CONSENT_ERROR = 'WhatsApp consent requires a valid phone number';

export function normalizeGuestDetails(input: GuestDetails): GuestDetails {
  const name = input.name.trim();
  if (name.length === 0 || name.length > 80) {
    throw new Error('Guest name must contain between 1 and 80 characters');
  }

  const rawPhone = input.phone?.trim() ?? '';
  const whatsappConsent = input.whatsappConsent === true;
  const phone = whatsappConsent && rawPhone.length > 0 ? normalizeInternationalPhone(rawPhone) : null;
  if (whatsappConsent && phone === null) throw new Error(GUEST_PHONE_CONSENT_ERROR);

  return { name, ageRange: input.ageRange ?? null, gender: input.gender ?? null, phone: whatsappConsent ? phone : null, whatsappConsent };
}

function normalizeInternationalPhone(value: string): string {
  const compact = value.replace(/[\s().-]/g, '');
  if (!/^\+[1-9]\d{7,14}$/.test(compact)) throw new Error(GUEST_PHONE_CONSENT_ERROR);
  return compact;
}
