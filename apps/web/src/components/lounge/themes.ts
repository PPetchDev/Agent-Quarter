export type RoomTheme = {
  label: string;
  accent: string;
  skyTop: string;
  skyMid: string;
  skyBot: string;
  hasMoon: boolean;
  hasSun: boolean;
  sunY: number;
  sunCol: string;
  sunGlow: string;
  winSky: string[];
  bwA: string;
  bwB: string;
  bwC: string;
  lwA: string;
  lwB: string;
  lwC: string;
  flA: string;
  flB: string;
  curtain: string;
  woodT: string;
  woodF: string;
  woodS: string;
  chairT: string;
  chairF: string;
  chairS: string;
  bedTop: string;
  bedS: string;
  blanket: string;
  amb: string;
  lampOn: boolean;
};

export const THEMES: Record<string, RoomTheme> = {
  night: {
    label: '🌙 กลางคืน',
    accent: '#f0abfc',
    skyTop: '#060318',
    skyMid: '#0d0728',
    skyBot: '#1a1040',
    hasMoon: true,
    hasSun: false,
    sunY: 0,
    sunCol: '#fff',
    sunGlow: 'transparent',
    winSky: ['#080428', '#10083a', '#180c54', '#1e1060'],
    bwA: '#ece4fc',
    bwB: '#e0d8f5',
    bwC: '#d4ccea',
    lwA: '#f8f4ff',
    lwB: '#f0eafd',
    lwC: '#e6defc',
    flA: '#cfc0f0',
    flB: '#baaee4',
    curtain: 'rgba(245,240,255,0.83)',
    woodT: '#c49060',
    woodF: '#9a7040',
    woodS: '#855e30',
    chairT: '#e87050',
    chairF: '#c85c3a',
    chairS: '#a84828',
    bedTop: '#eee8ff',
    bedS: '#d8d0f0',
    blanket: '#b39be8',
    amb: 'rgba(160,130,255,0.06)',
    lampOn: true,
  },
  dawn: {
    label: '🌅 เช้าตรู่',
    accent: '#ffa07a',
    skyTop: '#1c052e',
    skyMid: '#8b1a4a',
    skyBot: '#ff6030',
    hasMoon: false,
    hasSun: true,
    sunY: 0.82,
    sunCol: '#ff7043',
    sunGlow: 'rgba(255,100,50,0.28)',
    winSky: ['#20062e', '#9a1e50', '#e03820', '#ff7030'],
    bwA: '#ffe8e0',
    bwB: '#fdd8cc',
    bwC: '#f8c8b8',
    lwA: '#fff4ee',
    lwB: '#ffece4',
    lwC: '#ffe4d8',
    flA: '#e8d0b8',
    flB: '#d4b898',
    curtain: 'rgba(255,240,235,0.83)',
    woodT: '#c89060',
    woodF: '#a07040',
    woodS: '#8a5e28',
    chairT: '#e06040',
    chairF: '#c04828',
    chairS: '#a03018',
    bedTop: '#fff0e8',
    bedS: '#f0d8c8',
    blanket: '#e8a080',
    amb: 'rgba(255,120,60,0.09)',
    lampOn: true,
  },
  morning: {
    label: '🌤️ เช้า',
    accent: '#38b4f8',
    skyTop: '#4a9fd4',
    skyMid: '#7ac0e8',
    skyBot: '#a8d8f0',
    hasMoon: false,
    hasSun: true,
    sunY: 0.35,
    sunCol: '#fbbf24',
    sunGlow: 'rgba(251,191,36,0.3)',
    winSky: ['#3a8ac0', '#6ab4e0', '#90ccf0', '#b8e4f8'],
    bwA: '#f8f4ee',
    bwB: '#f2ece4',
    bwC: '#ebe4da',
    lwA: '#ffffff',
    lwB: '#fcfaf7',
    lwC: '#f8f4ef',
    flA: '#e0d8c0',
    flB: '#ccc4aa',
    curtain: 'rgba(255,255,252,0.83)',
    woodT: '#c8a870',
    woodF: '#a07840',
    woodS: '#8a6430',
    chairT: '#e87050',
    chairF: '#c85c3a',
    chairS: '#a84828',
    bedTop: '#f8f4ee',
    bedS: '#e8e0d4',
    blanket: '#d0c8b0',
    amb: 'rgba(255,220,120,0.08)',
    lampOn: false,
  },
  afternoon: {
    label: '☀️ บ่าย',
    accent: '#38b4f8',
    skyTop: '#1a78c2',
    skyMid: '#3a9ae0',
    skyBot: '#70bef5',
    hasMoon: false,
    hasSun: true,
    sunY: 0.12,
    sunCol: '#f59e0b',
    sunGlow: 'rgba(245,158,11,0.25)',
    winSky: ['#1060a8', '#3080cc', '#58a4ec', '#80c4f8'],
    bwA: '#f8f5f0',
    bwB: '#f2ede8',
    bwC: '#ece7e0',
    lwA: '#ffffff',
    lwB: '#fdfcfa',
    lwC: '#faf8f5',
    flA: '#ddd8c0',
    flB: '#ccc8b0',
    curtain: 'rgba(255,255,250,0.83)',
    woodT: '#d4b478',
    woodF: '#a88448',
    woodS: '#8c6c34',
    chairT: '#e87050',
    chairF: '#c85c3a',
    chairS: '#a84828',
    bedTop: '#f4f0e8',
    bedS: '#e4ddd0',
    blanket: '#c8c0a8',
    amb: 'rgba(255,230,150,0.07)',
    lampOn: false,
  },
  evening: {
    label: '🌆 พระอาทิตย์ตก',
    accent: '#ffb347',
    skyTop: '#0a001c',
    skyMid: '#680a28',
    skyBot: '#ff4800',
    hasMoon: false,
    hasSun: true,
    sunY: 0.78,
    sunCol: '#ff5722',
    sunGlow: 'rgba(255,80,20,0.3)',
    winSky: ['#100020', '#780820', '#d82800', '#ff5000', '#ff8020'],
    bwA: '#ffe8d8',
    bwB: '#ffd8c4',
    bwC: '#f8c8b0',
    lwA: '#fff4ec',
    lwB: '#ffeee4',
    lwC: '#ffe8dc',
    flA: '#d8c0a0',
    flB: '#c4a888',
    curtain: 'rgba(255,245,238,0.83)',
    woodT: '#c89060',
    woodF: '#a07040',
    woodS: '#8a5e28',
    chairT: '#d85030',
    chairF: '#b83a1a',
    chairS: '#983008',
    bedTop: '#fff0e4',
    bedS: '#eeddd0',
    blanket: '#e09060',
    amb: 'rgba(255,100,30,0.1)',
    lampOn: true,
  },
};

export function pickThemeName(hour: number): string {
  if (hour >= 5 && hour < 8) return 'dawn';
  if (hour >= 8 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 20) return 'evening';
  return 'night';
}
