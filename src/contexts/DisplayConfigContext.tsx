import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

export type EnvironmentType = 'Indoor' | 'Outdoor' | null;
export type EntryMode = 'guided' | 'direct' | null;

export interface DisplayConfigState {
  width: number;
  height: number;
  unit: 'mm' | 'cm' | 'm' | 'ft';
  environment: EnvironmentType;
  viewingDistance: string | null;
  viewingDistanceUnit: 'meters' | 'feet';
  pixelPitch: number | null;
  entryMode: EntryMode;
  directProductMode: boolean;
  selectedProductName: string | null;
}

interface DisplayConfigContextType {
  config: DisplayConfigState;
  updateDimensions: (width: number, height: number, unit?: 'mm' | 'cm' | 'm' | 'ft') => void;
  updateConfig: (values: Partial<DisplayConfigState>) => void;
  clearDimensions: () => void;
}

const DisplayConfigContext = createContext<DisplayConfigContextType | undefined>(undefined);

const STORAGE_KEY = 'led_display_config';

const defaultConfig: DisplayConfigState = {
  width: 1800, // 1.8m in mm
  height: 675, // 0.675m in mm
  unit: 'm',
  environment: null,
  viewingDistance: null,
  viewingDistanceUnit: 'meters',
  pixelPitch: null,
  entryMode: null,
  directProductMode: false,
  selectedProductName: null
};

const loadFromStorage = (): DisplayConfigState => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        ...defaultConfig,
        ...parsed
      };
    }
  } catch (error) {

  }
  return defaultConfig;
};

const saveToStorage = (config: DisplayConfigState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (error) {

  }
};

const areConfigsEqual = (a: DisplayConfigState, b: DisplayConfigState) => {
  return (
    a.width === b.width &&
    a.height === b.height &&
    a.unit === b.unit &&
    a.environment === b.environment &&
    a.viewingDistance === b.viewingDistance &&
    a.viewingDistanceUnit === b.viewingDistanceUnit &&
    a.pixelPitch === b.pixelPitch &&
    a.entryMode === b.entryMode &&
    a.directProductMode === b.directProductMode &&
    a.selectedProductName === b.selectedProductName
  );
};

export const DisplayConfigProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<DisplayConfigState>(loadFromStorage);

  useEffect(() => {
    const stored = loadFromStorage();
    setConfig(stored);
  }, []);

  useEffect(() => {
    saveToStorage(config);
  }, [config]);

  const updateDimensions = useCallback((width: number, height: number, unit?: 'mm' | 'cm' | 'm' | 'ft') => {
    setConfig(prev => {
      const nextUnit = unit || prev.unit;
      if (prev.width === width && prev.height === height && prev.unit === nextUnit) {
        return prev;
      }
      return {
        ...prev,
        width,
        height,
        unit: nextUnit
      };
    });
  }, []);

  const updateConfig = useCallback((values: Partial<DisplayConfigState>) => {
    setConfig(prev => {
      let hasChanges = false;
      const next = { ...prev };

      (Object.keys(values) as (keyof DisplayConfigState)[]).forEach(key => {
        const value = values[key];
        if (value === undefined) {
          return;
        }
        if (next[key] !== value) {
          next[key] = value as DisplayConfigState[typeof key];
          hasChanges = true;
        }
      });

      return hasChanges ? next : prev;
    });
  }, []);

  const clearDimensions = useCallback(() => {
    setConfig(prev => (areConfigsEqual(prev, defaultConfig) ? prev : defaultConfig));
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <DisplayConfigContext.Provider value={{ config, updateDimensions, updateConfig, clearDimensions }}>
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

