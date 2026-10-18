import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { buildBugReport, BugReportInput } from '../data/bugReport';
import { supabase, supabaseConfigured } from './supabase';

// Resolves to an error message, or null on success (same shape as the
// helpers in supabase.ts). user_id is filled in by the table default.
export async function sendBugReport(input: BugReportInput): Promise<string | null> {
  if (!supabaseConfigured) return 'Reporting is not set up in this build.';
  const { error } = await supabase
    .from('bug_reports')
    .insert({ ...buildBugReport(input), app_version: Constants.expoConfig?.version ?? null, platform: Platform.OS });
  return error?.message ?? null;
}
