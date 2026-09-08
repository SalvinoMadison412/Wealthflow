import { Feather } from '@expo/vector-icons';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator, SceneStyleInterpolators } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import { HomeScreen } from '../screens/HomeScreen';
import { InsightsScreen } from '../screens/InsightsScreen';
import { NewRuleFormScreen } from '../screens/NewRuleFormScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { RulesListScreen } from '../screens/RulesListScreen';
import { colors, type } from '../theme/tokens';

export type RootStackParamList = {
  MainTabs: undefined;
  NewRuleForm: undefined;
};

export type MainTabsParamList = {
  Home: undefined;
  Insights: undefined;
  Rules: undefined;
  Profile: undefined;
};

const tabIcons: Record<keyof MainTabsParamList, keyof typeof Feather.glyphMap> = {
  Home: 'home',
  Insights: 'trending-up',
  Rules: 'check-square',
  Profile: 'user',
};

const Tabs = createBottomTabNavigator<MainTabsParamList>();

function MainTabs() {
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.white,
        tabBarInactiveTintColor: colors.outline,
        tabBarStyle: {
          backgroundColor: colors.black,
          borderTopWidth: 0,
        },
        tabBarLabelStyle: { ...type.labelSm, letterSpacing: 0 },
        tabBarIcon: ({ color, size }) => (
          <Feather name={tabIcons[route.name as keyof MainTabsParamList]} color={color} size={size} />
        ),
        sceneStyleInterpolator: SceneStyleInterpolators.forFade,
        transitionSpec: { animation: 'spring', config: { stiffness: 260, damping: 26, mass: 1 } },
      })}
    >
      <Tabs.Screen name="Home" component={HomeScreen} />
      <Tabs.Screen name="Insights" component={InsightsScreen} />
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
        <RootStack.Screen
          name="NewRuleForm"
          component={NewRuleFormScreen}
          options={{ presentation: 'modal' }}
        />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
