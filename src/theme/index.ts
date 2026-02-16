// Palette Definitions
const PALETTE = {
    terracotta: '#D97D54',
    terracottaDark: '#A04A35',
    terracottaLight: '#FFBCA6',
    charcoal: '#121212',
    greyDark: '#1E1E1E',
    greyMedium: '#2A2A2A',
    greyLight: '#A0A0A0',
    offWhite: '#E0E0E0',
    white: '#FFFFFF',
    black: '#000000',
    warmGrey: '#F4F1EA', // Light mode bg
    pureWhite: '#FFFFFF',
    textDark: '#2C2C2C',
    borderLight: '#E5E5E5'
};

export const DarkTheme = {
    primary: PALETTE.terracotta,
    primaryDark: PALETTE.terracottaDark,
    primaryLight: PALETTE.terracottaLight,
    background: PALETTE.charcoal,
    text: PALETTE.offWhite,
    textLight: PALETTE.greyLight,
    white: PALETTE.white,
    black: PALETTE.black,
    border: PALETTE.greyMedium,
    error: '#CF6679',
    success: '#81C784',
    card: PALETTE.greyDark,
    isDark: true,
};

export const LightTheme = {
    primary: PALETTE.terracotta, // Keep brand color
    primaryDark: PALETTE.terracottaDark,
    primaryLight: PALETTE.terracottaLight,
    background: PALETTE.warmGrey, // Not plain white
    text: PALETTE.textDark,
    textLight: '#666666',
    white: PALETTE.white,
    black: PALETTE.black,
    border: PALETTE.borderLight,
    error: '#B00020',
    success: '#388E3C',
    card: PALETTE.pureWhite,
    isDark: false,
};

// Deprecated: Use useTheme() hook instead
export const COLORS = DarkTheme;

export const FONTS = {
    regular: 'Inter_400Regular',
    medium: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
    heading: 'PlayfairDisplay_700Bold',
    headingRegular: 'PlayfairDisplay_400Regular',
};

export const SPACING = {
    xs: 4,
    s: 8,
    m: 16,
    l: 24,
    xl: 32,
};
