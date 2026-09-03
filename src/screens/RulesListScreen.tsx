import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '../components/AppHeader';
import { PressableScale } from '../components/PressableScale';
import { AmountCondition, Rule, useRules } from '../data/RulesContext';
import { RootStackParamList } from '../navigation/RootNavigator';
import { colors, radii, spacing, type } from '../theme/tokens';

type ConditionSummary = { tag: string; icon: keyof typeof Feather.glyphMap; prefix: string; numeral: string | null };

function amountSummary(amount: AmountCondition): ConditionSummary {
  const label =
    amount.operator === 'moreThan'
      ? 'More than '
      : amount.operator === 'lessThan'
        ? 'Less than '
        : amount.operator === 'equalTo'
          ? 'Equal to '
          : '';
  const numeral =
    amount.operator === 'between' ? `₹${amount.min} – ₹${amount.max}` : `₹${amount.value}`;
  return { tag: '[AMOUNT]', icon: 'dollar-sign', prefix: label, numeral };
}

// A rule can carry a merchant condition, an amount condition, or both
// (AND) — one summary row per condition present, rendered in order.
function conditionSummaries(rule: Rule): ConditionSummary[] {
  const summaries: ConditionSummary[] = [];
  if (rule.merchant) {
    summaries.push({ tag: '[MERCHANT]', icon: 'shopping-bag', prefix: rule.merchant, numeral: null });
  }
  if (rule.amount) {
    summaries.push(amountSummary(rule.amount));
  }
  return summaries;
}

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function RulesListScreen() {
  const navigation = useNavigation<Nav>();
  const { rules, removeRule } = useRules();

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <AppHeader />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.titleBlock}>
          <Text style={styles.headline}>My Rules</Text>
          <Text style={styles.subtitle}>Applied automatically when you import a statement</Text>
        </View>

        {rules.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Feather name="sliders" size={22} color={colors.white} />
            </View>
            <Text style={styles.emptyTitle}>No rules yet</Text>
            <Text style={styles.emptyBody}>
              Every transaction shows as Uncategorized until you add a rule. Match a merchant or an
              amount to a category to start sorting your spend automatically.
            </Text>
            <PressableScale style={styles.emptyButton} onPress={() => navigation.navigate('NewRuleForm')}>
              <Feather name="plus" size={16} color={colors.white} />
              <Text style={styles.emptyButtonText}>Add your first rule</Text>
            </PressableScale>
          </View>
        ) : (
          <>
            <View style={styles.cardStack}>
              {rules.map((rule) => {
                const conditions = conditionSummaries(rule);
                return (
                  <View key={rule.id} style={styles.card}>
                    <View style={styles.cardHeaderRow}>
                      <View style={styles.tagRow}>
                        {conditions.map((c) => (
                          <Feather key={c.tag} name={c.icon} size={14} color={colors.onSurfaceVariant} />
                        ))}
                      </View>
                      <PressableScale onPress={() => removeRule(rule.id)} hitSlop={12}>
                        <Feather name="trash-2" size={16} color={colors.onSurfaceVariant} />
                      </PressableScale>
                    </View>
                    {conditions.map((c, i) => (
                      <React.Fragment key={c.tag}>
                        {i > 0 && <Text style={styles.andLabel}>AND</Text>}
                        <View style={styles.valueRow}>
                          <Text style={styles.tag}>{c.tag}</Text>
                          <Text style={styles.value}>
                            {c.prefix}
                            {c.numeral && <Text style={styles.valueNumeral}>{c.numeral}</Text>}
                          </Text>
                        </View>
                      </React.Fragment>
                    ))}
                    <View style={styles.categoryRow}>
                      <Feather name="arrow-right" size={16} color={colors.onSurfaceVariant} />
                      <View style={styles.chip}>
                        <Text style={styles.chipText}>{rule.category}</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>

            <PressableScale style={styles.addButton} onPress={() => navigation.navigate('NewRuleForm')}>
              <Feather name="plus" size={16} color={colors.primary} />
              <Text style={styles.addButtonText}>Add Rule</Text>
            </PressableScale>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.marginPage,
  },
  titleBlock: {
    marginBottom: spacing.stackLg,
  },
  headline: {
    ...type.headlineLg,
    color: colors.onSurface,
    marginBottom: spacing.stackSm,
  },
  subtitle: {
    ...type.bodyMd,
    color: colors.onSurfaceVariant,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.stackLg,
    paddingHorizontal: spacing.gutter,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: radii.pill,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.stackMd,
  },
  emptyTitle: {
    ...type.headlineMd,
    color: colors.onSurface,
    marginBottom: spacing.stackSm,
  },
  emptyBody: {
    ...type.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: spacing.stackLg,
  },
  emptyButton: {
    backgroundColor: colors.signal,
    borderRadius: radii.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.gutter,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emptyButtonText: {
    ...type.labelMd,
    letterSpacing: 0,
    color: colors.white,
  },
  cardStack: {
    gap: spacing.stackMd,
  },
  card: {
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: radii.md,
    padding: spacing.gutter,
    gap: spacing.stackSm,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tag: {
    ...type.labelSm,
    color: colors.onSurfaceVariant,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.stackSm,
  },
  value: {
    ...type.headlineMd,
    fontSize: 20,
    color: colors.onSurface,
  },
  valueNumeral: {
    ...type.numeral,
    fontSize: 20,
    color: colors.onSurface,
  },
  andLabel: {
    ...type.labelSm,
    color: colors.outline,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.stackSm,
    marginTop: 2,
  },
  chip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.black,
    borderRadius: radii.pill,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  chipText: {
    ...type.labelMd,
    letterSpacing: 0,
    color: colors.white,
  },
  addButton: {
    marginTop: spacing.stackLg,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: radii.md,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addButtonText: {
    ...type.labelMd,
    letterSpacing: 0,
    color: colors.primary,
  },
});
