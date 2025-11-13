import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface DisplayConfigState {
  width: number;
  height: number;
  unit: 'mm' | 'cm' | 'm' | 'ft';
}

interface DisplayConfigContextType {
  config: DisplayConfigState;
  updateDimensions: (width: number, height: number, unit?: 'mm' | 'cm' | 'm' | 'ft') => void;
  clearDimensions: () => void;
}

const DisplayConfigContext = createContext<DisplayConfigContextType | undefined>(undefined);

const STORAGE_KEY = 'led_display_config';

// Default values
const defaultConfig: DisplayConfigState = {
  width: 1800, // 1.8m in mm
  height: 675, // 0.675m in mm
  unit: 'm'
};

// Load from localStorage
const loadFromStorage = (): DisplayConfigState => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        width: parsed.width || defaultConfig.width,
        height: parsed.height || defaultConfig.height,
        unit: parsed.unit || defaultConfig.unit
      };
    }
  } catch (error) {
    console.error('Error loading display config from localStorage:', error);
  }
  return defaultConfig;
};

// Save to localStorage
const saveToStorage = (config: DisplayConfigState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (error) {
    console.error('Error saving display config to localStorage:', error);
  }
};

export const DisplayConfigProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<DisplayConfigState>(loadFromStorage);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = loadFromStorage();
    setConfig(stored);
  }, []);

  // Save to localStorage whenever config changes
  useEffect(() => {
    saveToStorage(config);
  }, [config]);

  const updateDimensions = (width: number, height: number, unit?: 'mm' | 'cm' | 'm' | 'ft') => {
    setConfig(prev => ({
      width,
      height,
      unit: unit || prev.unit
    }));
  };

  const clearDimensions = () => {
    setConfig(defaultConfig);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <DisplayConfigContext.Provider value={{ config, updateDimensions, clearDimensions }}>
      {children}
    </DisplayConfigContext.Provider>
  );
};

export const useDisplayConfig = (): DisplayConfigContextType => {
  const context = useContext(DisplayConfigContext);
  if (!context) {
    throw new Error('useDisplayConfig must be used within a DisplayConfigProvider');
  }
  return context;
};

