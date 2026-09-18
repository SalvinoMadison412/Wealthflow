import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from './src/auth/AuthContext';
import { LogoSplash } from './src/components/LogoSplash';
import { RootNavigator } from './src/navigation/RootNavigator';
import { PdfExtractorProvider } from './src/pdf/PdfExtractorProvider';
import { TourOverlay } from './src/tour/TourOverlay';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { fontAssets } from './src/theme/tokens';

SplashScreen.preventAutoHideAsync();

export default function App() {
  const [fontsLoaded] = useFonts(fontAssets);

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    onLayoutRootView();
  }, [onLayoutRootView]);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <PdfExtractorProvider>
            <Root />
          </PdfExtractorProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

// The splash overlay stays up (holding after the draw-on) until the
// stored session is known, so a returning user never sees the login
// screen flash before Home.
function Root() {
  const { loading, session, profile } = useAuth();
  const { scheme } = useTheme();
  const [splashDone, setSplashDone] = useState(false);
  const onSplashDone = useCallback(() => setSplashDone(true), []);

  return (
    <>
      {!loading && <RootNavigator />}
      {!loading && session && profile && <TourOverlay />}
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      {!splashDone && <LogoSplash ready={!loading} onDone={onSplashDone} />}
    </>
  );
}
