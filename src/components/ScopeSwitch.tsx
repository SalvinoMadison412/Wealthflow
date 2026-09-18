import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { FilterChip } from './FilterChip';
import { spacing } from '../theme/tokens';

interface ScopeSwitchProps {
  scope: string; // 'me' | 'household' | a literal owner_label
  onChange: (scope: string) => void;
  ownerLabels: string[];
}

// Household (CLAUDE.md: on-device only — no backend, no invite, no
// roles) is a scope control on Home/Transactions/Budget, never a 6th
// tab. "Me" always means accounts labeled "Me", or the single account
// on the phone regardless of its label — see
// db/queries.ts#getAccountIdsForScope.
export function ScopeSwitch({ scope, onChange, ownerLabels }: ScopeSwitchProps) {
  const otherMembers = ownerLabels.filter((label) => label !== 'Me');
  const options: { value: string; label: string }[] = [
    { value: 'me', label: 'Me' },
    { value: 'household', label: 'Household' },
    ...otherMembers.map((label) => ({ value: label, label })),
  ];

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {options.map((o) => (
        <FilterChip key={o.value} label={o.label} selected={scope === o.value} onPress={() => onChange(o.value)} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: spacing.sm,
  },
});
