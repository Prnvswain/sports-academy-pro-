import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'sams-theme';
const ThemeContext = createContext(null);

function readStoredTheme() {
  if (typeof window === 'undefined') {
    return 'light';
  }
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'dark' ? 'dark' : 'light';
}

function applyThemeToDocument(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readStoredTheme);

  useEffect(() => {
    applyThemeToDocument(theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = useCallback((next) => {
    setThemeState(next === 'dark' ? 'dark' : 'light');
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => (current === 'dark' ? 'light' : 'dark'));
  }, []);

  const value = useMemo(
    () => ({
      theme,
      isDark: theme === 'dark',
      setTheme,
      toggleTheme
    }),
    [theme, setTheme, toggleTheme]
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
