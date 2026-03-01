import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { resources, type SupportedLocale } from './resources';

const resolveLanguage = (): SupportedLocale => {
  if (typeof navigator === 'undefined') {
    return 'es';
  }
  return navigator.language.toLowerCase().startsWith('en') ? 'en' : 'es';
};

void i18n.use(initReactI18next).init({
  resources,
  lng: resolveLanguage(),
  fallbackLng: 'es',
  interpolation: {
    escapeValue: false,
  },
  returnNull: false,
});

export default i18n;
