// Ported from Do_design_2300/theme.jsx

export const MOODS = {
  dawn:       { name: 'Dawn',       primary: '#E08A5F', primaryDeep: '#C46A3D', grad: ['#FBB57A','#E08A5F','#C46A3D'], accent: '#8DA68F', accentDeep: '#5F7F65', wash: '#FCE9D5', washDark: '#3A2A1F' },
  terracotta: { name: 'Terracotta', primary: '#C76A4E', primaryDeep: '#A35135', grad: ['#E89A7C','#C76A4E','#A35135'], accent: '#7A92A6', accentDeep: '#506B82', wash: '#F3DAC5', washDark: '#3A2418' },
  apricot:    { name: 'Apricot',    primary: '#D49A5C', primaryDeep: '#B07A3D', grad: ['#F2C490','#D49A5C','#B07A3D'], accent: '#94A084', accentDeep: '#67755A', wash: '#F5E2C4', washDark: '#3A2E1F' },
  sage:       { name: 'Sage',       primary: '#7A9C7F', primaryDeep: '#5A7D60', grad: ['#A8C0AA','#7A9C7F','#5A7D60'], accent: '#C68660', accentDeep: '#A26847', wash: '#DDE8DD', washDark: '#1F2A22' },
  lavender:   { name: 'Lavender',   primary: '#9D8CB8', primaryDeep: '#7A6993', grad: ['#C5B6D6','#9D8CB8','#7A6993'], accent: '#C8A077', accentDeep: '#A07F58', wash: '#E8E0F0', washDark: '#28203A' },
  sea:        { name: 'Sea',        primary: '#6FA3A4', primaryDeep: '#4D8485', grad: ['#A0C5C6','#6FA3A4','#4D8485'], accent: '#D4A574', accentDeep: '#A87E50', wash: '#DAE9E9', washDark: '#1B2E2F' },
  rose:       { name: 'Rose',       primary: '#C5858F', primaryDeep: '#A06570', grad: ['#E0B5BC','#C5858F','#A06570'], accent: '#88A088', accentDeep: '#647D64', wash: '#F0DDE0', washDark: '#382225' },
  moss:       { name: 'Moss',       primary: '#7A8E54', primaryDeep: '#5C6F3B', grad: ['#A5B582','#7A8E54','#5C6F3B'], accent: '#C7975C', accentDeep: '#A07640', wash: '#DDE5C9', washDark: '#232812' },
  stone:      { name: 'Stone',      primary: '#8A7E72', primaryDeep: '#6A5F54', grad: ['#B0A498','#8A7E72','#6A5F54'], accent: '#C56F4E', accentDeep: '#9E5235', wash: '#E5DED5', washDark: '#2A2520' },
  plum:       { name: 'Plum',       primary: '#8E7088', primaryDeep: '#6D516A', grad: ['#B89AB2','#8E7088','#6D516A'], accent: '#C7A064', accentDeep: '#A07F45', wash: '#ECDDEA', washDark: '#2D1F2A' },
};

export const HORIZON = ['#FFD9A8', '#F8A878', '#E08259', '#9B6B5A'];

const LIGHT = {
  bg: '#FAF4ED', surface: '#FFFFFF', surfaceQuiet: '#F4ECE1',
  ink: '#2A2420', inkSoft: '#6B5E55', inkMuted: '#A39689',
  line: 'rgba(42,36,32,0.08)', lineStrong: 'rgba(42,36,32,0.14)',
};
const DARK = {
  bg: '#1A1612', surface: '#26211A', surfaceQuiet: '#1F1A14',
  ink: '#F2E8D8', inkSoft: '#B8AB99', inkMuted: '#7A6F62',
  line: 'rgba(242,232,216,0.09)', lineStrong: 'rgba(242,232,216,0.16)',
};

export function buildPalette(moodId = 'dawn', mode = 'light') {
  const mood = MOODS[moodId] || MOODS.dawn;
  const surf = mode === 'dark' ? DARK : LIGHT;
  return {
    ...surf,
    horizon: HORIZON,
    name: mood.name,
    primary: mood.primary,
    primaryDeep: mood.primaryDeep,
    grad: mood.grad,
    accent: mood.accent,
    accentDeep: mood.accentDeep,
    wash: mode === 'dark' ? mood.washDark : mood.wash,
    mode,
  };
}

export const radii = { sm: 10, md: 16, lg: 22, xl: 28, pill: 999 };
