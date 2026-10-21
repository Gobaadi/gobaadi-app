export interface Language {
  id: string;
  name: string;
  nativeName: string;
}

export const LANGUAGES: Language[] = [
  { id: 'en', name: 'English', nativeName: 'Default' },
  { id: 'bn', name: 'বাংলা', nativeName: 'Bangla' },
];

const LANGUAGE_CODES: Record<string, string> = {
  en: 'EN',
  bn: 'BN',
};

export function getLanguageCode(id: string): string {
  return LANGUAGE_CODES[id] ?? 'EN';
}

// Human-readable label written in the language itself, e.g. 'English' / 'বাংলা'
export function getLanguageLabel(id: string): string {
  return LANGUAGES.find((lang) => lang.id === id)?.name ?? LANGUAGES[0].name;
}
