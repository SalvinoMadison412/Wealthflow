import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PressableScale } from '../components/PressableScale';
import { AmountCondition, useRules } from '../data/RulesContext';
import { colors, radii, spacing, type } from '../theme/tokens';

type AmountOperator = AmountCondition['operator'];

const OPERATORS: { key: AmountOperator; label: string; fieldLabel: string }[] = [
  { key: 'moreThan', label: 'More than', fieldLabel: 'AMOUNT MORE THAN' },
  { key: 'lessThan', label: 'Less than', fieldLabel: 'AMOUNT LESS THAN' },
  { key: 'equalTo', label: 'Equal to', fieldLabel: 'AMOUNT EQUAL TO' },
  { key: 'between', label: 'Between', fieldLabel: 'AMOUNT BETWEEN' },
];

function isValidNumber(text: string): boolean {
  return text.trim().length > 0 && !Number.isNaN(Number(text));
}

// Merchant and amount are two independent, optional conditions (at least one
// required) rather than an either/or toggle — a rule can be "Blinkit" alone,
// "over ₹500" alone, or both together (AND). v3_new_rule_form/screen.png only
// rendered a toggle + "Save Rule" button legibly; the rest of this layout
// follows DESIGN.md's minimalist input style rather than a pixel match.
export function NewRuleFormScreen() {
  const navigation = useNavigation();
  const { addRule } = useRules();

  const [merchant, setMerchant] = useState('');
  const [operator, setOperator] = useState<AmountOperator | null>(null);
  const [value, setValue] = useState('');
  const [min, setMin] = useState('');
  const [max, setMax] = useState('');
  const [category, setCategory] = useState('');

  const amountValid =
    operator === null
      ? true
      : operator === 'between'
        ? isValidNumber(min) && isValidNumber(max)
        : isValidNumber(value);

  const canSave =
    category.trim().length > 0 && (merchant.trim().length > 0 || operator !== null) && amountValid;

  function selectOperator(key: AmountOperator) {
    setOperator((current) => (current === key ? null : key));
  }

  function save() {
    if (!canSave) return;
    const amount: AmountCondition | undefined =
      operator === null
        ? undefined
        : operator === 'between'
          ? { operator: 'between', min: Number(min), max: Number(max) }
          : { operator, value: Number(value) };

    addRule({
      category: category.trim(),
      merchant: merchant.trim() || undefined,
      amount,
    });
    navigation.goBack();
  }

  const activeOperator = OPERATORS.find((o) => o.key === operator);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>New Rule</Text>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Feather name="x" size={22} color={colors.onSurface} />
        </Pressable>
      </View>

      <View style={styles.form}>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>MERCHANT CONTAINS</Text>
          <TextInput
            style={styles.input}
            value={merchant}
            onChangeText={setMerchant}
            placeholder="e.g., Swiggy (optional)"
            placeholderTextColor={colors.outline}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>AMOUNT (OPTIONAL)</Text>
          <View style={styles.operatorRow}>
            {OPERATORS.map((o) => (
              <PressableScale
                key={o.key}
                style={[styles.operatorChip, operator === o.key && styles.operatorChipActive]}
                onPress={() => selectOperator(o.key)}
              >
                <Text
                  style={[styles.operatorChipText, operator === o.key && styles.operatorChipTextActive]}
                >
                  {o.label}
                </Text>
              </PressableScale>
            ))}
          </View>

          {operator === 'between' ? (
            <View style={styles.betweenRow}>
              <View style={styles.betweenField}>
                <Text style={styles.fieldLabel}>MIN</Text>
                <View style={styles.amountRow}>
                  <Text style={styles.currency}>₹</Text>
                  <TextInput
                    style={[styles.input, styles.amountInput]}
                    value={min}
                    onChangeText={setMin}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={colors.outline}
                  />
                </View>
              </View>
              <View style={styles.betweenField}>
                <Text style={styles.fieldLabel}>MAX</Text>
                <View style={styles.amountRow}>
                  <Text style={styles.currency}>₹</Text>
                  <TextInput
                    style={[styles.input, styles.amountInput]}
                    value={max}
                    onChangeText={setMax}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={colors.outline}
                  />
                </View>
              </View>
            </View>
          ) : (
            activeOperator && (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>{activeOperator.fieldLabel}</Text>
                <View style={styles.amountRow}>
                  <Text style={styles.currency}>₹</Text>
                  <TextInput
                    style={[styles.input, styles.amountInput]}
                    value={value}
                    onChangeText={setValue}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={colors.outline}
                  />
                </View>
              </View>
            )
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>CATEGORY</Text>
          <TextInput
            style={styles.input}
            value={category}
            onChangeText={setCategory}
            placeholder="e.g., Food"
            placeholderTextColor={colors.outline}
          />
        </View>
      </View>

      <PressableScale
        style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
        onPress={save}
        disabled={!canSave}
      >
        <Text style={styles.saveButtonText}>Save Rule</Text>
      </PressableScale>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.white,
    padding: spacing.marginPage,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.stackLg,
  },
  title: {
    ...type.headlineMd,
    color: colors.onSurface,
  },
  form: {
    flex: 1,
    gap: spacing.stackLg,
  },
  field: {
    gap: spacing.stackSm,
  },
  fieldLabel: {
    ...type.labelSm,
    color: colors.outline,
  },
  input: {
    ...type.bodyLg,
    color: colors.onSurface,
    borderBottomWidth: 1,
    borderColor: colors.onSurface,
    paddingVertical: spacing.stackSm,
  },
  operatorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.stackSm,
    marginBottom: spacing.stackSm,
  },
  operatorChip: {
    flexGrow: 1,
    flexBasis: '45%',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radii.md,
    paddingVertical: 10,
    alignItems: 'center',
  },
  operatorChipActive: {
    backgroundColor: colors.onSurface,
    borderColor: colors.onSurface,
  },
  operatorChipText: {
    ...type.labelMd,
    letterSpacing: 0,
    color: colors.onSurfaceVariant,
  },
  operatorChipTextActive: {
    color: colors.white,
  },
  betweenRow: {
    flexDirection: 'row',
    gap: spacing.gutter,
  },
  betweenField: {
    flex: 1,
    gap: spacing.stackSm,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  currency: {
    ...type.numeral,
    fontSize: 18,
    color: colors.onSurface,
  },
  amountInput: {
    ...type.numeral,
    fontSize: 18,
    flex: 1,
    borderBottomWidth: 0,
  },
  saveButton: {
    backgroundColor: colors.black,
    borderRadius: radii.md,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    ...type.labelMd,
    letterSpacing: 0,
    fontSize: 16,
    color: colors.white,
  },
});
