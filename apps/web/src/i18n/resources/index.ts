import { en } from './en';
import { es } from './es';

export const resources = {
  es: {
    translation: es,
  },
  en: {
    translation: en,
  },
} as const;

export type SupportedLocale = keyof typeof resources;
