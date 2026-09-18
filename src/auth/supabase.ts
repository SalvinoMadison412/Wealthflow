import { createClient } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import Storage from 'expo-sqlite/kv-store';
import * as WebBrowser from 'expo-web-browser';
import { AppState } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Missing .env.local: keep the app bootable so screens can show a clear
// message instead of crashing at import time.
export const supabaseConfigured = Boolean(url && key);

// Session persisted in expo-sqlite's kv-store (AsyncStorage-compatible,
// already a dependency) — same on-device sandbox as the transactions DB.
export const supabase = createClient(url ?? 'https://unconfigured.supabase.co', key ?? 'unconfigured', {
  auth: {
    storage: Storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});

// Supabase's documented React Native pattern: only refresh tokens while
// the app is in the foreground.
AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});

WebBrowser.maybeCompleteAuthSession();

// Each helper resolves to an error message, or null on success. A user
// cancelling the browser is not an error — the caller just stays put.
export async function signInWithGoogle(): Promise<string | null> {
  const redirectTo = Linking.createURL('auth');
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error || !data.url) return error?.message ?? 'Could not start Google sign-in';

  let result: WebBrowser.WebBrowserAuthSessionResult;
  try {
    result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  } catch (e) {
    // e.g. a browser session is already open — surface it, don't crash.
    return e instanceof Error ? e.message : String(e);
  }
  if (result.type !== 'success') return null;

  const params = new URL(result.url).searchParams;
  const code = params.get('code');
  if (!code) return params.get('error_description') ?? 'Google sign-in did not complete';

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  return exchangeError?.message ?? null;
}

export async function sendPhoneOtp(phone: string): Promise<string | null> {
  const { error } = await supabase.auth.signInWithOtp({ phone });
  return error?.message ?? null;
}

export async function verifyPhoneOtp(phone: string, token: string): Promise<string | null> {
  const { error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
  return error?.message ?? null;
}
