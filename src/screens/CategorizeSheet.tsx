import { Feather } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Amount, formatINR } from '../components/Amount';
import { CategoryPill } from '../components/CategoryPill';
import { PressableScale } from '../components/PressableScale';
import { TransactionDetails } from '../components/TransactionDetails';
import { suggestPattern } from '../data/rulePattern';
import { getTransactionDetail, listCategoriesForFilter } from '../db/queries';
import { getOrCreateCategoryByName } from '../db/categories';
import {
  clearCategoryOverride,
  insertRule,
  retroCount,
  setCategoryOverride,
} from '../db/transactions';
import { useQuery } from '../db/useQuery';
import { RootStackParamList } from '../navigation/RootNavigator';
import { contentWrap, radii, spacing, type } from '../theme/tokens';
import { Theme, useStyles, useTheme } from '../theme/ThemeContext';

type Route = RouteProp<RootStackParamList, 'CategorizeSheet'>;

// Presented as a formSheet (see RootNavigator) — Android hardware back
// dismisses the whole screen by default via native-stack, including
// whatever local state (the inline rule prompt) is showing.
export function CategorizeSheet() {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const navigation = useNavigation();
  const { params } = useRoute<Route>();
  const transaction = useQuery(() => getTransactionDetail(params.transactionId), [params.transactionId]);
  const categories = useQuery(() => listCategoriesForFilter(), []);

  const [pendingCategoryId, setPendingCategoryId] = useState<string | null>(null);
  const [pendingCategoryName, setPendingCategoryName] = useState<string | null>(null);
  const [showNewCategoryField, setShowNewCategoryField] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [matcherText, setMatcherText] = useState('');
  const [showDetails, setShowDetails] = useState(false);

  const retro = useMemo(
    () => (pendingCategoryId ? retroCount(matcherText.trim() || null, null) : 0),
    [matcherText, pendingCategoryId]
  );

  if (!transaction) {
    return <SafeAreaView style={styles.screen} edges={['bottom']} />;
  }

  const amount = transaction.deposit ?? transaction.withdrawal ?? 0;
  const kind: 'income' | 'expense' = transaction.deposit != null ? 'income' : 'expense';

  function pickCategory(categoryId: string, categoryName: string) {
    if (categoryId === transaction!.categoryId) {
      setPendingCategoryId(null);
      setPendingCategoryName(null);
      return;
    }
    setPendingCategoryId(categoryId);
    setPendingCategoryName(categoryName);
    setMatcherText(suggestPattern(transaction!.merchant));
  }

  function addNewCategory() {
    const name = newCategoryName.trim();
    if (!name) return;
    pickCategory(getOrCreateCategoryByName(name), name);
    setNewCategoryName('');
    setShowNewCategoryField(false);
  }

  function justThisOne() {
    if (!pendingCategoryId) return;
    setCategoryOverride(transaction!.id, pendingCategoryId);
    navigation.goBack();
  }

  function createRule() {
    if (!pendingCategoryId || !pendingCategoryName || !matcherText.trim()) return;
    clearCategoryOverride(transaction!.id);
    insertRule({ merchant: matcherText.trim(), category: pendingCategoryName });
    navigation.goBack();
  }

  const statusLine = transaction.isOverridden
    ? 'Manually set'
    : transaction.autoCategorised
      ? 'Auto-categorised'
      : transaction.matchedRuleDescription
      ? `Matched by rule: ${transaction.matchedRuleDescription}`
      : 'No rule matched';

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView contentContainerStyle={[styles.content, contentWrap]} keyboardShouldPersistTaps="handled">
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.merchant}>{transaction.merchant}</Text>
            <Text style={styles.description} numberOfLines={1}>
              {transaction.description}
            </Text>
          </View>
          <Pressable
            onPress={() => setShowDetails((v) => !v)}
            hitSlop={13}
            accessibilityLabel={showDetails ? 'Hide transaction details' : 'Show transaction details'}
            accessibilityState={{ expanded: showDetails }}
          >
            <Feather name="info" size={22} color={showDetails ? colors.accent : colors.textPrimary} />
          </Pressable>
          <Pressable onPress={() => navigation.goBack()} hitSlop={13} accessibilityLabel="Close">
            <Feather name="x" size={22} color={colors.textPrimary} />
          </Pressable>
        </View>

        <Text style={styles.meta}>
          {new Date(transaction.date).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}{' '}
          · {transaction.accountBank}
        </Text>

        <Amount value={amount} kind={kind} size="lg" style={styles.amount} />

        <View style={styles.currentRow}>
          <CategoryPill name={transaction.categoryName} colorIndex={transaction.colorIndex} />
          <Text style={styles.statusText} numberOfLines={2}>
            {statusLine}
          </Text>
        </View>

        {showDetails && (
          <TransactionDetails
            rows={[
              ...(transaction.refNo ? [{ label: 'Reference no.', value: transaction.refNo }] : []),
              { label: 'Merchant', value: transaction.merchant },
              { label: 'Description', value: transaction.description },
              {
                label: 'Date',
                value: new Date(transaction.date).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                }),
              },
              { label: 'Type', value: kind === 'income' ? 'Credit (money in)' : 'Debit (money out)' },
              { label: 'Amount', value: formatINR(amount) },
              { label: 'Balance after', value: formatINR(transaction.balance) },
              {
                label: 'Account',
                value: [transaction.accountBank, transaction.accountOwner, transaction.accountMasked]
                  .filter(Boolean)
                  .join(' · '),
              },
            ]}
          />
        )}

        <Text style={styles.sectionLabel}>CATEGORY</Text>
        <View style={styles.grid}>
          {categories.map((c) => (
            <Pressable key={c.id} onPress={() => pickCategory(c.id, c.name)} hitSlop={12}>
              <CategoryPill name={c.name} colorIndex={c.colorIndex} />
            </Pressable>
          ))}
          {!showNewCategoryField && (
            <Pressable onPress={() => setShowNewCategoryField(true)} style={styles.newCategoryChip} hitSlop={12}>
              <Feather name="plus" size={12} color={colors.accent} />
              <Text style={styles.newCategoryChipText}>New category…</Text>
            </Pressable>
          )}
        </View>

        {showNewCategoryField && (
          <View style={styles.newCategoryRow}>
            <TextInput
              style={styles.newCategoryInput}
              placeholder="Category name"
              placeholderTextColor={colors.textSecondary}
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              autoFocus
              onSubmitEditing={addNewCategory}
            />
            <PressableScale style={styles.newCategoryAdd} onPress={addNewCategory}>
              <Text style={styles.newCategoryAddText}>Add</Text>
            </PressableScale>
          </View>
        )}

        {pendingCategoryId && pendingCategoryName && (
          <View style={styles.promptCard}>
            <Text style={styles.promptTitle}>
              Auto-categorize future transactions like this as {pendingCategoryName}?
            </Text>
            <Text style={styles.fieldLabel}>WHEN DESCRIPTION CONTAINS</Text>
            <TextInput
              style={styles.matcherInput}
              value={matcherText}
              onChangeText={setMatcherText}
              autoCapitalize="characters"
            />
            <Text style={styles.retroText}>
              Also recategorizes {retro} past transaction{retro === 1 ? '' : 's'}
            </Text>
            <PressableScale
              style={[styles.createRuleButton, !matcherText.trim() && styles.buttonDisabled]}
              onPress={createRule}
              disabled={!matcherText.trim()}
            >
              <Text style={styles.createRuleButtonText}>Create rule</Text>
            </PressableScale>
            <Pressable style={styles.notNowButton} onPress={justThisOne}>
              <Text style={styles.notNowButtonText}>Just this one</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = ({ colors, pillPalette }: Theme) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.card,
  },
  content: {
    padding: spacing.pageGutter,
    paddingBottom: spacing.xxxl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  merchant: {
    ...type.h2,
    color: colors.textPrimary,
  },
  description: {
    ...type.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  meta: {
    ...type.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  amount: {
    marginTop: spacing.md,
  },
  currentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    flexWrap: 'wrap',
  },
  statusText: {
    ...type.caption,
    color: colors.textSecondary,
    flex: 1,
  },
  sectionLabel: {
    ...type.label,
    color: colors.textSecondary,
    marginTop: spacing.xxl,
    marginBottom: spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  newCategoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 24,
    paddingHorizontal: 10,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.accent,
    borderStyle: 'dashed',
  },
  newCategoryChipText: {
    ...type.label,
    fontSize: 12,
    color: colors.accent,
  },
  newCategoryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    alignItems: 'center',
  },
  newCategoryInput: {
    ...type.body,
    flex: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
  },
  newCategoryAdd: {
    backgroundColor: colors.accent,
    borderRadius: radii.button,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  newCategoryAddText: {
    ...type.label,
    color: colors.accentText,
  },
  promptCard: {
    marginTop: spacing.xxl,
    backgroundColor: colors.track,
    borderRadius: radii.card,
    padding: spacing.lg,
  },
  promptTitle: {
    ...type.h3,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  fieldLabel: {
    ...type.caption,
    color: colors.textSecondary,
  },
  matcherInput: {
    ...type.body,
    borderBottomWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
    color: colors.textPrimary,
  },
  retroText: {
    ...type.caption,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  createRuleButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.button,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  createRuleButtonText: {
    ...type.label,
    fontSize: 15,
    color: colors.accentText,
  },
  notNowButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  notNowButtonText: {
    ...type.label,
    color: colors.textSecondary,
  },
});
