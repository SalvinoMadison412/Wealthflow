import { matchText } from '../db/matching';
import { findPreset, PRESET_RULES } from './autoCategorize';

// merchant alone, or merchant + raw statement description
const categoryOf = (merchant: string, description = '') => findPreset(matchText(merchant, description))?.category ?? null;

test('every preset pattern is a valid regex', () => {
  for (const r of PRESET_RULES) expect(() => new RegExp(r.pattern, 'i')).not.toThrow();
});

test('generic merchants land in the right category', () => {
  expect(categoryOf('Cafe Coffee Day')).toBe('Food & Dining');
  expect(categoryOf('Mahaveer Ice Cream')).toBe('Food & Dining');
  expect(categoryOf('Taaza Kitchen')).toBe('Food & Dining');
  expect(categoryOf('Paradise Biryani')).toBe('Food & Dining');
  expect(categoryOf('Netflix')).toBe('Subscriptions');
  expect(categoryOf('Amazon')).toBe('Shopping');
  expect(categoryOf('Style Hair Salon')).toBe('Personal care');
  expect(categoryOf('City Pharmacy')).toBe('Health & Fitness');
  expect(categoryOf('Deccan Motors')).toBe('Transport & Fuel');
  expect(categoryOf('Sunrise Supermarket')).toBe('Groceries');
  expect(categoryOf('Green Residency')).toBe('Rent & Home');
});

test('big Indian brands still work', () => {
  expect(categoryOf('Swiggy')).toBe('Food & Dining');
  expect(categoryOf('Blinkit')).toBe('Groceries');
  expect(categoryOf('Rapido')).toBe('Transport & Fuel');
  expect(categoryOf('Uber India')).toBe('Transport & Fuel');
  expect(categoryOf('Airtel Payments')).toBe('Bills & Utilities');
  expect(categoryOf('Mutual Fund SIP')).toBe('Investments');
  expect(categoryOf('OneCard')).toBe('Credit card & loans');
});

test('ordering: Prime is a subscription, Instamart is groceries, a refund is income', () => {
  expect(categoryOf('Amazon Prime membership')).toBe('Subscriptions');
  expect(categoryOf('Swiggy Instamart')).toBe('Groceries');
  expect(categoryOf('Razorpay', 'UPI/Razorpay/725412810876/CrunchyrRefund UPI-1')).toBe('Income');
  expect(categoryOf('Salary Credit', 'NEFT ABC123 SALARY CREDIT')).toBe('Income');
});

test('the description rescues a truncated merchant or a UPI note', () => {
  expect(categoryOf('Asha K', 'UPI/ASHA K /119619403503/McD UPI-606559414587')).toBe('Food & Dining');
  expect(categoryOf('Viben', 'UPI/Viben/690795462191/Foodcharges UPI-608184458550')).toBe('Food & Dining');
});

test('a UPI payment to a person falls through to People & UPI', () => {
  expect(categoryOf('Ravi Kumar', 'UPI/RAVI KUMAR/178856125052/Payment UPI-606213526162')).toBe('People & UPI');
});

test('a small business via a merchant QR is Other businesses, not People', () => {
  expect(categoryOf('Kiran Traders', 'UPI/KIRAN TRADERS UPI-1')).toBe('Other businesses');
  expect(categoryOf('Kherun', 'UPI/KHERUN/157192376101/Pay to BharatPe UPI-608045862348')).toBe('Other businesses');
});

test('short tokens do not over-match', () => {
  expect(categoryOf('Kolar Stores')).not.toBe('Transport & Fuel');
  expect(categoryOf('Viji Kumar')).toBeNull();
  expect(categoryOf('Jiovanni')).toBeNull();
  expect(categoryOf('Steam')).toBeNull();
});

test('savings is used only for investments', () => {
  expect(PRESET_RULES.filter((r) => r.bucket === 'savings').map((r) => r.category)).toEqual(['Investments']);
});
