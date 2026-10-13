export interface Language {
  id: string;
  name: string;
  nativeName: string;
}

export const LANGUAGES: Language[] = [
  { id: 'en', name: 'English', nativeName: 'Default' },
  { id: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
];

const LANGUAGE_CODES: Record<string, string> = {
  en: 'EN',
  bn: 'BN',
};

export function getLanguageCode(id: string): string {
  return LANGUAGE_CODES[id] ?? 'EN';
}
