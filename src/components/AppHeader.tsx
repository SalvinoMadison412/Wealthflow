import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Logo } from './Logo';
import { RootStackParamList } from '../navigation/RootNavigator';
import { colors, contentWrap, spacing } from '../theme/tokens';

// Seamless: sits directly on the page background, no card surface or
// border to separate it from the content below.
export function AppHeader() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  return (
    <View style={styles.header}>
      <Pressable onPress={() => navigation.navigate('Profile')} hitSlop={13} accessibilityLabel="Profile and settings">
        <Feather name="menu" size={22} color={colors.textPrimary} />
      </Pressable>
      <Logo size={18} color={colors.textPrimary} />
      <Feather name="bell" size={20} color={colors.textSecondary} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    ...contentWrap,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.pageGutter,
    paddingVertical: spacing.md,
  },
});
