// Pure — no expo-sqlite import, unit tested directly.
export type PresetRule = { category: string; pattern: string };

// Built-in regex rules, applied only when the user taps Auto-categorise.
// Tested case-insensitively against "merchant description" (see
// db/matching.ts matchText), so UPI notes like "/McD" count too.
// First match wins, so ORDER MATTERS:
// - Income first: a refund from Razorpay is money in, not a merchant.
// - Subscriptions before Shopping: "Amazon Prime" is not an Amazon purchase.
// - Groceries before Food: "Swiggy Instamart" is groceries.
// - Other businesses, then People & UPI last as catch-alls.
// Short tokens are word-bounded (\bola\b, \bvi\b, \bpg\b) so "Kolar" is not Ola.
// ponytail: keyword lists are hand-curated from real statements; UPI
// payments to individuals can't be told apart by regex, hence the
// People & UPI bucket. Extend the lists as new statements show gaps.
export const PRESET_RULES: PresetRule[] = [
  {
    category: 'Income',
    pattern: String.raw`\bsalary\b|\bstipend\b|\bint\.pd\b|\binterest\b|\bdividend\b|refund|cashback|reimburs`,
  },
  {
    category: 'Investments',
    pattern: String.raw`zerodha|groww|upstox|kuvera|indmoney|smallcase|mutual ?fund|\bsip\b|safegold|\bnps\b|\bppf\b|angel ?one|icici ?direct`,
  },
  {
    category: 'Credit card & loans',
    pattern: String.raw`onecard|\bslice\b|\bcred\b|credit ?card|card ?bill|\bemi\b|\bloan\b|bajaj ?fin|lazypay|\bsimpl\b`,
  },
  {
    category: 'Subscriptions',
    pattern: String.raw`netflix|spotify|hotstar|prime ?video|amazon ?prime|\bprime\b|youtube|bookmyshow|zee5|sonyliv|crunchyr|apple\.com|google ?play|membership|subscription`,
  },
  {
    category: 'Rent & Home',
    pattern: String.raw`\brent\b|apartment|residency|\btower\b|skyview|\bsociety\b|maintenance|\bpg\b|hostel|\bflats?\b|\bvilla\b|\bhomes?\b`,
  },
  {
    category: 'Groceries',
    pattern: String.raw`instamart|bigbasket|blinkit|zepto|d-?mart|jiomart|milkbasket|country ?delight|\bkirana\b|supermarket|super ?bazaar|provision|\bgrocer|\bmart\b|general ?store|\bmilk\b|\bdairy\b|vegetable|\bfruits?\b`,
  },
  {
    category: 'Food & Dining',
    pattern: String.raw`swiggy|zomato|eatsure|domino|pizza|mcdonald|\bmcd\b|hardcastle|\bkfc\b|burger|starbucks|subway|haldiram|\bcafe\b|coffee|restaurant|\bkitchen\b|\bdhaba\b|biryani|pulao|\btiffin\b|\bmess\b|bakery|bakers|\bsweets?\b|ice ?cream|\bice\b|cream ?stone|\bfood|\bjuice\b|\bchai\b|\btea\b|\bsnacks?\b|\bwraps?\b|rooster|bombaiwala|\bdine\b|\beat(s|ery)\b`,
  },
  {
    category: 'Transport & Fuel',
    pattern: String.raw`rapido|\buber\b|\bola\b|redbus|irctc|fastag|\bmetro\b|blusmart|\bhpcl\b|\bbpcl\b|\biocl\b|indian ?oil|petrol|\bfuel\b|\bmotors?\b|\btyres?\b|batter(y|ies)|travels?\b|\bcabs?\b|parking`,
  },
  {
    category: 'Health & Fitness',
    pattern: String.raw`apollo|pharmeasy|1mg|netmeds|medplus|practo|cult\.?fit|\bgym\b|fitness|pharma|medical|hospital|clinic|dental|diagnost|\blab\b|health`,
  },
  {
    category: 'Personal care',
    pattern: String.raw`\bsalon\b|\bspa\b|barber|parlou?r|\bhair\b|grooming|beauty`,
  },
  {
    category: 'Bills & Utilities',
    pattern: String.raw`airtel|\bjio\b|vodafone|\bbsnl\b|\bvi\b|bescom|tata ?power|electricity|\bpower\b|broadband|fibernet|recharge|\bgas\b|water ?bill|\bdth\b|postpaid|prepaid`,
  },
  {
    category: 'Shopping',
    pattern: String.raw`amazon|flipkart|myntra|ajio|meesho|nykaa|croma|decathlon|trends|lifestyle|westside|\bstores?\b|boutique`,
  },
  {
    category: 'Other businesses',
    pattern: String.raw`ventures|\bpvt\b|\bltd\b|\bllp\b|enterprises?|traders|industries|solutions|services|technolog|bharatpe|razorpay|payu|cashfree|\bpaytm\b`,
  },
  {
    category: 'People & UPI',
    pattern: String.raw`\bupi/`,
  },
];

const COMPILED = PRESET_RULES.map((rule) => ({ rule, regex: new RegExp(rule.pattern, 'i') }));

// The first preset whose pattern matches `text` (see db/matching.ts matchText).
export function findPreset(text: string): PresetRule | undefined {
  return COMPILED.find((c) => c.regex.test(text))?.rule;
}
