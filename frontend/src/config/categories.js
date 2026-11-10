/**
 * Olafasta Category Configuration
 * Central source of truth for all 11 Olafasta comrade micro-economies.
 * Used by HomePage, Category navigation, Marketplace filters, Business setup, and Product creation.
 *
 * Brand Colors:
 *   Orange  #FF5E00 — Energy / Speed (olaOrange)
 *   DeepGreen #027A2B — Trust / Professional (olaGreen-deep)
 *   NeonGreen #6BE319 — Accent / Live (olaGreen-neon)
 */

export const OLA_CATEGORIES = [
  {
    id: 'food-drinks',
    label: 'Food & Drinks',
    shortLabel: 'Food',
    emoji: '🍔',
    iconName: 'UtensilsCrossed',
    description: 'Kibandas, fast food & chilled beverages',
    subcategories: ['Kibandas', 'Fast Food', 'Liquor & Drinks'],
    route: '/marketplace?category=Food+%26+Drinks',
    accentColor: '#FF5E00',
    badge: 'Popular',
  },
  {
    id: 'hostel-setup',
    label: 'Hostel Setup',
    shortLabel: 'Hostel',
    emoji: '🏠',
    iconName: 'Home',
    description: 'Gas refill, mali mali supplies & room bedding',
    subcategories: ['Gas Refill', 'Mali Mali', 'Bedding & Curtains'],
    route: '/marketplace?category=Hostel+Setup',
    accentColor: '#027A2B',
    badge: 'Essential',
  },
  {
    id: 'fashion-mitumba',
    label: 'Fashion & Mitumba',
    shortLabel: 'Mitumba',
    emoji: '👗',
    iconName: 'Shirt',
    description: 'Thrift drops, boutiques & kicks/shoes',
    subcategories: ['Thrift Drops (Mitumba)', 'Boutiques', 'Kicks & Shoes'],
    route: '/marketplace?category=Fashion+%26+Mitumba',
    accentColor: '#E91E8C',
    badge: 'Trending',
  },
  {
    id: 'tech-gadgets',
    label: 'Tech & Gadgets',
    shortLabel: 'Tech',
    emoji: '🔌',
    iconName: 'Smartphone',
    description: 'Phones, laptops, chargers & fast screen repairs',
    subcategories: ['Phones', 'Laptops', 'Chargers & Cables', 'Screen Repairs'],
    route: '/marketplace?category=Tech+%26+Gadgets',
    accentColor: '#3B82F6',
    badge: 'Top Tech',
  },
  {
    id: 'mini-mart',
    label: 'Mini-Mart',
    shortLabel: 'Mart',
    emoji: '🏪',
    iconName: 'Store',
    description: 'Daily groceries, snacks & room toiletries',
    subcategories: ['Daily Groceries', 'Snacks', 'Toiletries'],
    route: '/marketplace?category=Mini-Mart',
    accentColor: '#F59E0B',
    badge: 'Daily',
  },
  {
    id: 'chemist-wellness',
    label: 'Chemist & Wellness',
    shortLabel: 'Chemist',
    emoji: '💊',
    iconName: 'Pill',
    description: 'Meds, first aid kits & skincare essentials',
    subcategories: ['Meds & Painkillers', 'First Aid', 'Skincare'],
    route: '/marketplace?category=Chemist+%26+Wellness',
    accentColor: '#027A2B',
    badge: '24/7',
  },
  {
    id: 'kinyozi-salon',
    label: 'Kinyozi & Salon',
    shortLabel: 'Kinyozi',
    emoji: '💇🏽‍♀️',
    iconName: 'Scissors',
    description: 'Barbers, braiding, dreadlocks & styling',
    subcategories: ['Barbers (Kinyozi)', 'Braiding & Weaving', 'Dreadlocks'],
    route: '/marketplace?category=Kinyozi+%26+Salon',
    accentColor: '#8B5CF6',
    badge: 'Grooming',
  },
  {
    id: 'printing-academics',
    label: 'Printing & Academics',
    shortLabel: 'Printing',
    emoji: '🖨️',
    iconName: 'Printer',
    description: 'Assignment typing, lab reports & fast delivery',
    subcategories: ['Assignment Typing', 'Lab Reports', 'Printing Delivery'],
    route: '/marketplace?category=Printing+%26+Academics',
    accentColor: '#0EA5E9',
    badge: 'Campus',
  },
  {
    id: 'gaming-accounts',
    label: 'Gaming & Accounts',
    shortLabel: 'Gaming',
    emoji: '🎮',
    iconName: 'Gamepad2',
    description: 'FIFA pad rentals, Netflix/Spotify accounts & PS4 games',
    subcategories: ['FIFA Pad Rentals', 'Netflix & Spotify Accounts', 'PS4 Games'],
    route: '/marketplace?category=Gaming+%26+Accounts',
    accentColor: '#EC4899',
    badge: 'Fun',
  },
  {
    id: 'events-tickets',
    label: 'Events & Tickets',
    shortLabel: 'Events',
    emoji: '🎟️',
    iconName: 'Ticket',
    description: 'Campus bash tickets, hikes & pageants',
    subcategories: ['Campus Bash Tickets', 'Hikes & Trips', 'Pageants & Shows'],
    route: '/marketplace?category=Events+%26+Tickets',
    accentColor: '#FF5E00',
    badge: 'Hype',
  },
  {
    id: 'fitness-sports',
    label: 'Fitness & Sports',
    shortLabel: 'Fitness',
    emoji: '🏋️‍♂️',
    iconName: 'Dumbbell',
    description: 'Gym wear, whey protein & football boots',
    subcategories: ['Gym Wear', 'Protein & Supplements', 'Football Boots'],
    route: '/marketplace?category=Fitness+%26+Sports',
    accentColor: '#10B981',
    badge: 'Active',
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
