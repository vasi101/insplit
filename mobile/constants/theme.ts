export const Colors = {
  primary: '#4361EE',
  primaryDark: '#3A0CA3',
  primaryLight: '#4CC9F0',
  secondary: '#7209B7',
  
  background: '#F8F9FA',
  surface: '#FFFFFF',
  surfaceSubtle: '#F1F3F5',
  
  text: '#1A1A2E',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  textInverted: '#FFFFFF',
  
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  
  success: '#10B981',
  successLight: '#D1FAE5',
  successText: '#065F46',
  
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  warningText: '#92400E',
  
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  dangerText: '#991B1B',
  
  info: '#3B82F6',
  infoLight: '#DBEAFE',
  infoText: '#1E40AF',
};

export type ThemeColors = typeof Colors;

export const DarkColors: ThemeColors = {
  ...Colors,
  primary: '#8EA2FF',
  primaryDark: '#B7C2FF',
  primaryLight: '#38BDF8',
  background: '#0B1020',
  surface: '#151C2F',
  surfaceSubtle: '#202A40',
  text: '#F8FAFC',
  textSecondary: '#B6C0D1',
  textMuted: '#7F8CA3',
  textInverted: '#0B1020',
  border: '#344057',
  borderLight: '#263249',
  successLight: '#123B31',
  successText: '#6EE7B7',
  warningLight: '#422F10',
  warningText: '#FCD34D',
  dangerLight: '#451E28',
  dangerText: '#FDA4AF',
  infoLight: '#172E55',
  infoText: '#93C5FD',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
};

export const BorderRadius = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const Shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  hover: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
};
