import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getLanguage, setLanguage as saveLanguage, syncLanguage, apiFetch, getToken } from '@/constants/api';
import { getLanguageCode } from '@/constants/languages';
import i18n from '@/i18n';

const DEFAULT_LANGUAGE = 'en';

interface LanguageContextValue {
  language: string;
  languageCode: string;
  isLoading: boolean;
  setLanguage: (lang: string) => Promise<void>;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

function detectDeviceLanguage(): string {
  try {
    // Lazy require: keeps module import-safe on web/unsupported platforms
    const { getLocales } = require('expo-localization') as typeof import('expo-localization');
    const code = getLocales()[0]?.languageCode;
    return code === 'bn' ? 'bn' : DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<string>(DEFAULT_LANGUAGE);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadLanguage = async () => {
      let initial = DEFAULT_LANGUAGE;
      try {
        const saved = await getLanguage();
        // Priority: server (account-level, new device) > local > device locale.
        // Legacy values ('hi', 'ur') from the old 4-language picker are normalized.
        const local = saved === 'bn' || saved === 'en' ? saved : null;
        let server: string | null = null;
        try {
          if (await getToken()) {
            const me = await apiFetch<{ language?: string }>('/users/me');
            if (me?.language === 'bn' || me?.language === 'en') {
              server = me.language;
            }
          }
        } catch {
          // Not logged in / offline / old backend — fall through to local
        }
        initial = server ?? local ?? detectDeviceLanguage();
      } catch (error) {
        console.error('Failed to load language:', error);
        initial = detectDeviceLanguage();
      }

      if (mounted) {
        setLanguageState(initial);
        try {
          await i18n.changeLanguage(initial);
        } catch (error) {
          console.error('Failed to change language:', error);
        }
        setIsLoading(false);
      }
    };

    loadLanguage();

    return () => {
      mounted = false;
    };
  }, []);

  const setLanguage = useCallback(async (lang: string) => {
    const next = lang === 'bn' ? 'bn' : 'en';
    setLanguageState(next);
    try {
      await i18n.changeLanguage(next);
    } catch (error) {
      console.error('Failed to change language:', error);
    }
    try {
      await saveLanguage(next);
    } catch (error) {
      console.error('Failed to save language:', error);
    }
    // Best-effort server sync (needs auth; local save already succeeded)
    try {
      await syncLanguage(next);
    } catch (error) {
      console.warn('Failed to sync language to server:', error);
    }
  }, []);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      languageCode: getLanguageCode(language),
      isLoading,
      setLanguage,
    }),
    [language, isLoading, setLanguage]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguageContext(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return ctx;
}
