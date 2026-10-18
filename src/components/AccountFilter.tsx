import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getSetting } from '../db/queries';
import { Account, deleteSetting, listAccounts, setSetting } from '../db/transactions';
import { useQuery } from '../db/useQuery';
import { radii, spacing, type } from '../theme/tokens';
import { Theme, useStyles, useTheme } from '../theme/ThemeContext';

const ACCOUNT_FILTER_SETTING = 'account_filter';

export function accountLabel(a: Account): string {
  return a.maskedNumber ? `${a.bank} · ${a.maskedNumber}` : a.bank;
}

// The one account selection every tab shares: no setting = all accounts
// consolidated. Persisted in `settings`, so it survives restarts. Use
// `accountId` in query deps and `accountIds` as the query argument.
export function useAccountFilter() {
  const accounts = useQuery(() => listAccounts(), []);
  const saved = useQuery(() => getSetting(ACCOUNT_FILTER_SETTING), []);
  // A saved account that no longer exists (deleted) falls back to all.
  const accountId = saved && accounts.some((a) => a.id === saved) ? saved : null;
  return { accounts, accountId, accountIds: accountId ? [accountId] : null };
}

// Picks one account for every tab (null = all). The Transactions Filters
// sheet is where it's chosen; AccountChip is where it shows.
export function setAccountFilter(id: string | null) {
  if (id) setSetting(ACCOUNT_FILTER_SETTING, id);
  else deleteSetting(ACCOUNT_FILTER_SETTING);
}

// "Kotak ·9876 ✕", shown only while one account is picked. The text opens
// Filters (onPress); the ✕ goes back to all accounts.
export function AccountChip({ onPress }: { onPress: () => void }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const { accounts, accountId } = useAccountFilter();
  const current = accounts.find((a) => a.id === accountId);
  if (accounts.length < 2 || !current) return null;

  return (
    <View style={styles.chip}>
      <Pressable onPress={onPress} hitSlop={{ top: 8, bottom: 8, left: 8 }} accessibilityRole="button" accessibilityLabel={`Showing ${accountLabel(current)}. Change account`}>
        <Text style={styles.chipText} numberOfLines={1}>
          {accountLabel(current)}
        </Text>
      </Pressable>
      <Pressable onPress={() => setAccountFilter(null)} hitSlop={12} accessibilityRole="button" accessibilityLabel="Show all accounts">
        <Feather name="x" size={14} color={colors.accent} />
      </Pressable>
    </View>
  );
}

const makeStyles = ({ colors, pillPalette }: Theme) => StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    maxWidth: 260,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: pillPalette[1].bg,
  },
  chipText: {
    ...type.caption,
    fontFamily: 'Inter-Medium',
    color: colors.accent,
  },
});
