import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'sams-theme';
const THEME_COLORS_KEY = 'sams-theme-colors';
const ThemeContext = createContext(null);

const DEFAULT_THEME_COLORS = {
  primary_color: '#84cc16',
  secondary_color: '#FFC400',
  accent_color: '#84cc16',
  background_gradient: '#FFC400',
  navbar_color: '#84cc16',
  sidebar_color: '#0f172a',
  button_primary: '#84cc16',
  button_hover: '#65a30d',
  card_accent: '#84cc16',
};

function readStoredTheme() {
  if (typeof window === 'undefined') {
    return 'light';
  }
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'dark' ? 'dark' : 'light';
}

function readStoredThemeColors() {
  if (typeof window === 'undefined') {
    return DEFAULT_THEME_COLORS;
  }
  const stored = localStorage.getItem(THEME_COLORS_KEY);
  return stored ? JSON.parse(stored) : DEFAULT_THEME_COLORS;
}

function applyThemeToDocument(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

function applyThemeColorsToDocument(colors) {
  const root = document.documentElement;
  root.style.setProperty('--theme-primary', colors.primary_color);
  root.style.setProperty('--theme-secondary', colors.secondary_color);
  root.style.setProperty('--theme-accent', colors.accent_color);
  root.style.setProperty('--theme-background-gradient', colors.background_gradient);
  root.style.setProperty('--theme-navbar', colors.navbar_color);
  root.style.setProperty('--theme-sidebar', colors.sidebar_color);
  root.style.setProperty('--theme-button-primary', colors.button_primary);
  root.style.setProperty('--theme-button-hover', colors.button_hover);
  root.style.setProperty('--theme-card-accent', colors.card_accent);
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readStoredTheme);
  const [themeColors, setThemeColorsState] = useState(readStoredThemeColors);

  useEffect(() => {
    applyThemeToDocument(theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    applyThemeColorsToDocument(themeColors);
    localStorage.setItem(THEME_COLORS_KEY, JSON.stringify(themeColors));
  }, [themeColors]);

  const setTheme = useCallback((next) => {
    setThemeState(next === 'dark' ? 'dark' : 'light');
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => (current === 'dark' ? 'light' : 'dark'));
  }, []);

  const updateThemeColors = useCallback((colors) => {
    setThemeColorsState((prev) => ({ ...prev, ...colors }));
  }, []);

  const resetThemeColors = useCallback(() => {
    setThemeColorsState(DEFAULT_THEME_COLORS);
  }, []);

  const value = useMemo(
    () => ({
      theme,
      isDark: theme === 'dark',
      setTheme,
      toggleTheme,
      themeColors,
      updateThemeColors,
      resetThemeColors,
    }),
    [theme, setTheme, toggleTheme, themeColors, updateThemeColors, resetThemeColors]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
