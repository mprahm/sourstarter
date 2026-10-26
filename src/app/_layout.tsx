import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StoreProvider, useStore } from '../lib/store';
import { useColors } from '../lib/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

function Screens() {
  const c = useColors();
  const { ready } = useStore();
  const [fonts] = useFonts({
    InterTight_300Light: require('../../assets/fonts/InterTight_300Light.ttf'),
    InterTight_600SemiBold: require('../../assets/fonts/InterTight_600SemiBold.ttf'),
    InterTight_700Bold: require('../../assets/fonts/InterTight_700Bold.ttf'),
    Inter_300Light: require('../../assets/fonts/Inter_300Light.ttf'),
    Inter_300Light_Italic: require('../../assets/fonts/Inter_300Light_Italic.ttf'),
    Inter_400Regular: require('../../assets/fonts/Inter_400Regular.ttf'),
    Inter_500Medium: require('../../assets/fonts/Inter_500Medium.ttf'),
    Inter_600SemiBold: require('../../assets/fonts/Inter_600SemiBold.ttf'),
    DMMono_400Regular: require('../../assets/fonts/DMMono_400Regular.ttf'),
  });
  const show = fonts && ready;
  useEffect(() => {
    if (show) SplashScreen.hideAsync().catch(() => {});
  }, [show]);
  if (!show) return null;
  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg }, animation: 'slide_from_right' }} />
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <Screens />
      </StoreProvider>
    </SafeAreaProvider>
  );
}
