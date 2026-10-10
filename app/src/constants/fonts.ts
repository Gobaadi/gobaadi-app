export const FONT_EN = 'Google Sans';
export const FONT_BN = 'Noto Sans Bengali';

export function getFontFamily(language: string): string {
  return language === 'bn' ? FONT_BN : FONT_EN;
}
