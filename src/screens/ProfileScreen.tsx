import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Constants from 'expo-constants';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PressableScale } from '../components/PressableScale';
import { SettingsRow, SettingsSection } from '../components/SettingsRow';
import { futureValue, monthsToGoal } from '../data/calculator';
import { Account, deleteAccount, deleteCategory, listAccounts, renameAccount, renameCategory, setCategoryColor, setSetting, wipeAllData } from '../db/transactions';
import { FilterCategory, getSetting, listCategoriesForFilter } from '../db/queries';
import { useQuery } from '../db/useQuery';
import { colors, contentWrap, pillPalette, radii, spacing, type } from '../theme/tokens';
import { UNCATEGORIZED_CATEGORY_ID, TRANSFER_CATEGORY_ID } from '../db/schema';

function formatRupees(n: number): string {
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

export function ProfileScreen() {
  const navigation = useNavigation();
  const accounts = useQuery(() => listAccounts(), []);
  const categories = useQuery(() => listCategoriesForFilter(), []);
  const monthlyIncomeSetting = useQuery(() => getSetting('monthly_income'), []);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={13} accessibilityLabel="Back">
          <Feather name="arrow-left" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Profile</Text>
        <View style={{ width: 22 }} />
      </View>
      <ScrollView contentContainerStyle={[styles.content, contentWrap]}>
        <SmartCalculatorCard />

        <SettingsSection title="Accounts">
          {accounts.length === 0 ? (
            <SettingsRow icon="credit-card" label="No accounts yet" showChevron={false} />
          ) : (
            accounts.map((a) => <AccountSettingsRow key={a.id} account={a} />)
          )}
        </SettingsSection>

        <SettingsSection title="Preferences">
          <MonthlyIncomeRow current={monthlyIncomeSetting} />
        </SettingsSection>

        <SettingsSection title="Categories">
          {categories
            .filter((c) => c.id !== UNCATEGORIZED_CATEGORY_ID && c.id !== TRANSFER_CATEGORY_ID)
            .map((c) => (
              <CategorySettingsRow key={c.id} category={c} />
            ))}
        </SettingsSection>

        <SettingsSection title="Data">
          <WipeDataRow />
        </SettingsSection>

        <SettingsSection title="About">
          <SettingsRow icon="info" label="Version" value={Constants.expoConfig?.version ?? '1.0.0'} showChevron={false} />
          <Text style={styles.privacyNote}>All processing happens on your device. Nothing is uploaded.</Text>
        </SettingsSection>
      </ScrollView>
    </SafeAreaView>
  );
}

function SmartCalculatorCard() {
  const [contribution, setContribution] = useState('5000');
  const [rate, setRate] = useState('8');
  const [years, setYears] = useState('5');
  const [goal, setGoal] = useState('');

  const contributionNum = Number(contribution) || 0;
  const rateNum = Number(rate) || 0;
  const yearsNum = Number(years) || 0;
  const goalNum = Number(goal) || 0;

  const fv = futureValue(contributionNum, rateNum, yearsNum);
  const months = goalNum > 0 ? monthsToGoal(goalNum, contributionNum, rateNum) : null;

  return (
    <View style={styles.calcCard}>
      <View style={styles.calcHeader}>
        <Feather name="trending-up" size={16} color={colors.accentOnDark} />
        <Text style={styles.calcTitle}>Smart Calculator</Text>
      </View>
      <Text style={styles.calcSubtitle}>Estimate a savings goal from your monthly contribution.</Text>

      <View style={styles.calcFieldRow}>
        <View style={styles.calcField}>
          <Text style={styles.calcLabel}>MONTHLY ₹</Text>
          <TextInput
            style={styles.calcInput}
            value={contribution}
            onChangeText={setContribution}
            keyboardType="decimal-pad"
            placeholderTextColor={colors.textSecondary}
          />
        </View>
        <View style={styles.calcField}>
          <Text style={styles.calcLabel}>RATE %/YR</Text>
          <TextInput
            style={styles.calcInput}
            value={rate}
            onChangeText={setRate}
            keyboardType="decimal-pad"
            placeholderTextColor={colors.textSecondary}
          />
        </View>
        <View style={styles.calcField}>
          <Text style={styles.calcLabel}>YEARS</Text>
          <TextInput
            style={styles.calcInput}
            value={years}
            onChangeText={setYears}
            keyboardType="decimal-pad"
            placeholderTextColor={colors.textSecondary}
          />
        </View>
      </View>

      <Text style={styles.calcResult}>
        Estimated value: <Text style={styles.calcResultNumber}>{formatRupees(fv)}</Text>
      </Text>

      <View style={styles.calcDivider} />

      <Text style={styles.calcLabel}>GOAL AMOUNT (OPTIONAL)</Text>
      <TextInput
        style={styles.calcInput}
        value={goal}
        onChangeText={setGoal}
        keyboardType="decimal-pad"
        placeholder="e.g., 200000"
        placeholderTextColor={colors.textSecondary}
      />
      {goalNum > 0 && (
        <Text style={styles.calcResult}>
          {months == null
            ? 'Not reachable at this contribution.'
            : (
              <>
                Estimated time to goal: <Text style={styles.calcResultNumber}>{months} months</Text>
              </>
            )}
        </Text>
      )}
    </View>
  );
}

function AccountSettingsRow({ account }: { account: Account }) {
  const [editing, setEditing] = useState(false);
  const [ownerLabel, setOwnerLabel] = useState(account.ownerLabel);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  if (confirmingDelete) {
    return (
      <View style={styles.confirmRow}>
        <Text style={styles.confirmText}>Delete {account.bank} and all its transactions?</Text>
        <View style={styles.confirmButtons}>
          <Pressable onPress={() => setConfirmingDelete(false)} style={styles.confirmCancel}>
            <Text style={styles.confirmCancelText}>Cancel</Text>
          </Pressable>
          <Pressable onPress={() => deleteAccount(account.id)} style={styles.confirmDelete}>
            <Text style={styles.confirmDeleteText}>Delete</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (editing) {
    return (
      <View style={styles.editRow}>
        <TextInput style={styles.editInput} value={ownerLabel} onChangeText={setOwnerLabel} autoFocus />
        <Pressable
          onPress={() => {
            renameAccount(account.id, { ownerLabel });
            setEditing(false);
          }}
        >
          <Text style={styles.editSave}>Save</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.accountRow}>
      <Pressable style={styles.accountRowMain} onPress={() => setEditing(true)}>
        <Feather name="credit-card" size={18} color={colors.textSecondary} />
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>{account.bank}</Text>
          <Text style={styles.accountMeta}>{account.ownerLabel}</Text>
        </View>
      </Pressable>
      <Pressable onPress={() => setConfirmingDelete(true)} hitSlop={15} accessibilityLabel={`Delete ${account.bank}`}>
        <Feather name="trash-2" size={18} color={colors.expenseText} />
      </Pressable>
    </View>
  );
}

function MonthlyIncomeRow({ current }: { current: string | null }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(current ?? '');

  if (editing) {
    return (
      <View style={styles.editRow}>
        <TextInput
          style={styles.editInput}
          value={value}
          onChangeText={setValue}
          keyboardType="decimal-pad"
          autoFocus
        />
        <Pressable
          onPress={() => {
            if (value.trim()) setSetting('monthly_income', value.trim());
            setEditing(false);
          }}
        >
          <Text style={styles.editSave}>Save</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <SettingsRow
      icon="dollar-sign"
      label="Monthly income (fallback)"
      value={current ? formatRupees(Number(current)) : 'Not set'}
      onPress={() => setEditing(true)}
    />
  );
}

function CategorySettingsRow({ category }: { category: FilterCategory }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  if (confirmingDelete) {
    return (
      <View style={styles.confirmRow}>
        <Text style={styles.confirmText}>Delete "{category.name}"? Its transactions become Uncategorized.</Text>
        <View style={styles.confirmButtons}>
          <Pressable onPress={() => setConfirmingDelete(false)} style={styles.confirmCancel}>
            <Text style={styles.confirmCancelText}>Cancel</Text>
          </Pressable>
          <Pressable onPress={() => deleteCategory(category.id)} style={styles.confirmDelete}>
            <Text style={styles.confirmDeleteText}>Delete</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (editing) {
    return (
      <View style={styles.editRow}>
        <TextInput style={styles.editInput} value={name} onChangeText={setName} autoFocus />
        <View style={styles.colorRow}>
          {pillPalette.map((p, i) => (
            <Pressable key={i} onPress={() => setCategoryColor(category.id, i)} hitSlop={12}>
              <View style={[styles.colorSwatch, { backgroundColor: p.text }, category.colorIndex === i && styles.colorSwatchSelected]} />
            </Pressable>
          ))}
        </View>
        <Pressable
          onPress={() => {
            if (name.trim()) renameCategory(category.id, name);
            setEditing(false);
          }}
        >
          <Text style={styles.editSave}>Save</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.accountRow}>
      <Pressable style={styles.accountRowMain} onPress={() => setEditing(true)}>
        <View style={[styles.colorSwatch, { backgroundColor: pillPalette[category.colorIndex].text }]} />
        <Text style={styles.label}>{category.name}</Text>
      </Pressable>
      <Pressable onPress={() => setConfirmingDelete(true)} hitSlop={15} accessibilityLabel={`Delete ${category.name}`}>
        <Feather name="trash-2" size={18} color={colors.expenseText} />
      </Pressable>
    </View>
  );
}

function WipeDataRow() {
  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  if (!confirming) {
    return (
      <SettingsRow icon="trash-2" label="Wipe all data" destructive onPress={() => setConfirming(true)} showChevron={false} />
    );
  }

  return (
    <View style={styles.wipeCard}>
      <Text style={styles.confirmText}>
        This permanently deletes every account, statement, transaction, and rule on this device. Type DELETE
        to confirm.
      </Text>
      <TextInput
        style={styles.editInput}
        value={confirmText}
        onChangeText={setConfirmText}
        autoCapitalize="characters"
        placeholder="DELETE"
        placeholderTextColor={colors.textSecondary}
      />
      <View style={styles.confirmButtons}>
        <Pressable onPress={() => { setConfirming(false); setConfirmText(''); }} style={styles.confirmCancel}>
          <Text style={styles.confirmCancelText}>Cancel</Text>
        </Pressable>
        <PressableScale
          onPress={() => {
            wipeAllData();
            setConfirming(false);
            setConfirmText('');
          }}
          disabled={confirmText.trim() !== 'DELETE'}
          style={[styles.confirmDelete, confirmText.trim() !== 'DELETE' && styles.buttonDisabled]}
        >
          <Text style={styles.confirmDeleteText}>Wipe all data</Text>
        </PressableScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    ...contentWrap,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.pageGutter,
    paddingVertical: spacing.md,
  },
  content: {
    padding: spacing.pageGutter,
    gap: spacing.xl,
  },
  title: {
    ...type.h2,
    color: colors.textPrimary,
  },
  label: {
    ...type.body,
    color: colors.textPrimary,
  },
  privacyNote: {
    ...type.caption,
    color: colors.textSecondary,
    paddingVertical: spacing.md,
  },

  calcCard: {
    backgroundColor: colors.textPrimary,
    borderRadius: radii.sheet,
    padding: spacing.lg,
  },
  calcHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 4,
  },
  calcTitle: {
    ...type.h3,
    color: colors.white,
  },
  calcSubtitle: {
    ...type.caption,
    color: colors.onDarkSecondary,
    marginBottom: spacing.lg,
  },
  calcFieldRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  calcField: {
    flex: 1,
    gap: 4,
  },
  calcLabel: {
    ...type.caption,
    color: colors.onDarkSecondary,
  },
  calcInput: {
    ...type.bodyMedium,
    color: colors.white,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    paddingVertical: spacing.xs,
  },
  calcResult: {
    ...type.body,
    color: colors.onDarkSecondary,
    marginTop: spacing.sm,
  },
  calcResultNumber: {
    ...type.bodyMedium,
    color: colors.white,
  },
  calcDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginVertical: spacing.md,
  },

  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    gap: spacing.md,
  },
  accountRowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 48,
  },
  accountMeta: {
    ...type.caption,
    color: colors.textSecondary,
  },
  editRow: {
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  editInput: {
    ...type.body,
    color: colors.textPrimary,
    borderBottomWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xs,
  },
  editSave: {
    ...type.label,
    color: colors.accent,
    alignSelf: 'flex-end',
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  colorSwatch: {
    width: 20,
    height: 20,
    borderRadius: radii.pill,
  },
  colorSwatchSelected: {
    borderWidth: 2,
    borderColor: colors.textPrimary,
  },
  confirmRow: {
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  confirmText: {
    ...type.caption,
    color: colors.textPrimary,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  confirmCancel: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radii.button,
    borderWidth: 1,
    borderColor: colors.border,
  },
  confirmCancelText: {
    ...type.label,
    color: colors.textSecondary,
  },
  confirmDelete: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radii.button,
    backgroundColor: colors.expenseFill,
  },
  confirmDeleteText: {
    ...type.label,
    color: colors.white,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  wipeCard: {
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
});
