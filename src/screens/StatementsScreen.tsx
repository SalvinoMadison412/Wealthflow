import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PressableScale } from '../components/PressableScale';
import { listStatements, StatementListItem } from '../db/queries';
import { deleteStatement } from '../db/transactions';
import { useQuery } from '../db/useQuery';
import { RootStackParamList } from '../navigation/RootNavigator';
import { Theme, useStyles, useTheme } from '../theme/ThemeContext';
import { contentWrap, radii, spacing, type } from '../theme/tokens';

const day = (iso: string | null, withYear = false) =>
  iso
    ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}) })
    : '?';

// Every import, newest first. Deleting one removes its transactions but
// keeps the account, rules and categories — see deleteStatement.
export function StatementsScreen() {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const statements = useQuery(() => listStatements(), []);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={13} accessibilityLabel="Back">
          <Feather name="arrow-left" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Statements</Text>
        <View style={{ width: 22 }} />
      </View>
      <ScrollView contentContainerStyle={[styles.content, contentWrap]}>
        {statements.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No statements yet</Text>
            <Text style={styles.emptyText}>Everything you import shows up here, with its reconciliation check.</Text>
            <PressableScale style={styles.cta} onPress={() => navigation.navigate('Import')}>
              <Feather name="upload" size={16} color={colors.accentText} />
              <Text style={styles.ctaText}>Import a statement</Text>
            </PressableScale>
          </View>
        ) : (
          statements.map((s) => <StatementCard key={s.id} statement={s} />)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatementCard({ statement }: { statement: StatementListItem }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const [confirming, setConfirming] = useState(false);

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.bank}>
            {statement.bank} · {statement.ownerLabel}
          </Text>
          <Text style={styles.period}>
            {day(statement.periodStart)} – {day(statement.periodEnd, true)}
          </Text>
        </View>
        <Pressable onPress={() => setConfirming((v) => !v)} hitSlop={12} accessibilityLabel="Delete statement">
          <Feather name="trash-2" size={18} color={colors.expenseText} />
        </Pressable>
      </View>
      <View style={styles.metaRow}>
        <Text style={styles.meta}>
          {statement.transactionCount} transactions · imported {day(statement.importedAt, true)}
        </Text>
        <View style={[styles.badge, statement.reconciledOk ? styles.badgeOk : styles.badgeWarn]}>
          <Feather
            name={statement.reconciledOk ? 'check-circle' : 'alert-circle'}
            size={12}
            color={statement.reconciledOk ? colors.incomeText : colors.warningText}
          />
          <Text style={[styles.badgeText, { color: statement.reconciledOk ? colors.incomeText : colors.warningText }]}>
            {statement.reconciledOk ? 'Reconciled' : "Didn't reconcile"}
          </Text>
        </View>
      </View>
      {confirming && (
        <View style={styles.confirm}>
          <Text style={styles.confirmText}>
            Delete this statement and its {statement.transactionCount} transactions? Your rules stay.
          </Text>
          <View style={styles.confirmButtons}>
            <Pressable onPress={() => setConfirming(false)} style={styles.confirmCancel}>
              <Text style={styles.confirmCancelText}>Cancel</Text>
            </Pressable>
            <Pressable onPress={() => deleteStatement(statement.id)} style={styles.confirmDelete}>
              <Text style={styles.confirmDeleteText}>Delete</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const makeStyles = ({ colors, pillPalette }: Theme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    header: {
      ...contentWrap,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.pageGutter,
      paddingVertical: spacing.md,
    },
    title: { ...type.h2, color: colors.textPrimary },
    content: { padding: spacing.pageGutter, gap: spacing.md, paddingBottom: spacing.xxxl },
    card: { backgroundColor: colors.card, borderRadius: radii.card, padding: spacing.lg, gap: spacing.sm },
    cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
    bank: { ...type.bodyMedium, color: colors.textPrimary },
    period: { ...type.caption, color: colors.textSecondary, marginTop: 2 },
    metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
    meta: { ...type.caption, color: colors.textSecondary, flex: 1 },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: spacing.sm,
      height: 24,
      borderRadius: radii.pill,
    },
    badgeOk: { backgroundColor: pillPalette[1].bg },
    badgeWarn: { backgroundColor: pillPalette[3].bg },
    badgeText: { ...type.caption },
    confirm: { gap: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
    confirmText: { ...type.caption, color: colors.textPrimary },
    confirmButtons: { flexDirection: 'row', gap: spacing.sm },
    confirmCancel: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: spacing.sm,
      borderRadius: radii.button,
      borderWidth: 1,
      borderColor: colors.border,
    },
    confirmCancelText: { ...type.label, color: colors.textSecondary },
    confirmDelete: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: spacing.sm,
      borderRadius: radii.button,
      backgroundColor: colors.expenseFill,
    },
    confirmDeleteText: { ...type.label, color: colors.white },
    empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxxl },
    emptyTitle: { ...type.h2, color: colors.textPrimary },
    emptyText: { ...type.body, color: colors.textSecondary, textAlign: 'center' },
    cta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      height: 48,
      paddingHorizontal: spacing.xl,
      borderRadius: radii.button,
      backgroundColor: colors.accent,
      marginTop: spacing.md,
    },
    ctaText: { ...type.bodyMedium, color: colors.accentText },
  });
