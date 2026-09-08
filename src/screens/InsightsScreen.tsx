import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '../components/AppHeader';
import { BarChart } from '../components/BarChart';
import { PieChart } from '../components/PieChart';
import { useRules } from '../data/RulesContext';
import { useTransactions } from '../data/TransactionsContext';
import {
  capBreakdown,
  isEntirelyUncategorized,
  monthEndVsMidMonth,
  PeriodComparison,
  spendByCategory,
  spendByDayOfWeek,
  spendByMerchant,
  weekendVsWeekday,
} from '../statement/insights';
import { cardShadow, colors, radii, spacing, type } from '../theme/tokens';

function periodStat(comparison: PeriodComparison): { stat: string; text: string } {
  const { aLabel, aAvg, bLabel, bAvg } = comparison;
  if (bAvg === 0) return { stat: '—', text: `Not enough data to compare ${aLabel.toLowerCase()} spend yet.` };
  const pct = Math.round(((aAvg - bAvg) / bAvg) * 100);
  if (pct === 0) return { stat: '0%', text: `${aLabel} and ${bLabel.toLowerCase()} spend are about even.` };
  const direction = pct > 0 ? 'more' : 'less';
  return {
    stat: `${Math.abs(pct)}%`,
    text: `You spend ${Math.abs(pct)}% ${direction} per day on ${aLabel.toLowerCase()} than on ${bLabel.toLowerCase()}.`,
  };
}

export function InsightsScreen() {
  const { statement } = useTransactions();
  const { rules } = useRules();

  const transactions = statement?.transactions ?? [];
  const hasData = transactions.length > 0;

  const categoryBreakdown = spendByCategory(transactions, rules);
  const usingMerchantFallback = isEntirelyUncategorized(categoryBreakdown);
  const shareBreakdown = capBreakdown(
    usingMerchantFallback ? spendByMerchant(transactions) : categoryBreakdown,
    6
  );
  const weekly = spendByDayOfWeek(transactions);
  const weekend = periodStat(weekendVsWeekday(transactions));
  const monthEnd = periodStat(monthEndVsMidMonth(transactions));

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <AppHeader />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.titleBlock}>
          <Text style={styles.headline}>Your Story.</Text>
          <Text style={styles.subtitle}>A snapshot of your financial flow this month.</Text>
        </View>

        {!hasData ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Import a statement on Home to see your insights.</Text>
          </View>
        ) : (
          <>
            <View style={styles.cardStack}>
              <View style={[styles.card, styles.cardInverted]}>
                <Text style={styles.stat}>{weekend.stat}</Text>
                <Text style={[styles.cardText, styles.cardTextInverted]}>{weekend.text}</Text>
              </View>
              <View style={[styles.card, styles.cardInverted]}>
                <Text style={styles.stat}>{monthEnd.stat}</Text>
                <Text style={[styles.cardText, styles.cardTextInverted]}>{monthEnd.text}</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Share of spend{usingMerchantFallback ? ' (by merchant)' : ''}
              </Text>
              {usingMerchantFallback && (
                <Text style={styles.sectionHint}>
                  Add rules on the Rules tab to see this broken down by category instead.
                </Text>
              )}
              <View style={styles.chartCard}>
                <PieChart segments={shareBreakdown} />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Spend by day of week</Text>
              <View style={styles.chartCard}>
                <BarChart bars={weekly} />
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLowest,
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
  emptyCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radii.md,
    padding: spacing.gutter * 2,
    alignItems: 'center',
  },
  emptyText: {
    ...type.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  cardStack: {
    gap: spacing.stackMd,
    marginBottom: spacing.stackLg,
  },
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii.md,
    padding: spacing.gutter,
    minHeight: 120,
    justifyContent: 'center',
    ...cardShadow,
  },
  cardInverted: {
    backgroundColor: colors.black,
    shadowOpacity: 0,
    elevation: 0,
  },
  stat: {
    ...type.numeral,
    fontSize: 40,
    lineHeight: 44,
    color: colors.white,
    marginBottom: spacing.stackSm,
  },
  cardText: {
    ...type.headlineMd,
    fontSize: 18,
    color: colors.onSurface,
  },
  cardTextInverted: {
    color: colors.white,
  },
  section: {
    marginBottom: spacing.stackLg,
  },
  sectionTitle: {
    ...type.headlineMd,
    fontSize: 18,
    color: colors.onSurface,
    marginBottom: spacing.stackSm,
  },
  sectionHint: {
    ...type.bodyMd,
    fontSize: 13,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.stackMd,
  },
  chartCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii.md,
    padding: spacing.gutter,
    ...cardShadow,
  },
});
