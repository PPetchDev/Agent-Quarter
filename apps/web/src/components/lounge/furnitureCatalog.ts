// Catalog of all furniture types available in the shop

import type { Rotation } from './roomDefs';

export interface CatalogItem {
  type: string;
  label: string;
  description: string;
  icon: string;
  happiness: number;
  cost: number;
  /** Decor token price (Azur Lane dual-currency furniture). */
  tokenCost: number;
  draggable: boolean;
  category: 'essential' | 'decor' | 'entertainment' | 'wall';
  /** Optional default quarter-turn rotation applied on spawn. Absent = 0. */
  rotation?: Rotation;
  /** Optional variant tags for duplicates (e.g. zabuton colors). First entry is the default. */
  variants?: readonly string[];
  /** Optional flag for shop/editor: whether this item supports rotation. */
  rotatable?: boolean;
  /** Quarter-turns a rotatable item may take. Absent = all four. */
  rotations?: readonly Rotation[];
}

/** Zabuton colour palettes keyed by variant; the first key is the default. */
export const ZABUTON_PALETTES = {
  green: { top: 0x4a5830, front: 0x3a4828, side: 0x2e3c20 },
  rose: { top: 0x6a3a3a, front: 0x5a2a2a, side: 0x4a2020 },
  blue: { top: 0x3a5a6a, front: 0x2a4a5a, side: 0x203040 },
  gold: { top: 0x8a6a2a, front: 0x7a5a1c, side: 0x5e4414 },
} as const;

type ZabutonVariant = keyof typeof ZABUTON_PALETTES;

// Older maps use these names for the same colours.
const ZABUTON_VARIANT_ALIASES: Record<string, ZabutonVariant> = { red: 'rose', default: 'green' };

/** Palette for a zabuton variant, resolving legacy aliases and falling back to green. */
export function zabutonPalette(variant: string | undefined) {
  const key = (variant && ZABUTON_VARIANT_ALIASES[variant]) ?? variant;
  return key && key in ZABUTON_PALETTES
    ? ZABUTON_PALETTES[key as ZabutonVariant]
    : ZABUTON_PALETTES.green;
}

export const FURNITURE_CATALOG: CatalogItem[] = [
  {
    type: 'bed',
    label: 'Wooden Bed',
    description: 'A cozy bed with blue bedding',
    icon: '🛏',
    happiness: 15,
    cost: 250,
    tokenCost: 5,
    draggable: true,
    category: 'essential',
  },
  {
    type: 'nightstand',
    label: 'Nightstand',
    description: 'A small wooden nightstand with a lantern',
    icon: '🪔',
    happiness: 5,
    cost: 80,
    tokenCost: 1,
    draggable: true,
    category: 'essential',
  },
  {
    type: 'computer_desk',
    label: 'Computer Workstation',
    description: 'A coding desk with monitor, keyboard, and workstation notes',
    icon: '💻',
    happiness: 14,
    cost: 260,
    tokenCost: 5,
    draggable: true,
    category: 'essential',
  },
  {
    type: 'printer',
    label: 'Printer Station',
    description: 'A compact printer and utility station for exports',
    icon: '🖨',
    happiness: 8,
    cost: 140,
    tokenCost: 2,
    draggable: true,
    category: 'essential',
  },
  {
    type: 'document_board',
    label: 'Document Board',
    description: 'A wall board for plans, documents, and task notes',
    icon: '📝',
    happiness: 7,
    cost: 130,
    tokenCost: 2,
    draggable: false,
    category: 'wall',
  },
  {
    type: 'tv_stand',
    label: 'TV Stand',
    description: 'Dark wood TV stand with drawers',
    icon: '📺',
    happiness: 8,
    cost: 120,
    tokenCost: 2,
    draggable: true,
    category: 'entertainment',
  },
  {
    type: 'tv',
    label: 'Flat Screen TV',
    description: 'A large flat screen TV for movies and gaming',
    icon: '📺',
    happiness: 12,
    cost: 200,
    tokenCost: 4,
    draggable: false,
    category: 'entertainment',
  },
  {
    type: 'bookcase',
    label: 'Bookcase',
    description: 'A tall bookcase packed with colorful books',
    icon: '📚',
    happiness: 10,
    cost: 150,
    tokenCost: 3,
    draggable: true,
    category: 'essential',
    rotatable: true,
    // Book spines are drawn on the front face; at 180°/270° that face points away.
    rotations: [0, 1],
  },
  {
    type: 'pool_table',
    label: 'Pool Table',
    description: 'A full-size billiards table',
    icon: '🎱',
    happiness: 20,
    cost: 400,
    tokenCost: 7,
    draggable: true,
    category: 'entertainment',
  },
  {
    type: 'low_table',
    label: 'Tea Table',
    description: 'A low Japanese tea table',
    icon: '🍵',
    happiness: 8,
    cost: 100,
    tokenCost: 2,
    draggable: true,
    category: 'essential',
    rotatable: true,
  },
  {
    type: 'zabuton',
    label: 'Floor Cushion',
    description: 'A soft zabuton floor cushion',
    icon: '🪑',
    happiness: 4,
    cost: 40,
    tokenCost: 1,
    draggable: true,
    category: 'essential',
    variants: Object.keys(ZABUTON_PALETTES),
    rotatable: true,
  },
  {
    type: 'plant',
    label: 'Tropical Plant',
    description: 'A lush plant in a terracotta pot',
    icon: '🪴',
    happiness: 7,
    cost: 90,
    tokenCost: 2,
    draggable: true,
    category: 'decor',
  },
  {
    type: 'hanging_scroll',
    label: 'Hanging Scroll',
    description: 'An autumn fox painting scroll',
    icon: '🖼',
    happiness: 6,
    cost: 110,
    tokenCost: 2,
    draggable: false,
    category: 'wall',
  },
  {
    type: 'wall_shelf',
    label: 'Wall Shelf',
    description: 'A shelf with books and a lantern',
    icon: '📦',
    happiness: 5,
    cost: 70,
    tokenCost: 1,
    draggable: false,
    category: 'wall',
  },
];

export function getCatalogItem(type: string): CatalogItem | undefined {
  return FURNITURE_CATALOG.find((c) => c.type === type);
}

// Default spawn position when adding from shop (center of floor)
export function getDefaultSpawnPosition(type: string): { wx: number; wy: number; wz: number } {
  const catalog = getCatalogItem(type);
  if (!catalog) return { wx: 4, wy: 3, wz: 0 };
  // Wall items spawn on the back wall
  if (catalog.category === 'wall') {
    return { wx: 4, wy: 7, wz: 2.0 };
  }
  // Floor items spawn near center
  return { wx: 4, wy: 3, wz: 0 };
}
