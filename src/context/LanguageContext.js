import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations } from '../i18n/translations';

const LANG_KEY = '@do_language';
const SUPPORTED = ['en', 'ko', 'ja'];

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState('en');

  // Load persisted language on startup
  useEffect(() => {
    AsyncStorage.getItem(LANG_KEY).then((stored) => {
      if (stored && SUPPORTED.includes(stored)) {
        setLanguageState(stored);
      }
    });
  }, []);

  const setLanguage = useCallback(async (lang) => {
    if (!SUPPORTED.includes(lang)) return;
    setLanguageState(lang);
    await AsyncStorage.setItem(LANG_KEY, lang);
    // Firestore save is handled by DoProfileScreen via saveUserPreferences
  }, []);

  // t() resolves a key; falls back to English if missing
  const t = useCallback(
    (key) => {
      const dict = translations[language] ?? translations.en;
      return dict[key] ?? translations.en[key] ?? key;
    },
    [language],
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider');
  return ctx;
}
