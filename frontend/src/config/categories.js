/**
 * Olafasta Category Configuration
 * Central source of truth for all 7 Olafasta marketplace categories.
 * Used by HomePage, Marketplace filters, Business setup, and Product creation.
 *
 * Brand Colors:
 *   Orange  #FF5E00 — Energy / Speed
 *   DeepGreen #027A2B — Trust / Professional
 *   NeonGreen #6BE319 — Accent / Live
 */

// ─── 7 Olafasta Categories ───────────────────────────────────────────────────

export const OLA_CATEGORIES = [
  {
    id: 'food-drinks-chill',
    label: 'Food, Drinks & Chill',
    emoji: '🍽️',
    iconName: 'UtensilsCrossed',   // Lucide icon name
    description: 'Kibanda meals, restaurants & chilled beverages',
    subcategories: ['Restaurant', 'Wine & Spirits'],
    route: '/marketplace?category=Food%2C+Drinks+%26+Chill',
    gradient: 'from-orange-500 to-red-500',
    accentColor: '#FF5E00',
    bgDark: '#1E0A00',
  },
  {
    id: 'hostel-setup-utilities',
    label: 'Hostel Setup & Utilities',
    emoji: '🏠',
    iconName: 'Home',
    description: 'Gas refill, household goods & mali mali supplies',
    subcategories: ['Gas Refill', 'Mali Mali', 'Households'],
    route: '/marketplace?category=Hostel+Setup+%26+Utilities',
    gradient: 'from-green-600 to-emerald-700',
    accentColor: '#027A2B',
    bgDark: '#001A09',
  },
  {
    id: 'fashion-beauty',
    label: 'Fashion & Beauty',
    emoji: '👗',
    iconName: 'Shirt',
    description: 'Boutiques, mitumba & cosmetics — look sharp, comrade',
    subcategories: ['Boutique', 'Second Hand (Mitumba)', 'Cosmetics'],
    route: '/marketplace?category=Fashion+%26+Beauty',
    gradient: 'from-pink-500 to-rose-600',
    accentColor: '#E91E8C',
    bgDark: '#1A0010',
  },
  {
    id: 'electronics-gadgets',
    label: 'Electronics & Gadgets',
    emoji: '📱',
    iconName: 'Smartphone',
    description: 'Phones, laptops, cables & fast repairs',
    subcategories: ['Electronics', 'Repairs & Accessories'],
    route: '/marketplace?category=Electronics+%26+Gadgets',
    gradient: 'from-blue-500 to-indigo-600',
    accentColor: '#3B82F6',
    bgDark: '#00051A',
  },
  {
    id: 'daily-shops-groceries',
    label: 'Daily Shops & Groceries',
    emoji: '🛒',
    iconName: 'ShoppingBasket',
    description: 'Everyday shopping from your nearest campus kiosk',
    subcategories: ['Shop'],
    route: '/marketplace?category=Daily+Shops+%26+Groceries',
    gradient: 'from-yellow-500 to-orange-500',
    accentColor: '#F59E0B',
    bgDark: '#1A0E00',
  },
  {
    id: 'health-pharmacy',
    label: 'Health & Pharmacy',
    emoji: '💊',
    iconName: 'Pill',
    description: 'Chemists & medicine — stay healthy, comrade',
    subcategories: ['Chemist'],
    route: '/marketplace?category=Health+%26+Pharmacy',
    gradient: 'from-teal-500 to-cyan-600',
    accentColor: '#6BE319',
    bgDark: '#001A14',
  },
  {
    id: 'general-campus-services',
    label: 'General Campus Services',
    emoji: '⚡',
    iconName: 'Zap',
    description: 'Everyday services around Moi University corridors',
    subcategories: ['Everyday Services'],
    route: '/marketplace?category=General+Campus+Services',
    gradient: 'from-[#FF5E00] to-[#027A2B]',
    accentColor: '#6BE319',
    bgDark: '#0A0A00',
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns all unique subcategory strings (for dropdowns / filters) */
export const getAllSubcategories = () =>
  OLA_CATEGORIES.flatMap((cat) => cat.subcategories);

/** Find parent category object by subcategory label */
export const getCategoryBySubcategory = (sub) =>
  OLA_CATEGORIES.find((cat) => cat.subcategories.includes(sub));

/** Find category by id */
export const getCategoryById = (id) =>
  OLA_CATEGORIES.find((cat) => cat.id === id);

/** Flat list of main category labels (for schema validation parity) */
export const CATEGORY_LABELS = OLA_CATEGORIES.map((c) => c.label);

export default OLA_CATEGORIES;
