import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CategoryPill } from '../components/CategoryPill';
import { PressableScale } from '../components/PressableScale';
import { AppHeader } from '../components/AppHeader';
import { deleteRule, moveRule, setRuleEnabled } from '../db/transactions';
import { listRulesForDisplay, RuleListItem } from '../db/queries';
import { useQuery } from '../db/useQuery';
import { RootStackParamList } from '../navigation/RootNavigator';
import { colors, contentWrap, radii, spacing, type } from '../theme/tokens';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const UNDO_WINDOW_MS = 5000;

function RuleCard({
  rule,
  isFirst,
  isLast,
  onToggle,
  onMoveUp,
  onMoveDown,
  onDelete,
}: {
  rule: RuleListItem;
  isFirst: boolean;
  isLast: boolean;
  onToggle: (enabled: boolean) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.description}>{rule.description}</Text>
        <Switch
          value={rule.enabled}
          onValueChange={onToggle}
          trackColor={{ false: colors.border, true: colors.accent }}
          thumbColor={colors.card}
          accessibilityLabel={rule.description}
        />
      </View>
      <View style={styles.bottomRow}>
        <CategoryPill name={rule.categoryName} colorIndex={rule.colorIndex} />
        <View style={styles.actions}>
          <Pressable onPress={onMoveUp} disabled={isFirst} hitSlop={15} accessibilityLabel="Move up">
            <Feather name="chevron-up" size={18} color={isFirst ? colors.border : colors.textSecondary} />
          </Pressable>
          <Pressable onPress={onMoveDown} disabled={isLast} hitSlop={15} accessibilityLabel="Move down">
            <Feather name="chevron-down" size={18} color={isLast ? colors.border : colors.textSecondary} />
          </Pressable>
          <Pressable onPress={onDelete} hitSlop={15} accessibilityLabel="Delete rule">
            <Feather name="trash-2" size={18} color={colors.expenseText} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export function RulesListScreen() {
  const navigation = useNavigation<Nav>();
  const allRules = useQuery(() => listRulesForDisplay(), []);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const deleteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (deleteTimer.current) clearTimeout(deleteTimer.current);
    };
  }, []);

  const rules = allRules.filter((r) => r.id !== pendingDeleteId);

  function requestDelete(id: string) {
    setPendingDeleteId(id);
    deleteTimer.current = setTimeout(() => {
      deleteRule(id);
      setPendingDeleteId(null);
    }, UNDO_WINDOW_MS);
  }

  function undoDelete() {
    if (deleteTimer.current) clearTimeout(deleteTimer.current);
    setPendingDeleteId(null);
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <AppHeader />
      <ScrollView contentContainerStyle={[styles.content, contentWrap]}>
        <View style={styles.titleBlock}>
          <Text style={styles.headline}>My Rules</Text>
          <Text style={styles.subtitle}>Rules are checked top to bottom; the first match wins.</Text>
        </View>

        {rules.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Feather name="sliders" size={22} color={colors.accentText} />
            </View>
            <Text style={styles.emptyTitle}>No rules yet</Text>
            <Text style={styles.emptyBody}>
              Every transaction shows as Uncategorized until you add a rule. Match a merchant or an
              amount to a category to start sorting your spend automatically.
            </Text>
            <PressableScale style={styles.emptyButton} onPress={() => navigation.navigate('NewRuleForm')}>
              <Feather name="plus" size={16} color={colors.accentText} />
              <Text style={styles.emptyButtonText}>Add your first rule</Text>
            </PressableScale>
          </View>
        ) : (
          <>
            <View style={styles.cardStack}>
              {rules.map((rule, i) => (
                <RuleCard
                  key={rule.id}
                  rule={rule}
                  isFirst={i === 0}
                  isLast={i === rules.length - 1}
                  onToggle={(enabled) => setRuleEnabled(rule.id, enabled)}
                  onMoveUp={() => moveRule(rule.id, 'up')}
                  onMoveDown={() => moveRule(rule.id, 'down')}
                  onDelete={() => requestDelete(rule.id)}
                />
              ))}
            </View>

            <PressableScale style={styles.addButton} onPress={() => navigation.navigate('NewRuleForm')}>
              <Feather name="plus" size={16} color={colors.accent} />
              <Text style={styles.addButtonText}>Add Rule</Text>
            </PressableScale>
          </>
        )}
      </ScrollView>

      {pendingDeleteId && (
        <View style={styles.undoBar}>
          <Text style={styles.undoText}>Rule deleted</Text>
          <PressableScale onPress={undoDelete} hitSlop={8}>
            <Text style={styles.undoAction}>Undo</Text>
          </PressableScale>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.pageGutter,
  },
  titleBlock: {
    marginBottom: spacing.xxl,
  },
  headline: {
    ...type.h1,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...type.body,
    color: colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.lg,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    ...type.h2,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptyBody: {
    ...type.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
  emptyButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  emptyButtonText: {
    ...type.label,
    color: colors.accentText,
  },
  cardStack: {
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  description: {
    ...type.bodyMedium,
    color: colors.textPrimary,
    flex: 1,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  addButton: {
    marginTop: spacing.xxl,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.button,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  addButtonText: {
    ...type.label,
    color: colors.accent,
  },
  undoBar: {
    position: 'absolute',
    left: spacing.pageGutter,
    right: spacing.pageGutter,
    bottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.textPrimary,
    borderRadius: radii.button,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  undoText: {
    ...type.body,
    color: colors.white,
  },
  undoAction: {
    ...type.label,
    color: colors.accent,
  },
});
