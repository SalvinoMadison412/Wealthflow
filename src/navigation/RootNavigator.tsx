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
import { cardShadow, colors, spacing } from '../theme/tokens';

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
// stays at 5 items (see the pinned decision above). Hovers above the
// (transparent, borderless) tab bar, overlapping its top edge.
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
  const barHeight = TAB_BAR_HEIGHT + insets.bottom;

  return (
    <View style={{ flex: 1 }}>
      <Tabs.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarShowLabel: false,
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarAccessibilityLabel: route.name,
          // Seamless: no card surface, no border, no shadow — sits directly
          // on the page background like the header does.
          tabBarStyle: {
            backgroundColor: colors.background,
            borderTopWidth: 0,
            elevation: 0,
            shadowOpacity: 0,
            height: barHeight,
            paddingBottom: insets.bottom,
          },
          // Without a visible label, bottom-tabs' default item layout still
          // reserves label space below the icon, pushing it toward the top
          // of the item instead of centering it. Force true centering.
          tabBarItemStyle: {
            justifyContent: 'center',
            alignItems: 'center',
          },
          tabBarIcon: ({ color }) => (
            <Feather name={tabIcons[route.name as keyof MainTabsParamList]} color={color} size={22} />
          ),
        })}
      >
        <Tabs.Screen name="Home" component={HomeScreen} />
        <Tabs.Screen name="Transactions" component={TransactionsScreen} />
        <Tabs.Screen name="Budget" component={BudgetScreen} />
        <Tabs.Screen name="Rules" component={RulesListScreen} />
        <Tabs.Screen name="Profile" component={ProfileScreen} />
      </Tabs.Navigator>
      <QuickAddFab bottom={barHeight - FAB_SIZE / 2} />
    </View>
  );
}

const styles = StyleSheet.create({
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
