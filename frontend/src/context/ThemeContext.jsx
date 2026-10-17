import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { THEME_KEY } from '../utils/constants';

const ThemeContext = createContext(null);
const query = () => window.matchMedia?.('(prefers-color-scheme: dark)');

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => localStorage.getItem(THEME_KEY) || 'system'); // light | dark | system
  const [systemDark, setSystemDark] = useState(() => !!query()?.matches);

  useEffect(() => {
    const mq = query();
    if (!mq) return undefined;
    const onChange = (e) => setSystemDark(e.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  const resolved = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;

  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolved === 'dark');
  }, [resolved]);

  const setTheme = useCallback((t) => {
    localStorage.setItem(THEME_KEY, t);
    setThemeState(t);
  }, []);

  const value = useMemo(() => ({ theme, resolved, setTheme }), [theme, resolved, setTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
