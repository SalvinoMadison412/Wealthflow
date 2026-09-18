import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from './src/auth/AuthContext';
import { LogoSplash } from './src/components/LogoSplash';
import { RulesProvider } from './src/data/RulesContext';
import { TransactionsProvider } from './src/data/TransactionsContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { PdfExtractorProvider } from './src/pdf/PdfExtractorProvider';
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
      <AuthProvider>
        <PdfExtractorProvider>
          <RulesProvider>
            <TransactionsProvider>
              <Root />
            </TransactionsProvider>
          </RulesProvider>
        </PdfExtractorProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

// The splash overlay stays up (holding after the draw-on) until the
// stored session is known, so a returning user never sees the login
// screen flash before Home.
function Root() {
  const { loading } = useAuth();
  const [splashDone, setSplashDone] = useState(false);
  const onSplashDone = useCallback(() => setSplashDone(true), []);

  return (
    <>
      {!loading && <RootNavigator />}
      <StatusBar style="dark" />
      {!splashDone && <LogoSplash ready={!loading} onDone={onSplashDone} />}
    </>
  );
}
