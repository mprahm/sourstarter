import { useColorScheme } from 'react-native';

// Direction D, "Monochrome": pure black and white; photos are the only colour.
const light = { bg: '#FFFFFF', ink: '#111110', mut: '#6B6B67', hair: '#DCDCD8', soft: '#EFEFEC' };
const dark = { bg: '#0E0E0E', ink: '#F2F2F0', mut: '#8F8F8B', hair: '#2C2C2A', soft: '#1C1C1B' };

export type Colors = typeof light;

export function useColors(): Colors {
  return useColorScheme() === 'dark' ? dark : light;
}

/** Font family names, as loaded in the root layout. */
export const F = {
  displayLight: 'InterTight_300Light',
  displaySemi: 'InterTight_600SemiBold',
  display: 'InterTight_700Bold',
  light: 'Inter_300Light',
  italic: 'Inter_300Light_Italic',
  body: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semi: 'Inter_600SemiBold',
  mono: 'DMMono_400Regular',
};

export const RADIUS = 14;
