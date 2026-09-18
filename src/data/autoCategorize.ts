// Pure — no expo-sqlite import, unit tested directly.
import { Bucket } from './budget';

export type PresetRule = { category: string; bucket: Bucket; pattern: string };

// Built-in regex rules for common Indian brands, applied only when the
// user taps Auto-categorise. Matched case-insensitively against the
// cleaned merchant name. Ordered most-specific first: first match wins, so
// "Swiggy Instamart" lands in Groceries before the generic swiggy rule in
// Food & Dining. Short tokens are word-bounded so "Kolar" is not Ola.
// ponytail: brand list is hand-curated; extend it as real statements
// show gaps.
export const PRESET_RULES: PresetRule[] = [
  {
    category: 'Groceries',
    bucket: 'needs',
    pattern:
      "instamart|bigbasket|blinkit|zepto|d-?mart|jiomart|reliance (smart|fresh)|nature'?s basket|more retail|country delight|milkbasket|\\bmilk\\b",
  },
  {
    category: 'Food & Dining',
    bucket: 'needs',
    pattern:
      "swiggy|zomato|eatsure|domino|pizza hut|mcdonald|\\bkfc\\b|burger king|starbucks|subway|haldiram|\\bcafe\\b|restaurant",
  },
  {
    category: 'Transport',
    bucket: 'needs',
    pattern:
      'rapido|\\buber\\b|\\bola\\b|redbus|irctc|fastag|namma metro|blusmart|\\bhpcl\\b|\\bbpcl\\b|\\biocl\\b|indian oil|petrol',
  },
  {
    category: 'Shopping',
    bucket: 'needs',
    pattern: 'amazon|flipkart|myntra|ajio|meesho|nykaa|croma|decathlon',
  },
  {
    category: 'Bills & Utilities',
    bucket: 'needs',
    pattern: 'airtel|\\bjio\\b|vodafone|\\bvi\\b|bsnl|bescom|tata power|electricity|broadband|act fibernet|recharge',
  },
  {
    category: 'Subscriptions',
    bucket: 'needs',
    pattern: 'netflix|spotify|hotstar|prime video|youtube|bookmyshow|zee5|sonyliv|crunchyroll|apple\\.com',
  },
  {
    category: 'Health',
    bucket: 'needs',
    pattern: 'apollo|pharmeasy|1mg|netmeds|medplus|practo|cult\\.?fit|pharmacy|hospital|clinic',
  },
  {
    category: 'Investments',
    bucket: 'savings',
    pattern: 'zerodha|groww|upstox|kuvera|indmoney|mutual fund|\\bsip\\b|safegold|\\bnps\\b|\\bppf\\b',
  },
];
