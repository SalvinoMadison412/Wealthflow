// Profile fields collected at onboarding and mirrored into the local
// `settings` table so Home can greet the user offline.
export type Profile = {
  fullName: string;
  email: string | null;
  phone: string | null;
  ageRange: string | null;
  incomeRange: string | null;
  goal: string | null;
  occupation: string | null;
};

export type Option = { value: string; label: string };

export const AGE_RANGES: Option[] = ['18-24', '25-34', '35-44', '45-54', '55+'].map((v) => ({
  value: v,
  label: v,
}));

// `midpoint` seeds the existing monthly_income fallback that Budget uses.
export const INCOME_RANGES: (Option & { midpoint: number })[] = [
  { value: '<25k', label: 'Under ₹25k', midpoint: 15000 },
  { value: '25k-50k', label: '₹25k–50k', midpoint: 37500 },
  { value: '50k-1L', label: '₹50k–1L', midpoint: 75000 },
  { value: '1L-2L', label: '₹1L–2L', midpoint: 150000 },
  { value: '2L+', label: '₹2L+', midpoint: 250000 },
];

export const GOALS: Option[] = [
  { value: 'track', label: 'Track spending' },
  { value: 'budget', label: 'Stick to a budget' },
  { value: 'save', label: 'Save more' },
  { value: 'debt', label: 'Pay off debt' },
];

export const OCCUPATIONS: Option[] = [
  { value: 'salaried', label: 'Salaried' },
  { value: 'self_employed', label: 'Self-employed' },
  { value: 'student', label: 'Student' },
  { value: 'business', label: 'Business owner' },
  { value: 'other', label: 'Other' },
];

export function firstName(profile: Profile | null): string | null {
  const first = profile?.fullName.trim().split(/\s+/)[0];
  return first || null;
}
