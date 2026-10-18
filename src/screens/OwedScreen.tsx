import { Feather } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAccountFilter } from '../components/AccountFilter';
import { PressableScale } from '../components/PressableScale';
import { formatRupees } from '../data/money';
import { groupByPerson, OwedDirection } from '../data/owed';
import { listOwed } from '../db/queries';
import { settleOwed } from '../db/transactions';
import { useQuery } from '../db/useQuery';
import { RootStackParamList } from '../navigation/RootNavigator';
import { Theme, useStyles, useTheme } from '../theme/ThemeContext';
import { contentWrap, radii, spacing, type } from '../theme/tokens';

const day = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

// Who owes you and whom you owe, grouped by person, with Settle.
export function OwedScreen() {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const navigation = useNavigation();
  const { params } = useRoute<RouteProp<RootStackParamList, 'Owed'>>();
  const [side, setSide] = useState<OwedDirection>(params?.side ?? 'to_me');
  const { accountId, accountIds } = useAccountFilter();
  const rows = useQuery(() => listOwed(side, accountIds), [side, accountId]);
  const groups = groupByPerson(rows);
  const outstanding = groups.filter((g) => g.outstanding > 0);
  const total = outstanding.reduce((sum, g) => sum + g.outstanding, 0);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={13} accessibilityLabel="Back">
          <Feather name="arrow-left" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Owed</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={styles.segment}>
        {([['to_me', 'Owed to you'], ['by_me', 'You owe']] as const).map(([value, label]) => (
          <Pressable
            key={value}
            onPress={() => setSide(value)}
            accessibilityRole="button"
            accessibilityState={{ selected: side === value }}
            style={[styles.segmentItem, side === value && styles.segmentItemOn]}
          >
            <Text style={[styles.segmentText, side === value && styles.segmentTextOn]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={[styles.content, contentWrap]}>
        <Text style={styles.total}>
          {outstanding.length === 0
            ? side === 'to_me'
              ? 'Nobody owes you right now.'
              : "You don't owe anyone right now."
            : `${formatRupees(total)} ${side === 'to_me' ? 'from' : 'to'} ${outstanding.length} ${outstanding.length === 1 ? 'person' : 'people'}`}
        </Text>

        {groups.map((g) => (
          <View key={g.person.toLowerCase()}>
            <View style={styles.personRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{g.person.charAt(0).toUpperCase()}</Text>
              </View>
              <Text style={styles.person}>{g.person}</Text>
              <Text style={styles.personTotal}>{g.outstanding > 0 ? formatRupees(g.outstanding) : 'Settled'}</Text>
            </View>
            <View style={styles.card}>
              {g.rows.map((r, i) => {
                const settled = r.settledAt !== null;
                return (
                  <View key={r.id} style={[styles.row, i > 0 && styles.rowBorder]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.merchant} numberOfLines={1}>{r.merchant}</Text>
                      <Text style={styles.date}>{day(r.date)}</Text>
                    </View>
                    <Text style={styles.amount}>{formatRupees(r.amount)}</Text>
                    {settled ? (
                      <View style={styles.settledTag}>
                        <Feather name="check" size={14} color={colors.accent} />
                        <Text style={styles.settledText}>Settled</Text>
                      </View>
                    ) : (
                      <PressableScale
                        style={styles.settle}
                        onPress={() => settleOwed(r.id)}
                        hitSlop={4}
                        accessibilityLabel={`Settle ${formatRupees(r.amount)} with ${g.person}`}
                      >
                        <Text style={styles.settleText}>Settle</Text>
                      </PressableScale>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        ))}

        {groups.length > 0 && outstanding.length === 0 && (
          <Text style={styles.empty}>That's everyone. Add someone from any transaction's "Split or owed".</Text>
        )}
        {groups.length === 0 && (
          <Text style={styles.empty}>Open a transaction and use "Split or owed" to add someone here.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = ({ colors, pillPalette }: Theme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.pageGutter, paddingVertical: spacing.md },
    title: { ...type.h1, color: colors.textPrimary },
    segment: { flexDirection: 'row', backgroundColor: colors.track, borderRadius: radii.pill, padding: 3, marginHorizontal: spacing.pageGutter },
    segmentItem: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 40, borderRadius: radii.pill },
    segmentItemOn: { backgroundColor: colors.card },
    segmentText: { ...type.label, fontSize: 14, color: colors.textSecondary },
    segmentTextOn: { color: colors.textPrimary },
    content: { padding: spacing.pageGutter, gap: spacing.sm, paddingBottom: spacing.xxxl },
    total: { ...type.caption, fontSize: 13, color: colors.textSecondary, marginBottom: spacing.sm },
    personRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md, marginBottom: spacing.sm },
    avatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: pillPalette[1].bg, alignItems: 'center', justifyContent: 'center' },
    avatarText: { ...type.caption, fontFamily: 'Inter-Medium', color: pillPalette[1].text },
    person: { ...type.bodyMedium, color: colors.textPrimary, flex: 1 },
    personTotal: { ...type.bodyMedium, color: colors.textPrimary },
    card: { backgroundColor: colors.card, borderRadius: radii.card, paddingHorizontal: spacing.md },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 56, paddingVertical: spacing.sm },
    rowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
    merchant: { ...type.bodyMedium, color: colors.textPrimary },
    date: { ...type.caption, color: colors.textSecondary },
    amount: { ...type.bodyMedium, color: colors.textPrimary },
    settle: { height: 40, minWidth: 72, paddingHorizontal: spacing.md, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
    settleText: { ...type.label, fontSize: 14, color: colors.accent },
    settledTag: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minWidth: 72, justifyContent: 'flex-end' },
    settledText: { ...type.caption, color: colors.accent },
    empty: { ...type.body, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xl },
  });
