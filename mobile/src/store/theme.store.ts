import { create } from 'zustand';
import { DarkColors, Colors, ThemeColors } from '../../constants/theme';
import { getItem, setItem } from '../utils/storage';

export type ThemeMode = 'light' | 'dark';
const THEME_KEY = 'insplit_theme_mode';

interface ThemeState {
  mode: ThemeMode;
  initialized: boolean;
  initialize: () => Promise<void>;
  setMode: (mode: ThemeMode) => Promise<void>;
  toggle: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: 'dark',
  initialized: false,
  initialize: async () => {
    const saved = await getItem(THEME_KEY);
    set({ mode: saved === 'light' ? 'light' : 'dark', initialized: true });
  },
  setMode: async (mode) => {
    set({ mode });
    await setItem(THEME_KEY, mode);
  },
  toggle: async () => get().setMode(get().mode === 'dark' ? 'light' : 'dark'),
}));

export function useThemeColors(): ThemeColors {
  return useThemeStore((state) => state.mode === 'dark' ? DarkColors : Colors);
}
