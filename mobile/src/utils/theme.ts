export const COLORS = {
  // SafeTrip Core Brand Green Palette
  brandGreen: '#42B83F',
  brandGreenDark: '#369E33',
  brandGreenLight: '#52D14F',
  brandGreenSoft: '#EAF8E8',
  brandGreenMuted: '#C2EFC0',

  // Core Light Surfaces & Backgrounds
  bgPrimary: '#FFFFFF',
  bgSecondary: '#F7FBF7',
  bgSoftGreen: '#EAF8E8',
  cardSurface: '#FFFFFF',

  // Typography Tokens
  textPrimary: '#101828',
  textSecondary: '#667085',
  textMuted: '#98A2B3',

  // Hairline & Structural Borders
  borderLight: '#E4E7EC',
  borderGreen: '#C2EFC0',

  // Neutrals & Base
  white: '#FFFFFF',
  grayLight: '#F7FBF7',
  grayCard: '#FFFFFF',
  graySubtle: '#F7FBF7',
  grayBorder: '#E4E7EC',
  grayTextMuted: '#98A2B3',
  grayTextSecondary: '#667085',
  grayTextPrimary: '#101828',

  // Backwards-Compatible Brand Aliases (maps legacy dark/teal to new light green system)
  tealPrimary: '#42B83F',
  tealBright: '#42B83F',
  tealAccent: '#52D14F',
  tealSoft: '#EAF8E8',
  tealMuted: '#C2EFC0',

  navyDark: '#101828',
  navyPrimary: '#101828',
  navySurface: '#FFFFFF',
  navyCard: '#FFFFFF',
  navyBorder: '#E4E7EC',

  bluePrimary: '#42B83F',
  blueDark: '#369E33',
  blueLight: '#52D14F',
  blueSoft: '#EAF8E8',

  // Orange - Strictly reserved for Geofence Exit Alarms & Emergency SOS
  warningOrange: '#F97316',
  warningOrangeDark: '#EA580C',
  warningOrangeLight: '#FB923C',
  warningSoft: '#FFF7ED',
  warningBorder: '#FED7AA',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const SHADOWS = {
  subtle: {
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  card: {
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  float: {
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 28,
    elevation: 6,
  },
  glowGreen: {
    shadowColor: '#42B83F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 6,
  },
  glowTeal: {
    shadowColor: '#42B83F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 6,
  },
  glowOrange: {
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 6,
  },
};

