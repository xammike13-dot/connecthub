/**
 * Olafasta Category Configuration
 * Central source of truth for all 21 official categories.
 * Reordered to prioritize daily survival and emergency campus essentials first:
 * Transport (Bodaboda), Cooking (Gas Refill), Hunger (Food & Kibanda), Health (Chemist), and Groceries (Mini-Mart & Soko).
 *
 * Brand Colors:
 *   Orange    #FF5E00 — Energy / Speed (olaOrange)
 *   DeepGreen #027A2B — Trust / Professional (olaGreen-deep)
 *   NeonGreen #6BE319 — Accent / Live (olaGreen-neon)
 */

import {
  Bike,
  Flame,
  UtensilsCrossed,
  CookingPot,
  Pill,
  Store,
  ShoppingBasket,
  Shirt,
  Sparkles,
  Footprints,
  Smartphone,
  KeyRound,
  BedDouble,
  Sofa,
  Package,
  Wine,
  Cake,
  Scissors,
  Printer,
  Gamepad2,
  Tv,
} from 'lucide-react';

/**
 * Lucide icon component map for dynamic rendering
 */
export const CATEGORY_ICONS = {
  Bike,
  Flame,
  UtensilsCrossed,
  CookingPot,
  Pill,
  Store,
  ShoppingBasket,
  Shirt,
  Sparkles,
  Footprints,
  Smartphone,
  KeyRound,
  BedDouble,
  Sofa,
  Package,
  Wine,
  Cake,
  Scissors,
  Printer,
  Gamepad2,
  Tv,
};

/**
 * 21 Clean Official Business Categories prioritized by urgency & daily necessity
 */
export const OLA_BUSINESS_CATEGORIES = [
  'Bodaboda Rides',
  'Gas Refill',
  'Food & Drinks',
  'Kibanda Meals',
  'Chemist & Wellness',
  'Mini-Mart',
  'Soko (Fresh Produce)',
  'Mitumba (Thrift Clothes)',
  'Fashion & Boutiques',
  'Shoes & Kicks',
  'Tech & Gadgets',
  'Rentals & Bedsitters',
  'Hostels',
  'Home & Bedding',
  'Mali Mali (Plastics)',
  'Wines & Spirits',
  'Cakes & Pastries',
  'Grooming & Salons',
  'Print & Stationery',
  'Gaming & Subs',
  'Second-Hand Market',
];

/**
 * Complete Category Roster prioritized for high conversion & immediate comrade utility.
 * Renders immediately after the "All" tab so users instantly see:
 * "All", "Bodaboda", "Gas Refill", "Food & Drinks", "Kibanda", "Chemist"
 */
export const OLA_CATEGORIES = [
  // ── 1. High Urgency Transport ──────────────────────────
  {
    id: 'bodaboda-rides',
    slug: 'boda',
    archetype: 'service',
    label: 'Bodaboda Rides',
    shortLabel: 'Bodaboda',
    tagline: 'Rides & Courier',
    emoji: '🏍️',
    iconName: 'Bike',
    description: 'Campus rider rides, parcel delivery, market runs & instant logistics',
    subcategories: ['Campus Rides', 'Hostel Deliveries', 'Market Courier', 'Late Night Pickup'],
    route: '/transport',
    accentColor: '#FF5E00',
    lightBg: 'bg-orange-50',
    borderColor: 'border-orange-200',
    badge: 'Fast Rides',
  },

  // ── 2. Emergency Hostel Utility ────────────────────────
  {
    id: 'gas-refill',
    slug: 'gas-refill',
    archetype: 'service',
    label: 'Gas Refill',
    shortLabel: 'Gas Refill',
    tagline: 'Refills & Cylinders',
    emoji: '🔥',
    iconName: 'Flame',
    description: '6kg & 13kg gas refills, new cylinders, burners, regulators & door delivery',
    subcategories: ['6kg Refill', '13kg Refill', 'Complete Cylinder Set', 'Burners & Grills', 'Regulators & Pipes'],
    route: '/c/gas-refill',
    accentColor: '#EF4444',
    lightBg: 'bg-red-50',
    borderColor: 'border-red-200',
    badge: 'Fast Refill',
  },

  // ── 3. Hunger: Fast Food & Restaurants ─────────────────
  {
    id: 'food-drinks',
    slug: 'food-drinks',
    archetype: 'food',
    label: 'Food & Drinks',
    shortLabel: 'Food & Drinks',
    tagline: 'Fast Food / Restaurants',
    emoji: '🍔',
    iconName: 'UtensilsCrossed',
    description: 'Fast food joints, campus takeaways, chicken, fries & burgers',
    subcategories: ['Fast Food', 'Burgers & Fries', 'Pizza', 'Fried Chicken', 'Snacks & Bites', 'Beverages'],
    route: '/c/food-drinks',
    accentColor: '#FF5E00',
    lightBg: 'bg-orange-50',
    borderColor: 'border-orange-200',
    badge: 'Popular',
  },

  // ── 4. Affordable Daily Local Food ─────────────────────
  {
    id: 'kibanda-meals',
    slug: 'kibanda',
    archetype: 'food',
    label: 'Kibanda Meals',
    shortLabel: 'Kibanda',
    tagline: 'Local Hot Meals',
    emoji: '🍲',
    iconName: 'CookingPot',
    description: 'Fresh local campus meals: ugali, chapo, sukuma, beef stew & githeri',
    subcategories: ['Ugali & Beef', 'Chapo & Beans', 'Githeri Specials', 'Rice & Ndengu', 'Chai & Mandazi'],
    route: '/c/kibanda',
    accentColor: '#EA580C',
    lightBg: 'bg-amber-50',
    borderColor: 'border-amber-200',
    badge: 'Hot Meals',
  },

  // ── 5. Urgent Health & Wellness ────────────────────────
  {
    id: 'chemist-wellness',
    slug: 'chemist',
    archetype: 'retail',
    label: 'Chemist & Wellness',
    shortLabel: 'Chemist',
    tagline: 'Meds & Health',
    emoji: '💊',
    iconName: 'Pill',
    description: 'Pain relief, first aid, emergency meds, skincare & wellness supplies',
    subcategories: ['Pain Relief & Flu', 'First Aid Kits', 'Vitamins & Zinc', 'Skincare & Sunscreen', 'Wellness & Hygiene'],
    route: '/c/chemist',
    accentColor: '#027A2B',
    lightBg: 'bg-green-50',
    borderColor: 'border-green-200',
    badge: '24/7 Meds',
  },

  // ── 6. Daily Groceries & Essentials ────────────────────
  {
    id: 'mini-mart',
    slug: 'mini-mart',
    archetype: 'retail',
    label: 'Mini-Mart',
    shortLabel: 'Mini-Mart',
    tagline: 'Daily Essentials',
    emoji: '🏪',
    iconName: 'Store',
    description: 'Daily mini-mart supplies: cooking oil, salt, milk, bar soaps & detergents',
    subcategories: ['Cooking Staples', 'Milk & Dairy', 'Detergents & Soaps', 'Toiletries & Tissues', 'Snacks & Sodas'],
    route: '/c/mini-mart',
    accentColor: '#CA8A04',
    lightBg: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    badge: 'Daily Needs',
  },

  // ── 7. Fresh Farm Produce & Eggs ───────────────────────
  {
    id: 'soko-produce',
    slug: 'soko',
    archetype: 'food',
    label: 'Soko (Fresh Produce)',
    shortLabel: 'Soko',
    tagline: 'Groceries & Eggs',
    emoji: '🥬',
    iconName: 'ShoppingBasket',
    description: 'Fresh kienyeji eggs, vegetables, fruits, onions & tomatoes from the farm',
    subcategories: ['Fresh Greens & Kales', 'Crates of Eggs', 'Fruits', 'Tomatoes & Onions', 'Potatoes & Cereals'],
    route: '/c/soko',
    accentColor: '#16A34A',
    lightBg: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    badge: 'Fresh',
  },

  // ── 8. Grade A Thrift Clothes ──────────────────────────
  {
    id: 'mitumba-thrift',
    slug: 'mitumba',
    archetype: 'retail',
    label: 'Mitumba (Thrift Clothes)',
    shortLabel: 'Mitumba',
    tagline: 'Grade A Thrift',
    emoji: '👗',
    iconName: 'Shirt',
    description: 'Grade A thrift drops: denim jeans, hoodies, tees, thrift jackets & bales',
    subcategories: ['Vintage Denim', 'Hoodies & Sweatshirts', 'Graphic Tees', 'Cargo Pants', 'Flannel Shirts'],
    route: '/c/mitumba',
    accentColor: '#D946EF',
    lightBg: 'bg-fuchsia-50',
    borderColor: 'border-fuchsia-200',
    badge: 'Trending',
  },

  // ── 9. Campus Boutiques ────────────────────────────────
  {
    id: 'fashion-boutiques',
    slug: 'fashion',
    archetype: 'retail',
    label: 'Fashion & Boutiques',
    shortLabel: 'Fashion',
    tagline: 'Campus Boutiques',
    emoji: '✨',
    iconName: 'Sparkles',
    description: 'Campus boutique wear, trendy dresses, official blazers & accessories',
    subcategories: ['Boutique Dresses', 'Official Attire', 'Casual Sets', 'Jewelry & Watches', 'Handbags & Totes'],
    route: '/c/fashion',
    accentColor: '#F43F5E',
    lightBg: 'bg-rose-50',
    borderColor: 'border-rose-200',
    badge: 'Boutique',
  },

  // ── 10. Sneakers & Footwear ────────────────────────────
  {
    id: 'shoes-kicks',
    slug: 'shoes',
    archetype: 'retail',
    label: 'Shoes & Kicks',
    shortLabel: 'Shoes & Kicks',
    tagline: 'Sneakers & Official',
    emoji: '👟',
    iconName: 'Footprints',
    description: 'Streetwear sneakers, slides, loafers, boots & official shoes',
    subcategories: ['Sneakers & Kicks', 'Official Loafers', 'Slides & Sandals', 'Boots', 'Shoe Polish & Laces'],
    route: '/c/shoes',
    accentColor: '#6366F1',
    lightBg: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    badge: 'Kicks',
  },

  // ── 11. Phones, Laptops & Tech ─────────────────────────
  {
    id: 'tech-gadgets',
    slug: 'tech',
    archetype: 'retail',
    label: 'Tech & Gadgets',
    shortLabel: 'Tech & Gadgets',
    tagline: 'Phones & Laptops',
    emoji: '💻',
    iconName: 'Smartphone',
    description: 'Smartphones, laptops, powerbanks, fast-chargers & hardware screen repairs',
    subcategories: ['Smartphones', 'Laptops & MacBooks', 'Power Banks', 'Earbuds & Headphones', 'Fast Chargers & Cables', 'Repairs'],
    route: '/c/tech',
    accentColor: '#2563EB',
    lightBg: 'bg-blue-50',
    borderColor: 'border-blue-200',
    badge: 'Top Tech',
  },

  // ── 12. Bedsitters & Rooms ─────────────────────────────
  {
    id: 'rentals-bedsitters',
    slug: 'rentals',
    archetype: 'housing',
    label: 'Rentals & Bedsitters',
    shortLabel: 'Rentals',
    tagline: 'Rooms & Apartments',
    emoji: '🔑',
    iconName: 'KeyRound',
    description: 'Verified vacant bedsitters, single rooms & apartments around campus',
    subcategories: ['Bedsitters', 'Single Rooms', '1-Bedroom', '2-Bedroom', 'Commercial Stalls'],
    route: '/c/rentals',
    accentColor: '#047857',
    lightBg: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    badge: 'Verified',
  },

  // ── 13. Student Hostels ────────────────────────────────
  {
    id: 'hostels',
    slug: 'hostels',
    archetype: 'housing',
    label: 'Hostels',
    shortLabel: 'Hostels',
    tagline: 'Student Accommodations',
    emoji: '🏠',
    iconName: 'BedDouble',
    description: 'Private student hostels, shared dorms & semester booking accommodation',
    subcategories: ['Private Hostels', 'Shared Hostels', 'Executive Hostels', 'En-suite Rooms'],
    route: '/c/hostels',
    accentColor: '#0891B2',
    lightBg: 'bg-cyan-50',
    borderColor: 'border-cyan-200',
    badge: 'Student Beds',
  },

  // ── 14. Bedding & Curtains ─────────────────────────────
  {
    id: 'home-bedding',
    slug: 'home',
    archetype: 'retail',
    label: 'Home & Bedding',
    shortLabel: 'Home & Bedding',
    tagline: 'Bedding & Furniture',
    emoji: '🛋️',
    iconName: 'Sofa',
    description: 'Velvet duvets, mosquito nets, curtains, bed sheets, study tables & carpets',
    subcategories: ['Heavy Duvets & Sheets', 'Curtains & Rods', 'Pillows & Mattress Covers', 'Hostel Carpets', 'Study Desks'],
    route: '/c/home',
    accentColor: '#0284C7',
    lightBg: 'bg-sky-50',
    borderColor: 'border-sky-200',
    badge: 'Comfort',
  },

  // ── 15. Buckets & Plastics ─────────────────────────────
  {
    id: 'mali-mali',
    slug: 'mali-mali',
    archetype: 'retail',
    label: 'Mali Mali (Plastics)',
    shortLabel: 'Mali Mali',
    tagline: 'Buckets & Plastics',
    emoji: '🪣',
    iconName: 'Package',
    description: 'Heavy water buckets, laundry basins, pegs, hangers, cutlery & storage racks',
    subcategories: ['Water Buckets & Drums', 'Laundry Basins', 'Shoe & Clothes Racks', 'Pegs & Hangers', 'Kitchen Utensils'],
    route: '/c/mali-mali',
    accentColor: '#D97706',
    lightBg: 'bg-amber-50',
    borderColor: 'border-amber-200',
    badge: 'Essentials',
  },

  // ── 16. Chilled Party Drinks ───────────────────────────
  {
    id: 'wines-spirits',
    slug: 'wines',
    archetype: 'food',
    label: 'Wines & Spirits',
    shortLabel: 'Wines & Spirits',
    tagline: 'Chilled Drinks',
    emoji: '🍷',
    iconName: 'Wine',
    description: 'Chilled lagers, spirits, wines, cider & party drinks delivered cold',
    subcategories: ['Chilled Beers', 'Whiskey', 'Gin & Vodka', 'Wines', 'Cocktails & Ciders', 'Ice & Chasers'],
    route: '/c/wines',
    accentColor: '#7C3AED',
    lightBg: 'bg-purple-50',
    borderColor: 'border-purple-200',
    badge: 'Chilled',
  },

  // ── 17. Custom Pastries & Cakes ────────────────────────
  {
    id: 'cakes-pastries',
    slug: 'cakes',
    archetype: 'food',
    label: 'Cakes & Pastries',
    shortLabel: 'Cakes',
    tagline: 'Birthdays & Events',
    emoji: '🎂',
    iconName: 'Cake',
    description: 'Custom birthday cakes, cupcakes, campus party pastries & bakes',
    subcategories: ['Birthday Cakes', 'Cupcakes', 'Event Cakes', 'Bento Cakes', 'Pastries & Cookies'],
    route: '/c/cakes',
    accentColor: '#EC4899',
    lightBg: 'bg-pink-50',
    borderColor: 'border-pink-200',
    badge: 'Sweet',
  },

  // ── 18. Salons & Kinyozi ───────────────────────────────
  {
    id: 'grooming-salons',
    slug: 'grooming',
    archetype: 'service',
    label: 'Grooming & Salons',
    shortLabel: 'Grooming',
    tagline: 'Salons & Kinyozi',
    emoji: '💈',
    iconName: 'Scissors',
    description: 'Barber fades, dreadlock retwists, knotless braids, manicures & facials',
    subcategories: ['Kinyozi Clean Cuts', 'Braiding & Weaving', 'Dreadlocks & Retwist', 'Manicure & Pedicure', 'Hair Dye & Care'],
    route: '/c/grooming',
    accentColor: '#8B5CF6',
    lightBg: 'bg-purple-50',
    borderColor: 'border-purple-200',
    badge: 'Fresh Look',
  },

  // ── 19. Stationery & Printing ──────────────────────────
  {
    id: 'print-stationery',
    slug: 'print',
    archetype: 'service',
    label: 'Print & Stationery',
    shortLabel: 'Print & Station',
    tagline: 'Assignments & Books',
    emoji: '🖨️',
    iconName: 'Printer',
    description: 'Assignment printing, spiral binding, photocopying, laminating & stationery',
    subcategories: ['Assignment Printing', 'Spiral Binding', 'Photocopy & Scanning', 'Calculators & Pens', 'Printing Paper Reams'],
    route: '/c/print',
    accentColor: '#475569',
    lightBg: 'bg-slate-50',
    borderColor: 'border-slate-200',
    badge: 'Academics',
  },

  // ── 20. Gaming & PS5 ───────────────────────────────────
  {
    id: 'gaming-subs',
    slug: 'gaming',
    archetype: 'service',
    label: 'Gaming & Subs',
    shortLabel: 'Gaming',
    tagline: 'PS5 & Gaming Pass',
    emoji: '🎮',
    iconName: 'Gamepad2',
    description: 'PS5 console time bookings, FIFA tournaments, PlayStation Plus & game passes',
    subcategories: ['PS5 Hourly Bookings', 'FIFA Matches', 'PlayStation Plus Subs', 'Gaming Accessories', 'Tournament Entries'],
    route: '/c/gaming',
    accentColor: '#E11D48',
    lightBg: 'bg-rose-50',
    borderColor: 'border-rose-200',
    badge: 'Play Now',
  },

  // ── 21. Comrade Second-Hand Deals ──────────────────────
  {
    id: 'second-hand-market',
    slug: 'thrift',
    archetype: 'retail',
    label: 'Second-Hand Market',
    shortLabel: 'Second-Hand',
    tagline: 'Comrade Deals',
    emoji: '📻',
    iconName: 'Tv',
    description: 'Comrade-to-comrade second-hand market: used subwoofers, TVs, beds & furniture',
    subcategories: ['Used Subwoofers', 'Used TVs & Monitors', 'Beds & Desks', 'Hostel Utensils', 'Pre-loved Electronics'],
    route: '/c/thrift',
    accentColor: '#B45309',
    lightBg: 'bg-amber-50',
    borderColor: 'border-amber-200',
    badge: 'Pre-Loved',
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns the Lucide icon component corresponding to iconName */
export const getCategoryIcon = (iconName) => {
  return CATEGORY_ICONS[iconName] || CATEGORY_ICONS.Sparkles;
};

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


/** Archetype constants */
export const CATEGORY_ARCHETYPES = {
  RETAIL: 'retail',
  FOOD: 'food',
  HOUSING: 'housing',
  SERVICE: 'service',
};

/** Find category by URL slug (or legacy id) */
export const getCategoryBySlug = (slug) => {
  if (!slug) return null;
  const clean = slug.toLowerCase().trim();
  return OLA_CATEGORIES.find((cat) => cat.slug === clean || cat.id === clean);
};

export default OLA_CATEGORIES;
