import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext('light');
export const useSystemTheme = () => useContext(ThemeContext);

export function SystemThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setTheme(media.matches ? 'dark' : 'light');
    media.addEventListener('change', update);
    update();
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    const background = theme === 'dark' ? '#000000' : '#f4f5ef';
    document.body.style.backgroundColor = background;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', background);
  }, [theme]);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}
