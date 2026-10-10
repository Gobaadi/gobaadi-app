import { useLanguageContext } from '@/providers/LanguageProvider';

export function useLanguage() {
  const { language, languageCode, isLoading, setLanguage } = useLanguageContext();
  return { language, languageCode, isLoading, setLanguage };
}
