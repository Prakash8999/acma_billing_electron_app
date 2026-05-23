import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { SystemSettings } from '../../../shared/types';

// ── Default values (used when no DB is available) ──
export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  // Tax Slabs
  defaultSacCode: '9994',
  cgstPercentage: 2.5,
  sgstPercentage: 2.5,

  // Billing Period
  financialYearPrefix: '2026-27/',

  // Society Contact
  officialPhone: '(0251) 2610228',
  officialMobile: '9049890397',
  officialEmail: 'acmacetp@gmail.com',

  // Bank Identity
  bankAccountNo: '1002014004165',
  bankIfscCode: 'AJHC0001002',
  bankMicrCode: '400805002',

  // Global Rate
  defaultWaterRate: 10,
};

interface SystemSettingsContextValue {
  settings: SystemSettings;
  updateSettings: (newSettings: SystemSettings) => Promise<void>;
  isLoading: boolean;
}

const SystemSettingsContext = createContext<SystemSettingsContextValue>({
  settings: DEFAULT_SYSTEM_SETTINGS,
  updateSettings: async () => {},
  isLoading: false,
});

export function SystemSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SYSTEM_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  // Load settings on mount
  useEffect(() => {
    (async () => {
      try {
        if (window.billingAPI?.getSystemSettings) {
          const data = await window.billingAPI.getSystemSettings();
          if (data) {
            setSettings(data);
          }
        }
      } catch (err) {
        console.error('Failed to load system settings:', err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const updateSettings = useCallback(async (newSettings: SystemSettings) => {
    setSettings(newSettings);
    try {
      if (window.billingAPI?.updateSystemSettings) {
        await window.billingAPI.updateSystemSettings(newSettings);
      }
    } catch (err) {
      console.error('Failed to save system settings:', err);
    }
  }, []);

  return (
    <SystemSettingsContext.Provider value={{ settings, updateSettings, isLoading }}>
      {children}
    </SystemSettingsContext.Provider>
  );
}

export function useSystemSettings() {
  return useContext(SystemSettingsContext);
}
