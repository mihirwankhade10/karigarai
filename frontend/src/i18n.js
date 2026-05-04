import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import kn from './locales/kn.json';
import hi from './locales/hi.json';
import { useAppStore } from './store/appStore';

const langCodeMap = {
  kn: 'kn',
  hi: 'hi',
  en: 'en',
  kannada: 'kn',
  hindi: 'hi',
  english: 'en',
};

const initialLang = langCodeMap[useAppStore.getState().selectedLanguage] || 'kn';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    kn: { translation: kn },
    hi: { translation: hi },
  },
  lng: initialLang,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

// Keep i18next in sync with zustand
useAppStore.subscribe((state, prev) => {
  if (state.selectedLanguage !== prev.selectedLanguage) {
    const code = langCodeMap[state.selectedLanguage] || 'en';
    i18n.changeLanguage(code);
  }
});

export default i18n;
