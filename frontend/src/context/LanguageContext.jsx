/* oxlint-disable react/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { translations } from '../i18n/translations';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try {
      const saved = localStorage.getItem('ignissync_lang');
      if (saved === 'es' || saved === 'en') return saved;
    } catch {
      // Ignore localStorage errors
    }
    return 'es';
  });

  const setLang = useCallback((newLang) => {
    if (newLang !== 'es' && newLang !== 'en') return;
    setLangState(newLang);
    try {
      localStorage.setItem('ignissync_lang', newLang);
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const toggleLang = useCallback(() => {
    setLang(lang === 'es' ? 'en' : 'es');
  }, [lang, setLang]);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = translations[lang]?.app?.title || document.title;
  }, [lang]);

  // Función de traducción anidada con soporte para parámetros {param}
  const t = useCallback((path, params = {}) => {
    const keys = path.split('.');
    let value = translations[lang];
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        // Fallback a español si falta en inglés
        let fallback = translations.es;
        for (const fKey of keys) {
          if (fallback && typeof fallback === 'object' && fKey in fallback) {
            fallback = fallback[fKey];
          } else {
            fallback = undefined;
            break;
          }
        }
        value = fallback !== undefined ? fallback : path;
        break;
      }
    }

    if (typeof value === 'string') {
      return Object.entries(params).reduce((str, [paramKey, paramVal]) => {
        return str.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramVal));
      }, value);
    }
    return value;
  }, [lang]);

  const getStyleText = useCallback((styleId) => {
    const styleTrans = translations[lang]?.styles?.[styleId] || translations.es.styles?.[styleId];
    return styleTrans || { name: styleId, desc: '' };
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t, getStyleText }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return ctx;
}
