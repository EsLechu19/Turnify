export const GUEST_AGE_RANGES = ['under_18', '18_24', '25_34', '35_44', '45_plus'] as const;
export const GUEST_GENDERS = ['male', 'female', 'prefer_not_to_say'] as const;

export type GuestAgeRange = (typeof GUEST_AGE_RANGES)[number];
export type GuestGender = (typeof GUEST_GENDERS)[number];

export type GuestDetails = {
  name: string;
  ageRange?: GuestAgeRange | null;
  gender?: GuestGender | null;
};

export function normalizeGuestDetails(input: GuestDetails): GuestDetails {
  const name = input.name.trim();
  if (name.length === 0 || name.length > 80) {
    throw new Error('Guest name must contain between 1 and 80 characters');
  }
  return { name, ageRange: input.ageRange ?? null, gender: input.gender ?? null };
}
