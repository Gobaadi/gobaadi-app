import React, { forwardRef } from 'react';
import { Text as RNText, TextInput as RNTextInput } from 'react-native';
import type { TextProps, TextInputProps } from 'react-native';
import { useTranslation } from 'react-i18next';
import { getFontFamily } from '@/constants/fonts';

function useDefaultFontFamily(): string {
  const { i18n } = useTranslation();
  return getFontFamily(i18n.language === 'bn' ? 'bn' : 'en');
}

export const AppText = forwardRef<React.ElementRef<typeof RNText>, TextProps>(function AppText(
  { style, ...rest },
  ref
) {
  const fontFamily = useDefaultFontFamily();
  return <RNText ref={ref} style={[{ fontFamily }, style]} {...rest} />;
});

export const AppTextInput = forwardRef<React.ElementRef<typeof RNTextInput>, TextInputProps>(
  function AppTextInput({ style, ...rest }, ref) {
    const fontFamily = useDefaultFontFamily();
    return <RNTextInput ref={ref} style={[{ fontFamily }, style]} {...rest} />;
  }
);
