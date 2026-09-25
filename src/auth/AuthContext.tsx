import { Session } from '@supabase/supabase-js';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { INCOME_RANGES, Profile } from './profile';
import { startRulesSync } from './rulesSync';
import { supabase } from './supabase';
import { getSetting } from '../db/queries';
import { deleteSetting, setSetting, wipeAllData } from '../db/transactions';

const PROFILE_SETTING = 'profile';

type AuthState = {
  /** True until the stored session (and, if any, its profile) is known. */
  loading: boolean;
  session: Session | null;
  profile: Profile | null;
  saveProfile: (profile: Profile) => Promise<string | null>;
  signOut: () => Promise<void>;
  /** Deletes the account server-side, then everything on this device. Returns an error message, or null. */
  deleteAccount: () => Promise<string | null>;
};

const AuthContext = createContext<AuthState | null>(null);

type ProfileRow = {
  full_name: string;
  email: string | null;
  phone: string | null;
  age_range: string | null;
  income_range: string | null;
  goal: string | null;
  occupation: string | null;
};

const fromRow = (r: ProfileRow): Profile => ({
  fullName: r.full_name,
  email: r.email,
  phone: r.phone,
  ageRange: r.age_range,
  incomeRange: r.income_range,
  goal: r.goal,
  occupation: r.occupation,
});

const toRow = (p: Profile): ProfileRow => ({
  full_name: p.fullName,
  email: p.email,
  phone: p.phone,
  age_range: p.ageRange,
  income_range: p.incomeRange,
  goal: p.goal,
  occupation: p.occupation,
});

function readLocalProfile(): Profile | null {
  const raw = getSetting(PROFILE_SETTING);
  return raw ? (JSON.parse(raw) as Profile) : null;
}

// Local mirror so the greeting works offline; seeds the Budget income
// fallback from the income range only when the user hasn't set one.
function mirrorLocally(profile: Profile) {
  setSetting(PROFILE_SETTING, JSON.stringify(profile));
  const midpoint = INCOME_RANGES.find((r) => r.value === profile.incomeRange)?.midpoint;
  if (midpoint && !getSetting('monthly_income')) setSetting('monthly_income', String(midpoint));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [sessionChecked, setSessionChecked] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  // undefined = not fetched yet for this session; null = no row.
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionChecked(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id ?? null;
  useEffect(() => {
    if (!userId) {
      setProfile(null);
      return;
    }
    let cancelled = false;
    setProfile(undefined);
    supabase
      .from('profiles')
      .select('full_name, email, phone, age_range, income_range, goal, occupation')
      .eq('id', userId)
      .maybeSingle<ProfileRow>()
      .then(({ data, error }) => {
        if (cancelled) return;
        // Offline or transient error: fall back to the local mirror rather
        // than bouncing a returning user through onboarding again.
        if (error) {
          setProfile(readLocalProfile());
          return;
        }
        const next = data ? fromRow(data) : null;
        if (next) mirrorLocally(next);
        setProfile(next);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Rules/categories live on the account too (see rulesSync.ts): pull on
  // sign-in, push after every local change, stop on sign-out.
  useEffect(() => {
    if (!userId) return;
    return startRulesSync(userId);
  }, [userId]);

  const saveProfile = useCallback(
    async (next: Profile): Promise<string | null> => {
      if (!userId) return 'Not signed in';
      const { error } = await supabase
        .from('profiles')
        .upsert({ id: userId, ...toRow(next), updated_at: new Date().toISOString() });
      if (error) return error.message;
      mirrorLocally(next);
      setProfile(next);
      return null;
    },
    [userId]
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    deleteSetting(PROFILE_SETTING);
  }, []);

  // Server first: if it fails nothing local is touched and the user can retry.
  // Local sign-out before the wipe so rules sync is stopped and cannot push.
  const deleteAccount = useCallback(async (): Promise<string | null> => {
    const { error } = await supabase.rpc('delete_my_account');
    if (error) return error.message;
    await supabase.auth.signOut({ scope: 'local' });
    wipeAllData();
    return null;
  }, []);

  const loading = !sessionChecked || (session != null && profile === undefined);

  return (
    <AuthContext.Provider
      value={{ loading, session, profile: profile ?? null, saveProfile, signOut, deleteAccount }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
