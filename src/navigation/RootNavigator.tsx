import { Feather } from '@expo/vector-icons';
import { DarkTheme, DefaultTheme, NavigationContainer, useNavigation } from '@react-navigation/native';
import { BottomTabBarProps, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator, NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../auth/AuthContext';
import { PressableScale } from '../components/PressableScale';
import { BudgetScreen } from '../screens/BudgetScreen';
import { CategorizeSheet } from '../screens/CategorizeSheet';
import { HomeScreen } from '../screens/HomeScreen';
import { ImportScreen } from '../screens/ImportScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { MenuSheet } from '../screens/MenuSheet';
import { NewRuleFormScreen } from '../screens/NewRuleFormScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { OtpScreen } from '../screens/OtpScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { RulesListScreen } from '../screens/RulesListScreen';
import { StatementsScreen } from '../screens/StatementsScreen';
import { TransactionsScreen } from '../screens/TransactionsScreen';
import { useTourTarget } from '../tour/targets';
import { cardShadow } from '../theme/tokens';
import { Theme, useStyles, useTheme } from '../theme/ThemeContext';

export type RootStackParamList = {
  Login: undefined;
  Otp: { phone: string };
  Onboarding: undefined;
  EditProfile: undefined;
  MainTabs: undefined;
  Import: undefined;
  NewRuleForm: undefined;
  CategorizeSheet: { transactionId: string };
  Profile: undefined;
  Menu: undefined;
  Statements: undefined;
};

export type MainTabsParamList = {
  Home: undefined;
  Transactions: undefined;
  Budget: undefined;
  Rules: undefined;
};

// Profile moved off the tab bar and behind the header's menu icon so the
// 4 remaining tabs sit evenly around the quick-add FAB (see MainTabs).
const tabIcons: Record<keyof MainTabsParamList, keyof typeof Feather.glyphMap> = {
  Home: 'home',
  Transactions: 'list',
  Budget: 'pie-chart',
  Rules: 'sliders',
};

const Tabs = createBottomTabNavigator<MainTabsParamList>();

const TAB_BAR_HEIGHT = 64;
const FAB_SIZE = 52;

// A quick-add shortcut to Import, not a nav destination — the tab bar
// stays at 4 items (see the pinned decision above). Hovers above the
// (transparent, borderless) tab bar, overlapping its top edge.
function QuickAddFab({ bottom }: { bottom: number }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const target = useTourTarget('fab');
  return (
    <PressableScale
      {...target}
      style={[styles.fab, { bottom }]}
      onPress={() => navigation.navigate('Import')}
      accessibilityLabel="Import a statement"
      accessibilityRole="button"
    >
      <Feather name="plus" size={22} color={colors.accentText} />
    </PressableScale>
  );
}

// Custom renderer (rather than the default bottom-tabs layout) so the 4
// tabs and the FAB sit in 5 EQUAL-width slots — Home, Transactions, an
// empty slot the FAB floats over, Budget, Rules — giving every gap the
// same width instead of 4 evenly-spaced tabs with the FAB dropped
// asymmetrically into the middle seam.
function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const barHeight = TAB_BAR_HEIGHT + insets.bottom;
  const routes = state.routes as { key: string; name: keyof MainTabsParamList }[];
  const entries = routes.map((route, index) => ({ route, index }));
  const transactionsTarget = useTourTarget('transactionsTab');
  const rulesTarget = useTourTarget('rulesTab');

  const renderItem = ({ route, index }: (typeof entries)[number]) => {
    const isFocused = state.index === index;
    const color = isFocused ? colors.accent : colors.textSecondary;
    return (
      <Pressable
        key={route.key}
        {...(route.name === 'Transactions' ? transactionsTarget : route.name === 'Rules' ? rulesTarget : {})}
        style={styles.tabItem}
        accessibilityRole="button"
        accessibilityState={isFocused ? { selected: true } : {}}
        accessibilityLabel={route.name}
        onPress={() => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
        }}
      >
        <Feather name={tabIcons[route.name]} color={color} size={22} />
      </Pressable>
    );
  };

  return (
    <View style={[styles.tabBar, { height: barHeight, paddingBottom: insets.bottom }]}>
      {entries.slice(0, 2).map(renderItem)}
      <View style={styles.tabItem} />
      {entries.slice(2).map(renderItem)}
    </View>
  );
}

function MainTabs() {
  const insets = useSafeAreaInsets();
  const barHeight = TAB_BAR_HEIGHT + insets.bottom;

  return (
    <View style={{ flex: 1 }}>
      <Tabs.Navigator screenOptions={{ headerShown: false }} tabBar={(props) => <CustomTabBar {...props} />}>
        <Tabs.Screen name="Home" component={HomeScreen} />
        <Tabs.Screen name="Transactions" component={TransactionsScreen} />
        <Tabs.Screen name="Budget" component={BudgetScreen} />
        <Tabs.Screen name="Rules" component={RulesListScreen} />
      </Tabs.Navigator>
      <QuickAddFab bottom={barHeight - FAB_SIZE / 2} />
    </View>
  );
}

const makeStyles = ({ colors, pillPalette }: Theme) => StyleSheet.create({
  // Seamless: no card surface, no border, no shadow — sits directly on
  // the page background like the header does.
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.background,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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

// Three stacks keyed off auth state: signed out → Login/Otp; signed in
// without a profile row → Onboarding; otherwise the app. React Navigation
// swaps between them automatically as `session`/`profile` change. The
// edit-profile route reuses the Onboarding screen under a different name
// on purpose: if it were also called "Onboarding", finishing first-run
// onboarding would leave the user parked on that route in the new stack
// instead of landing on Home.
export function RootNavigator() {
  const { session, profile } = useAuth();
  const { scheme, colors } = useTheme();
  // Stack transitions and sheet backgrounds come from the navigator's
  // theme, not our StyleSheets, so it has to follow the scheme too.
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: { ...base.colors, background: colors.background, card: colors.card, text: colors.textPrimary, border: colors.border, primary: colors.accent },
  };
  return (
    <NavigationContainer theme={navTheme}>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {!session ? (
          <>
            <RootStack.Screen name="Login" component={LoginScreen} />
            <RootStack.Screen name="Otp" component={OtpScreen} />
          </>
        ) : !profile ? (
          <RootStack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : (
          <>
            <RootStack.Screen name="MainTabs" component={MainTabs} />
            <RootStack.Screen name="Profile" component={ProfileScreen} />
            <RootStack.Screen name="EditProfile" component={OnboardingScreen} />
            <RootStack.Screen name="Statements" component={StatementsScreen} />
            <RootStack.Screen
              name="Menu"
              component={MenuSheet}
              options={{
                presentation: 'formSheet',
                sheetAllowedDetents: [0.62, 1],
                sheetGrabberVisible: true,
                sheetCornerRadius: 20,
              }}
            />
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
          </>
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
