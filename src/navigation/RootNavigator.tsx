import { Feather } from '@expo/vector-icons';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { Text } from 'react-native';

import { BudgetScreen } from '../screens/BudgetScreen';
import { CategorizeSheet } from '../screens/CategorizeSheet';
import { HomeScreen } from '../screens/HomeScreen';
import { ImportScreen } from '../screens/ImportScreen';
import { NewRuleFormScreen } from '../screens/NewRuleFormScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { RulesListScreen } from '../screens/RulesListScreen';
import { TransactionsScreen } from '../screens/TransactionsScreen';
import { colors, type } from '../theme/tokens';

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

function MainTabs() {
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        },
        // bottom-tabs' tabBarLabelStyle has no maxFontSizeMultiplier hook,
        // so the label is rendered directly: capped at 1.3x scale, and
        // allowed to shrink (never wrap or clip) so "Transactions" — the
        // longest of the five labels — fits its column at any font size.
        tabBarLabel: ({ color, children }) => (
          <Text
            style={[type.caption, { color, textAlign: 'center' }]}
            allowFontScaling
            maxFontSizeMultiplier={1.3}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
          >
            {children}
          </Text>
        ),
        tabBarIcon: ({ color, size }) => (
          <Feather name={tabIcons[route.name as keyof MainTabsParamList]} color={color} size={size} />
        ),
      })}
    >
      <Tabs.Screen name="Home" component={HomeScreen} />
      <Tabs.Screen name="Transactions" component={TransactionsScreen} />
      <Tabs.Screen name="Budget" component={BudgetScreen} />
      <Tabs.Screen name="Rules" component={RulesListScreen} />
      <Tabs.Screen name="Profile" component={ProfileScreen} />
    </Tabs.Navigator>
  );
}

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
