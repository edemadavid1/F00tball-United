export interface TeamColorStyle {
  name: string;
  colorName: string;
  hex: string;
  dotBg: string;
  badgeBg: string;
  badgeText: string;
  borderClass: string;
  textClass: string;
}

const TEAM_COLORS_MAP: Record<string, {
  name: string;
  colorName: string;
  hex: string;
  dotBg: string;
  badgeBg: string;
  badgeText: string;
  borderClass: string;
  textClass: string;
}> = {
  'team red': {
    name: 'Team Red',
    colorName: 'Red',
    hex: '#ef4444',
    dotBg: 'bg-red-500 dark:bg-red-400',
    badgeBg: 'bg-red-50/50 dark:bg-red-950/30',
    badgeText: 'text-red-700 dark:text-red-300',
    borderClass: 'border-red-200 dark:border-red-800/60',
    textClass: 'text-red-600 dark:text-red-400',
  },
  'team yellow': {
    name: 'Team Yellow',
    colorName: 'Yellow',
    hex: '#eab308',
    dotBg: 'bg-yellow-500 dark:bg-yellow-400',
    badgeBg: 'bg-yellow-50/50 dark:bg-yellow-950/30',
    badgeText: 'text-yellow-700 dark:text-yellow-300',
    borderClass: 'border-yellow-200 dark:border-yellow-800/60',
    textClass: 'text-yellow-600 dark:text-yellow-400',
  },
  'game on fc': {
    name: 'Game On FC',
    colorName: 'Emerald Green',
    hex: '#10b981',
    dotBg: 'bg-emerald-500 dark:bg-emerald-400',
    badgeBg: 'bg-emerald-50/50 dark:bg-emerald-950/30',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
    borderClass: 'border-emerald-200 dark:border-emerald-800/60',
    textClass: 'text-emerald-600 dark:text-emerald-400',
  },
  'game on athletic': {
    name: 'Game On Athletic',
    colorName: 'Emerald Green',
    hex: '#10b981',
    dotBg: 'bg-emerald-500 dark:bg-emerald-400',
    badgeBg: 'bg-emerald-50/50 dark:bg-emerald-950/30',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
    borderClass: 'border-emerald-200 dark:border-emerald-800/60',
    textClass: 'text-emerald-600 dark:text-emerald-400',
  },
  'apex athletics': {
    name: 'Apex Athletics',
    colorName: 'Royal Indigo',
    hex: '#4f46e5',
    dotBg: 'bg-indigo-500 dark:bg-indigo-400',
    badgeBg: 'bg-indigo-50/50 dark:bg-indigo-950/30',
    badgeText: 'text-indigo-700 dark:text-indigo-300',
    borderClass: 'border-indigo-200 dark:border-indigo-800/60',
    textClass: 'text-indigo-600 dark:text-indigo-400',
  },
  'vanguard united': {
    name: 'Vanguard United',
    colorName: 'Crimson Red',
    hex: '#dc2626',
    dotBg: 'bg-red-500 dark:bg-red-400',
    badgeBg: 'bg-red-50/50 dark:bg-red-950/30',
    badgeText: 'text-red-700 dark:text-red-300',
    borderClass: 'border-red-200 dark:border-red-800/60',
    textClass: 'text-red-650 dark:text-red-400',
  },
  'titan knights': {
    name: 'Titan Knights',
    colorName: 'Golden Amber',
    hex: '#d97706',
    dotBg: 'bg-amber-500 dark:bg-amber-400',
    badgeBg: 'bg-amber-50/50 dark:bg-amber-950/30',
    badgeText: 'text-amber-700 dark:text-amber-300',
    borderClass: 'border-amber-200 dark:border-amber-800/60',
    textClass: 'text-amber-650 dark:text-amber-400',
  },
  'rovers fc': {
    name: 'Rovers FC',
    colorName: 'Ocean Blue',
    hex: '#0284c7',
    dotBg: 'bg-sky-500 dark:bg-sky-400',
    badgeBg: 'bg-sky-50/50 dark:bg-sky-950/30',
    badgeText: 'text-sky-700 dark:text-sky-300',
    borderClass: 'border-sky-200 dark:border-sky-800/60',
    textClass: 'text-sky-650 dark:text-sky-400',
  },
  'cobras fc': {
    name: 'Cobras FC',
    colorName: 'Charcoal Black',
    hex: '#334155',
    dotBg: 'bg-slate-700 dark:bg-slate-300',
    badgeBg: 'bg-slate-100 dark:bg-slate-800/60',
    badgeText: 'text-slate-800 dark:text-slate-200',
    borderClass: 'border-slate-300 dark:border-slate-700',
    textClass: 'text-slate-800 dark:text-slate-200',
  },
  'dynamo rangers': {
    name: 'Dynamo Rangers',
    colorName: 'Neon Pink',
    hex: '#db2777',
    dotBg: 'bg-pink-500 dark:bg-pink-400',
    badgeBg: 'bg-pink-50/50 dark:bg-pink-950/30',
    badgeText: 'text-pink-700 dark:text-pink-300',
    borderClass: 'border-pink-200 dark:border-pink-800/60',
    textClass: 'text-pink-600 dark:text-pink-400',
  },
  'slayers sc': {
    name: 'Slayers SC',
    colorName: 'Fuchsia Magenta',
    hex: '#c026d3',
    dotBg: 'bg-fuchsia-500 dark:bg-fuchsia-400',
    badgeBg: 'bg-fuchsia-50/50 dark:bg-fuchsia-950/30',
    badgeText: 'text-fuchsia-700 dark:text-fuchsia-300',
    borderClass: 'border-fuchsia-200 dark:border-fuchsia-800/60',
    textClass: 'text-fuchsia-600 dark:text-fuchsia-400',
  },
  'jerry': {
    name: 'JERRY',
    colorName: 'Sky Blue',
    hex: '#0284c7',
    dotBg: 'bg-sky-500 dark:bg-sky-400',
    badgeBg: 'bg-sky-50/50 dark:bg-sky-950/30',
    badgeText: 'text-sky-700 dark:text-sky-300',
    borderClass: 'border-sky-200 dark:border-sky-800/60',
    textClass: 'text-sky-650 dark:text-sky-400',
  },
  'ojukwu': {
    name: 'OJUKWU',
    colorName: 'Mint Green',
    hex: '#059669',
    dotBg: 'bg-emerald-600 dark:bg-emerald-450',
    badgeBg: 'bg-emerald-50/50 dark:bg-emerald-950/30',
    badgeText: 'text-emerald-750 dark:text-emerald-300',
    borderClass: 'border-emerald-200 dark:border-emerald-800/60',
    textClass: 'text-emerald-700 dark:text-emerald-400',
  },
  'shola': {
    name: 'SHOLA',
    colorName: 'Grape Violet',
    hex: '#8b5cf6',
    dotBg: 'bg-violet-500 dark:bg-violet-400',
    badgeBg: 'bg-violet-50/50 dark:bg-violet-950/30',
    badgeText: 'text-violet-750 dark:text-violet-300',
    borderClass: 'border-violet-200 dark:border-violet-800/60',
    textClass: 'text-violet-650 dark:text-violet-400',
  },
  'john t': {
    name: 'JOHN T',
    colorName: 'Sunset Orange',
    hex: '#ea580c',
    dotBg: 'bg-orange-500 dark:bg-orange-400',
    badgeBg: 'bg-orange-50/50 dark:bg-orange-950/30',
    badgeText: 'text-orange-750 dark:text-orange-300',
    borderClass: 'border-orange-200 dark:border-orange-800/60',
    textClass: 'text-orange-650 dark:text-orange-400',
  },
  'david': {
    name: 'DAVID',
    colorName: 'Rose Pink',
    hex: '#f43f5e',
    dotBg: 'bg-rose-500 dark:bg-rose-400',
    badgeBg: 'bg-rose-50/50 dark:bg-rose-950/30',
    badgeText: 'text-rose-755 dark:text-rose-300',
    borderClass: 'border-rose-200 dark:border-rose-800/60',
    textClass: 'text-rose-650 dark:text-rose-400',
  },
  'nd': {
    name: 'ND',
    colorName: 'Electric Lime',
    hex: '#65a30d',
    dotBg: 'bg-lime-500 dark:bg-lime-400',
    badgeBg: 'bg-lime-50/50 dark:bg-lime-950/30',
    badgeText: 'text-lime-750 dark:text-lime-300',
    borderClass: 'border-lime-200 dark:border-lime-800/60',
    textClass: 'text-lime-650 dark:text-lime-400',
  },
  'ibraheem': {
    name: 'IBRAHEEM',
    colorName: 'Gold Orange',
    hex: '#f97316',
    dotBg: 'bg-amber-500 dark:bg-amber-400',
    badgeBg: 'bg-amber-50/50 dark:bg-amber-950/30',
    badgeText: 'text-amber-750 dark:text-amber-300',
    borderClass: 'border-amber-200 dark:border-amber-800/60',
    textClass: 'text-amber-655 dark:text-amber-400',
  },
  'osanga': {
    name: 'OSANGA',
    colorName: 'Lagoon Cyan',
    hex: '#06b6d4',
    dotBg: 'bg-cyan-500 dark:bg-cyan-400',
    badgeBg: 'bg-cyan-50/50 dark:bg-cyan-950/30',
    badgeText: 'text-cyan-750 dark:text-cyan-300',
    borderClass: 'border-cyan-200 dark:border-cyan-800/60',
    textClass: 'text-cyan-650 dark:text-cyan-400',
  },
  'tbd': {
    name: 'TBD',
    colorName: 'Neutral Slate',
    hex: '#64748b',
    dotBg: 'bg-slate-400 dark:bg-slate-500',
    badgeBg: 'bg-slate-100 dark:bg-slate-800/40',
    badgeText: 'text-slate-600 dark:text-slate-300',
    borderClass: 'border-slate-200 dark:border-slate-800/60',
    textClass: 'text-slate-600 dark:text-slate-400',
  }
};

const DEFAULT_COLOR = {
  name: 'Default',
  colorName: 'Slate Gray',
  hex: '#64748b',
  dotBg: 'bg-slate-500 dark:bg-slate-400',
  badgeBg: 'bg-slate-50/50 dark:bg-slate-950/30',
  badgeText: 'text-slate-700 dark:text-slate-300',
  borderClass: 'border-slate-200 dark:border-slate-800/60',
  textClass: 'text-slate-600 dark:text-slate-400',
};

const DYNAMIC_PALETTE = [
  { colorName: 'Emerald Green', hex: '#10b981', dotBg: 'bg-emerald-500 dark:bg-emerald-400', badgeBg: 'bg-emerald-50/50 dark:bg-emerald-950/30', badgeText: 'text-emerald-700 dark:text-emerald-300', borderClass: 'border-emerald-200 dark:border-emerald-800/60', textClass: 'text-emerald-600 dark:text-emerald-400' },
  { colorName: 'Royal Indigo', hex: '#4f46e5', dotBg: 'bg-indigo-500 dark:bg-indigo-400', badgeBg: 'bg-indigo-50/50 dark:bg-indigo-950/30', badgeText: 'text-indigo-700 dark:text-indigo-300', borderClass: 'border-indigo-200 dark:border-indigo-800/60', textClass: 'text-indigo-600 dark:text-indigo-400' },
  { colorName: 'Crimson Red', hex: '#dc2626', dotBg: 'bg-red-500 dark:bg-red-400', badgeBg: 'bg-red-50/50 dark:bg-red-950/30', badgeText: 'text-red-700 dark:text-red-300', borderClass: 'border-red-200 dark:border-red-800/60', textClass: 'text-red-650 dark:text-red-400' },
  { colorName: 'Golden Amber', hex: '#d97706', dotBg: 'bg-amber-500 dark:bg-amber-400', badgeBg: 'bg-amber-50/50 dark:bg-amber-950/30', badgeText: 'text-amber-700 dark:text-amber-300', borderClass: 'border-amber-200 dark:border-amber-800/60', textClass: 'text-amber-650 dark:text-amber-400' },
  { colorName: 'Ocean Blue', hex: '#0284c7', dotBg: 'bg-sky-500 dark:bg-sky-400', badgeBg: 'bg-sky-50/50 dark:bg-sky-950/30', badgeText: 'text-sky-700 dark:text-sky-300', borderClass: 'border-sky-200 dark:border-sky-800/60', textClass: 'text-sky-650 dark:text-sky-400' },
  { colorName: 'Charcoal Black', hex: '#334155', dotBg: 'bg-slate-700 dark:bg-slate-300', badgeBg: 'bg-slate-100 dark:bg-slate-800/60', badgeText: 'text-slate-800 dark:text-slate-200', borderClass: 'border-slate-300 dark:border-slate-700', textClass: 'text-slate-800 dark:text-slate-200' },
  { colorName: 'Neon Pink', hex: '#db2777', dotBg: 'bg-pink-500 dark:bg-pink-400', badgeBg: 'bg-pink-50/50 dark:bg-pink-950/30', badgeText: 'text-pink-700 dark:text-pink-300', borderClass: 'border-pink-200 dark:border-pink-800/60', textClass: 'text-pink-600 dark:text-pink-400' },
  { colorName: 'Fuchsia Magenta', hex: '#c026d3', dotBg: 'bg-fuchsia-500 dark:bg-fuchsia-400', badgeBg: 'bg-fuchsia-50/50 dark:bg-fuchsia-950/30', badgeText: 'text-fuchsia-700 dark:text-fuchsia-300', borderClass: 'border-fuchsia-200 dark:border-fuchsia-800/60', textClass: 'text-fuchsia-600 dark:text-fuchsia-400' },
  { colorName: 'Sky Blue', hex: '#0284c7', dotBg: 'bg-sky-500 dark:bg-sky-400', badgeBg: 'bg-sky-50/50 dark:bg-sky-950/30', badgeText: 'text-sky-700 dark:text-sky-300', borderClass: 'border-sky-200 dark:border-sky-800/60', textClass: 'text-sky-650 dark:text-sky-400' },
  { colorName: 'Rose Pink', hex: '#f43f5e', dotBg: 'bg-rose-500 dark:bg-rose-400', badgeBg: 'bg-rose-50/50 dark:bg-rose-950/30', badgeText: 'text-rose-700 dark:text-rose-300', borderClass: 'border-rose-200 dark:border-rose-800/60', textClass: 'text-rose-650 dark:text-rose-400' },
  { colorName: 'Electric Lime', hex: '#65a30d', dotBg: 'bg-lime-500 dark:bg-lime-400', badgeBg: 'bg-lime-50/50 dark:bg-lime-950/30', badgeText: 'text-lime-750 dark:text-lime-300', borderClass: 'border-lime-200 dark:border-lime-800/60', textClass: 'text-lime-650 dark:text-lime-400' },
  { colorName: 'Lagoon Cyan', hex: '#06b6d4', dotBg: 'bg-cyan-500 dark:bg-cyan-400', badgeBg: 'bg-cyan-50/50 dark:bg-cyan-950/30', badgeText: 'text-cyan-750 dark:text-cyan-300', borderClass: 'border-cyan-200 dark:border-cyan-800/60', textClass: 'text-cyan-650 dark:text-cyan-400' }
];

export function getTeamColorStyles(teamName: string) {
  if (!teamName) return DEFAULT_COLOR;
  const key = teamName.toLowerCase().trim();
  if (TEAM_COLORS_MAP[key]) {
    return TEAM_COLORS_MAP[key];
  }
  
  // Deterministic fallback for other team names
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = key.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % DYNAMIC_PALETTE.length;
  const match = DYNAMIC_PALETTE[index];
  return {
    name: teamName,
    ...match
  };
}
