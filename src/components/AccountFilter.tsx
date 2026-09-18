import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { getSetting } from '../db/queries';
import { Account, deleteSetting, listAccounts, setSetting } from '../db/transactions';
import { useQuery } from '../db/useQuery';
import { radii, spacing, type } from '../theme/tokens';
import { Theme, useStyles, useTheme } from '../theme/ThemeContext';

const ACCOUNT_FILTER_SETTING = 'account_filter';

function accountLabel(a: Account): string {
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

// A quiet caption under the header ("All accounts ▾") that opens a small
// list. Renders nothing until there are two or more accounts.
export function AccountFilter() {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const { accounts, accountId } = useAccountFilter();
  const [open, setOpen] = useState(false);
  if (accounts.length < 2) return null;

  const current = accounts.find((a) => a.id === accountId);
  function pick(id: string | null) {
    if (id) setSetting(ACCOUNT_FILTER_SETTING, id);
    else deleteSetting(ACCOUNT_FILTER_SETTING);
    setOpen(false);
  }

  return (
    <>
      <Pressable style={styles.trigger} onPress={() => setOpen(true)} hitSlop={8} accessibilityLabel="Filter by account">
        <Text style={styles.triggerText} numberOfLines={1}>
          {current ? accountLabel(current) : 'All accounts'}
        </Text>
        <Feather name="chevron-down" size={13} color={colors.textSecondary} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            <Option label="All accounts" selected={!current} onPress={() => pick(null)} />
            {accounts.map((a) => (
              <Option key={a.id} label={accountLabel(a)} selected={a.id === accountId} onPress={() => pick(a.id)} />
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

function Option({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  return (
    <Pressable style={styles.option} onPress={onPress} accessibilityRole="button" accessibilityState={{ selected }}>
      <Text style={[styles.optionText, selected && { color: colors.accent }]} numberOfLines={1}>
        {label}
      </Text>
      {selected && <Feather name="check" size={16} color={colors.accent} />}
    </Pressable>
  );
}

const makeStyles = ({ colors }: Theme) => StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: spacing.xs,
    marginHorizontal: spacing.pageGutter,
    maxWidth: 220,
  },
  triggerText: {
    ...type.caption,
    color: colors.textSecondary,
    flexShrink: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: spacing.pageGutter,
  },
  sheet: {
    backgroundColor: colors.card,
    borderRadius: radii.sheet,
    paddingVertical: spacing.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  optionText: {
    ...type.body,
    color: colors.textPrimary,
    flex: 1,
  },
});
