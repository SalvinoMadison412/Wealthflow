import { Feather } from '@expo/vector-icons';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator, NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '../components/PressableScale';
import { BudgetScreen } from '../screens/BudgetScreen';
import { CategorizeSheet } from '../screens/CategorizeSheet';
import { HomeScreen } from '../screens/HomeScreen';
import { ImportScreen } from '../screens/ImportScreen';
import { NewRuleFormScreen } from '../screens/NewRuleFormScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { RulesListScreen } from '../screens/RulesListScreen';
import { TransactionsScreen } from '../screens/TransactionsScreen';
import { cardShadow, colors, radii, spacing } from '../theme/tokens';

export type RootStackParamList = {
  MainTabs: undefined;
  Import: undefined;
  NewRuleForm: undefined;
  CategorizeSheet: { transactionId: string };
};

export type MainTabsParamList = {
  Home: undefined;
  Transactions: undefined;
  Budget: undefined;
  Rules: undefined;
  Profile: undefined;
};

// Household (PR 11) is a scope control inside these screens, never a 6th
// tab — see docs/REDESIGN_PLAN.md PR 3.
const tabIcons: Record<keyof MainTabsParamList, keyof typeof Feather.glyphMap> = {
  Home: 'home',
  Transactions: 'list',
  Budget: 'pie-chart',
  Rules: 'sliders',
  Profile: 'user',
};

const Tabs = createBottomTabNavigator<MainTabsParamList>();

const TAB_BAR_HEIGHT = 64;
const FAB_SIZE = 52;

// A quick-add shortcut to Import, not a nav destination — the tab bar
// stays at 5 items (see the pinned decision above). Floats above the
// tab bar, overlapping its top edge.
function QuickAddFab({ bottom }: { bottom: number }) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  return (
    <PressableScale
      style={[styles.fab, { bottom }]}
      onPress={() => navigation.navigate('Import')}
      accessibilityLabel="Import a statement"
      accessibilityRole="button"
    >
      <Feather name="plus" size={22} color={colors.accentText} />
    </PressableScale>
  );
}

function MainTabs() {
  const insets = useSafeAreaInsets();
  const barBottom = insets.bottom + spacing.md;

  return (
    <View style={{ flex: 1 }}>
      <Tabs.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarShowLabel: false,
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarAccessibilityLabel: route.name,
          // Floating pill: inset from the edges and elevated on a shadow
          // rather than a full-width bar anchored to the screen edge.
          tabBarStyle: {
            position: 'absolute',
            left: spacing.pageGutter,
            right: spacing.pageGutter,
            bottom: barBottom,
            height: TAB_BAR_HEIGHT,
            borderRadius: radii.pill,
            backgroundColor: colors.card,
            borderTopWidth: 0,
            ...cardShadow,
            shadowOpacity: 0.16,
            shadowRadius: 20,
            shadowOffset: { width: 0, height: 8 },
            elevation: 8,
          },
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.tabIconWrap}>
              <Feather name={tabIcons[route.name as keyof MainTabsParamList]} color={color} size={20} />
              {focused && <View style={styles.tabDot} />}
            </View>
          ),
        })}
      >
        <Tabs.Screen name="Home" component={HomeScreen} />
        <Tabs.Screen name="Transactions" component={TransactionsScreen} />
        <Tabs.Screen name="Budget" component={BudgetScreen} />
        <Tabs.Screen name="Rules" component={RulesListScreen} />
        <Tabs.Screen name="Profile" component={ProfileScreen} />
      </Tabs.Navigator>
      <QuickAddFab bottom={barBottom + TAB_BAR_HEIGHT - FAB_SIZE / 2} />
    </View>
  );
}

const styles = StyleSheet.create({
  tabIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 28,
  },
  tabDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.accent,
  },
  fab: {
    position: 'absolute',
    left: '50%',
    marginLeft: -FAB_SIZE / 2,
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...cardShadow,
    shadowColor: colors.accent,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
});

const RootStack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        <RootStack.Screen name="MainTabs" component={MainTabs} />
        <RootStack.Screen name="Import" component={ImportScreen} options={{ presentation: 'modal' }} />
        <RootStack.Screen
          name="NewRuleForm"
          component={NewRuleFormScreen}
          options={{ presentation: 'modal' }}
        />
        <RootStack.Screen
          name="CategorizeSheet"
          component={CategorizeSheet}
          options={{
            presentation: 'formSheet',
            sheetAllowedDetents: [0.55, 1],
            sheetGrabberVisible: true,
            sheetCornerRadius: 20,
          }}
        />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
