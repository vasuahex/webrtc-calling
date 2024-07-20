// frontend/src/contexts/ThemeContext.tsx
import React, { createContext, useState, useEffect, ReactNode } from 'react';

interface ThemeColors {
  [key: string]: string;
}

interface Theme {
  id: string;
  name: string;
  colors: ThemeColors;
  typography: {
    fontFamily: string;
    fontSize: string;
  };
  button: string;
  // Add other theme properties as needed
}

interface ThemeContextType {
  currentTheme: Theme | null;
  setCurrentTheme: React.Dispatch<React.SetStateAction<Theme | null>>;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState<Theme | null>(null);

  // useEffect(() => {
  //   fetchCurrentTheme();
  // }, []);

  // const fetchCurrentTheme = async (): Promise<void> => {
  //   try {
  //     // Replace this with your actual API call
  //     const response = await fetch('/api/themes/current');
  //     if (!response.ok) {
  //       throw new Error('Failed to fetch theme');
  //     }
  //     const theme: Theme = await response.json();
  //     setCurrentTheme(theme);
  //   } catch (error) {
  //     console.error('Error fetching theme:', error);
  //   }
  // };

  const applyTheme = (theme: Theme): void => {
    Object.entries(theme.colors).forEach(([key, value]) => {
      document.documentElement.style.setProperty(`--color-${key}`, value);
    });

    // Apply typography
    document.documentElement.style.setProperty('--font-family', theme.typography.fontFamily);
    document.documentElement.style.setProperty('--font-size', theme.typography.fontSize);

    // Apply other theme properties as needed
  };

  useEffect(() => {
    if (currentTheme) {
      applyTheme(currentTheme);
    }
  }, [currentTheme]);

  return (
    <ThemeContext.Provider value={{ currentTheme, setCurrentTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook for using the theme context
export const useTheme = (): ThemeContextType => {
  const context = React.useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};