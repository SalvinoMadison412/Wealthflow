import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { radii, spacing, type } from '../theme/tokens';
import { Theme, useStyles } from '../theme/ThemeContext';
import { accountLabel, setAccountFilter, useAccountFilter } from './AccountFilter';
import { FilterChip } from './FilterChip';
import { PressableScale } from './PressableScale';
import { usePeriod } from './PeriodStepper';

// What Home can filter by: the account and the year (the month has its
// stepper). The full sheet (sort, type, amount) lives on Transactions.
export function HomeFilterSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { accounts, accountId } = useAccountFilter();
  const { year, years, pickYear } = usePeriod();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropTap} onPress={onClose} accessibilityLabel="Close filters" />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
          <Text style={styles.title}>Filters</Text>
          <ScrollView contentContainerStyle={styles.body}>
            {accounts.length > 1 && (
              <>
                <Text style={styles.label}>ACCOUNT</Text>
                <View style={styles.chips}>
                  {[null, ...accounts].map((a) => (
                    <FilterChip
                      key={a?.id ?? 'all'}
                      label={a ? accountLabel(a) : 'All accounts'}
                      selected={(a?.id ?? null) === accountId}
                      onPress={() => setAccountFilter(a?.id ?? null)}
                    />
                  ))}
                </View>
              </>
            )}
            <Text style={styles.label}>YEAR</Text>
            <View style={styles.chips}>
              {years.map((y) => (
                <FilterChip key={y} label={y} selected={year === y} onPress={() => pickYear(y)} />
              ))}
            </View>
          </ScrollView>
          <PressableScale style={styles.done} onPress={onClose}>
            <Text style={styles.doneText}>Done</Text>
          </PressableScale>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = ({ colors }: Theme) => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(20,22,26,0.42)' },
  backdropTap: { flex: 1 },
  sheet: {
    maxHeight: '85%',
    backgroundColor: colors.card,
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    paddingHorizontal: spacing.pageGutter,
    paddingTop: spacing.lg,
  },
  title: { ...type.h1, color: colors.textPrimary },
  body: { paddingBottom: spacing.md },
  label: { ...type.label, color: colors.textSecondary, marginTop: spacing.lg, marginBottom: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  done: {
    height: 48,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  doneText: { ...type.label, fontSize: 15, color: colors.accentText },
});
