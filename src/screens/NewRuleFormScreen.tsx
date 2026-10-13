import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CategoryPill } from '../components/CategoryPill';
import { FilterChip } from '../components/FilterChip';
import { PressableScale } from '../components/PressableScale';
import { AmountCondition, splitMerchants } from '../db/matching';
import { getOrCreateCategoryByName } from '../db/categories';
import { insertRule } from '../db/transactions';
import { listCategoriesForFilter } from '../db/queries';
import { useQuery } from '../db/useQuery';
import { contentWrap, radii, spacing, type } from '../theme/tokens';
import { Theme, useStyles, useTheme } from '../theme/ThemeContext';

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

// A rule made here matches by merchant or by amount, never both: the
// switch at the top picks which, and only that condition is saved.
export function NewRuleFormScreen() {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const navigation = useNavigation();
  const categories = useQuery(() => listCategoriesForFilter(), []);

  const [mode, setMode] = useState<'merchant' | 'amount'>('merchant');
  const [showMerchantInfo, setShowMerchantInfo] = useState(false);
  const [merchant, setMerchant] = useState('');
  const [operator, setOperator] = useState<AmountOperator>('moreThan');
  const [value, setValue] = useState('');
  const [min, setMin] = useState('');
  const [max, setMax] = useState('');
  const [categoryName, setCategoryName] = useState<string | null>(null);
  const [showNewCategoryField, setShowNewCategoryField] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const merchants = splitMerchants(merchant);
  const amountValid = operator === 'between' ? isValidNumber(min) && isValidNumber(max) : isValidNumber(value);

  const canSave = categoryName !== null && (mode === 'merchant' ? merchants.length > 0 : amountValid);

  function addNewCategory() {
    const name = newCategoryName.trim();
    if (!name) return;
    getOrCreateCategoryByName(name, 'expense');
    setCategoryName(name);
    setNewCategoryName('');
    setShowNewCategoryField(false);
  }

  function save() {
    if (!canSave || !categoryName) return;
    const amount: AmountCondition =
      operator === 'between'
        ? { operator: 'between', min: Number(min), max: Number(max) }
        : { operator, value: Number(value) };

    insertRule(
      mode === 'merchant'
        ? { category: categoryName, merchant: merchants.join(', ') }
        : { category: categoryName, amount }
    );
    navigation.goBack();
  }

  const activeOperator = OPERATORS.find((o) => o.key === operator)!;

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>New Rule</Text>
        <Pressable onPress={() => navigation.goBack()} hitSlop={13} accessibilityLabel="Close">
          <Feather name="x" size={22} color={colors.textPrimary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={[styles.form, contentWrap]} keyboardShouldPersistTaps="handled">
        <View style={styles.segment} accessibilityRole="tablist">
          {(['merchant', 'amount'] as const).map((m) => (
            <Pressable
              key={m}
              onPress={() => setMode(m)}
              accessibilityRole="tab"
              accessibilityState={{ selected: mode === m }}
              style={[styles.segmentOption, mode === m && styles.segmentOptionSelected]}
            >
              <Text style={[styles.segmentLabel, mode === m && styles.segmentLabelSelected]}>
                {m === 'merchant' ? 'Merchant' : 'Amount'}
              </Text>
            </Pressable>
          ))}
        </View>

        {mode === 'merchant' ? (
          <View style={styles.field}>
            <View style={styles.labelRow}>
              <Text style={styles.fieldLabel}>MERCHANTS</Text>
              <Pressable
                onPress={() => setShowMerchantInfo((shown) => !shown)}
                hitSlop={16}
                accessibilityRole="button"
                accessibilityLabel="How merchant matching works"
                accessibilityState={{ expanded: showMerchantInfo }}
              >
                <Feather name="info" size={16} color={showMerchantInfo ? colors.accent : colors.textSecondary} />
              </Pressable>
            </View>
            <TextInput
              style={styles.input}
              value={merchant}
              onChangeText={setMerchant}
              placeholder="e.g., Swiggy, Zomato"
              placeholderTextColor={colors.textSecondary}
              autoCorrect={false}
            />
            <Text style={styles.fieldLabel}>Separate merchants with commas</Text>
            {showMerchantInfo && (
              <Text style={styles.info}>
                Capital and small letters are treated the same, so "swiggy" also matches "SWIGGY". A transaction
                that contains any one of these merchants gets this category.
              </Text>
            )}
            {merchants.length > 1 && (
              <View style={styles.grid}>
                {merchants.map((m, i) => (
                  <View key={i} style={styles.merchantChip}>
                    <Text style={styles.merchantChipText}>{m}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>AMOUNT</Text>
            <View style={styles.chipRow}>
              {OPERATORS.map((o) => (
                <FilterChip key={o.key} label={o.label} selected={operator === o.key} onPress={() => setOperator(o.key)} />
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
                      placeholderTextColor={colors.textSecondary}
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
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                </View>
              </View>
            ) : (
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
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              </View>
            )}
          </View>
        )}

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>CATEGORY</Text>
          <View style={styles.grid}>
            {categories.map((c) => (
              <Pressable key={c.id} onPress={() => setCategoryName(c.name)} hitSlop={12}>
                <View style={categoryName === c.name ? styles.pillSelected : undefined}>
                  <CategoryPill name={c.name} colorIndex={c.colorIndex} />
                </View>
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
        </View>
      </ScrollView>

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

const makeStyles = ({ colors, pillPalette }: Theme) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.pageGutter,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  title: {
    ...type.h2,
    color: colors.textPrimary,
  },
  form: {
    gap: spacing.xxl,
    paddingBottom: spacing.xxl,
  },
  field: {
    gap: spacing.sm,
  },
  fieldLabel: {
    ...type.caption,
    color: colors.textSecondary,
  },
  input: {
    ...type.body,
    color: colors.textPrimary,
    borderBottomWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.track,
    borderRadius: radii.button,
    padding: 3,
  },
  segmentOption: {
    flex: 1,
    height: 42,
    borderRadius: radii.button - 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentOptionSelected: {
    backgroundColor: colors.card,
  },
  segmentLabel: {
    ...type.label,
    color: colors.textSecondary,
  },
  segmentLabelSelected: {
    color: colors.textPrimary,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  info: {
    ...type.caption,
    color: colors.textPrimary,
    backgroundColor: colors.card,
    borderRadius: radii.button,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  merchantChip: {
    height: 24,
    paddingHorizontal: 10,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    justifyContent: 'center',
  },
  merchantChipText: {
    ...type.label,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textPrimary,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  betweenRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  betweenField: {
    flex: 1,
    gap: spacing.sm,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  currency: {
    ...type.amountMd,
    fontSize: 18,
    color: colors.textPrimary,
  },
  amountInput: {
    ...type.amountMd,
    fontSize: 18,
    flex: 1,
    borderBottomWidth: 0,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  pillSelected: {
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: colors.accent,
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
  saveButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.button,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    ...type.label,
    fontSize: 16,
    color: colors.accentText,
  },
});
