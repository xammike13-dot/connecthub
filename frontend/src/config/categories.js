/**
 * Olafasta Category Configuration
 * Central source of truth for all 16 official Olafasta categories.
 * Used by HomePage, Category navigation, Marketplace filters, Business setup, and Product creation.
 *
 * Brand Colors:
 *   Orange  #FF5E00 — Energy / Speed (olaOrange)
 *   DeepGreen #027A2B — Trust / Professional (olaGreen-deep)
 *   NeonGreen #6BE319 — Accent / Live (olaGreen-neon)
 */

export const OLA_BUSINESS_CATEGORIES = [
  'Olafasta Foods',
  'Olafasta Mitumba',
  'Olafasta Rentals',
  'Olafasta Tech',
  'Olafasta Chemist',
  'Olafasta Boda',
  'Olafasta Hostels',
  'Olafasta Fashion',
  'Olafasta Shoes',
  'Olafasta Materials',
  'Olafasta Home',
  'Olafasta Stores',
  'Olafasta Cakes',
  'Olafasta Wines & Spirits',
  'Olafasta Gas',
  'Olafasta Kibanda',
];

export const OLA_CATEGORIES = [
  {
    id: 'olafasta-foods',
    label: 'Olafasta Foods',
    shortLabel: 'Foods',
    emoji: '🍔',
    iconName: 'UtensilsCrossed',
    description: 'Kibandas, fast food & chilled beverages',
    subcategories: ['Kibanda', 'Fast Food', 'Restaurant', 'Catering'],
    route: '/marketplace?category=Olafasta+Foods',
    accentColor: '#FF5E00',
    badge: 'Popular',
  },
  {
    id: 'olafasta-mitumba',
    label: 'Olafasta Mitumba',
    shortLabel: 'Mitumba',
    emoji: '👗',
    iconName: 'Shirt',
    description: 'Thrift drops, second-hand clothing & bundles',
    subcategories: ['Thrift Drops', 'Bundles', 'Grade A', 'Grade B'],
    route: '/marketplace?category=Olafasta+Mitumba',
    accentColor: '#E91E8C',
    badge: 'Trending',
  },
  {
    id: 'olafasta-rentals',
    label: 'Olafasta Rentals',
    shortLabel: 'Rentals',
    emoji: '🔑',
    iconName: 'KeyRound',
    description: 'Rooms, bedsitters & apartments for rent',
    subcategories: ['Single Room', 'Bedsitter', 'One Bedroom', 'Apartment', 'Hostel'],
    route: '/rentals',
    accentColor: '#027A2B',
    badge: 'Available',
  },
  {
    id: 'olafasta-tech',
    label: 'Olafasta Tech',
    shortLabel: 'Tech',
    emoji: '🔌',
    iconName: 'Smartphone',
    description: 'Phones, laptops, chargers & accessories',
    subcategories: ['Phones', 'Laptops', 'Chargers', 'Accessories', 'Repairs'],
    route: '/marketplace?category=Olafasta+Tech',
    accentColor: '#3B82F6',
    badge: 'Top Tech',
  },
  {
    id: 'olafasta-chemist',
    label: 'Olafasta Chemist',
    shortLabel: 'Chemist',
    emoji: '💊',
    iconName: 'Pill',
    description: 'Meds, first aid kits & wellness essentials',
    subcategories: ['Meds', 'First Aid', 'Skincare', 'Supplements'],
    route: '/marketplace?category=Olafasta+Chemist',
    accentColor: '#027A2B',
    badge: '24/7',
  },
  {
    id: 'olafasta-boda',
    label: 'Olafasta Boda',
    shortLabel: 'Boda',
    emoji: '🏍️',
    iconName: 'Bike',
    description: 'Boda boda rides & delivery services',
    subcategories: ['Rides', 'Deliveries', 'Express'],
    route: '/transport',
    accentColor: '#FF5E00',
    badge: 'Fast',
  },
  {
    id: 'olafasta-hostels',
    label: 'Olafasta Hostels',
    shortLabel: 'Hostels',
    emoji: '🏠',
    iconName: 'BedDouble',
    description: 'Hostel accommodation & bedsitters',
    subcategories: ['Hostel Bed', 'Bedsitter', 'Shared Room'],
    route: '/rentals',
    accentColor: '#027A2B',
    badge: 'Essential',
  },
  {
    id: 'olafasta-fashion',
    label: 'Olafasta Fashion',
    shortLabel: 'Fashion',
    emoji: '👔',
    iconName: 'Shirt',
    description: 'Boutiques, new clothing & fashion accessories',
    subcategories: ['Boutique', 'Dresses', 'Shirts', 'Accessories', 'Bags'],
    route: '/marketplace?category=Olafasta+Fashion',
    accentColor: '#E91E8C',
    badge: 'Stylish',
  },
  {
    id: 'olafasta-shoes',
    label: 'Olafasta Shoes',
    shortLabel: 'Shoes',
    emoji: '👟',
    iconName: 'Footprints',
    description: 'Sneakers, sandals, heels & shoe repairs',
    subcategories: ['Sneakers', 'Sandals', 'Heels', 'Boots', 'Repairs'],
    route: '/marketplace?category=Olafasta+Shoes',
    accentColor: '#8B5CF6',
    badge: 'Kicks',
  },
  {
    id: 'olafasta-materials',
    label: 'Olafasta Materials',
    shortLabel: 'Materials',
    emoji: '📐',
    iconName: 'Ruler',
    description: 'Building materials, hardware & supplies',
    subcategories: ['Cement', 'Timber', 'Paint', 'Tools', 'Fittings'],
    route: '/marketplace?category=Olafasta+Materials',
    accentColor: '#F59E0B',
    badge: 'Hardware',
  },
  {
    id: 'olafasta-home',
    label: 'Olafasta Home',
    shortLabel: 'Home',
    emoji: '🛋️',
    iconName: 'Sofa',
    description: 'Furniture, bedding, decor & household items',
    subcategories: ['Furniture', 'Bedding', 'Decor', 'Utensils', 'Appliances'],
    route: '/marketplace?category=Olafasta+Home',
    accentColor: '#10B981',
    badge: 'Comfort',
  },
  {
    id: 'olafasta-stores',
    label: 'Olafasta Stores',
    shortLabel: 'Stores',
    emoji: '🏪',
    iconName: 'Store',
    description: 'Daily groceries, snacks & general shop supplies',
    subcategories: ['Groceries', 'Snacks', 'Toiletries', 'Drinks', 'General'],
    route: '/marketplace?category=Olafasta+Stores',
    accentColor: '#F59E0B',
    badge: 'Daily',
  },
  {
    id: 'olafasta-cakes',
    label: 'Olafasta Cakes',
    shortLabel: 'Cakes',
    emoji: '🎂',
    iconName: 'Cake',
    description: 'Custom cakes, pastries & birthday treats',
    subcategories: ['Birthday Cakes', 'Wedding Cakes', 'Cupcakes', 'Pastries'],
    route: '/marketplace?category=Olafasta+Cakes',
    accentColor: '#EC4899',
    badge: 'Sweet',
  },
  {
    id: 'olafasta-wines-spirits',
    label: 'Olafasta Wines & Spirits',
    shortLabel: 'Wines',
    emoji: '🍷',
    iconName: 'Wine',
    description: 'Wines, spirits, beers & chilled beverages',
    subcategories: ['Wine', 'Spirits', 'Beer', 'Whiskey', 'Vodka'],
    route: '/marketplace?category=Olafasta+Wines+%26+Spirits',
    accentColor: '#7C3AED',
    badge: 'Chill',
  },
  {
    id: 'olafasta-gas',
    label: 'Olafasta Gas',
    shortLabel: 'Gas',
    emoji: '🔥',
    iconName: 'Flame',
    description: 'Gas refills, cylinders & accessories',
    subcategories: ['Refill', 'Cylinders', 'Accessories', 'Delivery'],
    route: '/marketplace?category=Olafasta+Gas',
    accentColor: '#FF5E00',
    badge: 'Essential',
  },
  {
    id: 'olafasta-kibanda',
    label: 'Olafasta Kibanda',
    shortLabel: 'Kibanda',
    emoji: '🍲',
    iconName: 'Cookpot',
    description: 'Local food kiosks & home-cooked meals',
    subcategories: ['Githeri', 'Chapo', 'Beans', 'Rice', 'Tea'],
    route: '/marketplace?category=Olafasta+Kibanda',
    accentColor: '#FF5E00',
    badge: 'Hot',
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
