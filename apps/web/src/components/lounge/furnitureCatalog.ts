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
    variants: ['green', 'rose', 'blue', 'gold'],
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
