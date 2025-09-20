"use client";

import * as React from "react";

interface ThemeContextValue {
  theme: "dark" | "light";
  setTheme: (theme: "dark" | "light") => void;
}

const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = React.useState<"dark" | "light">("dark");

  React.useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
