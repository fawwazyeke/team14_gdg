import React, { createContext, useContext, useState } from 'react';
import { buildPalette } from '../theme/doTheme';

const DoThemeContext = createContext(null);

export function DoThemeProvider({ children }) {
  const [mood, setMood] = useState('dawn');
  const [mode, setMode] = useState('dark');
  const P = buildPalette(mood, mode);
  return (
    <DoThemeContext.Provider value={{ P, mood, setMood, mode, setMode }}>
      {children}
    </DoThemeContext.Provider>
  );
}

export function useDoTheme() {
  return useContext(DoThemeContext);
}
