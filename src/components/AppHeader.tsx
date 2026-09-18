import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Logo } from './Logo';
import { RootStackParamList } from '../navigation/RootNavigator';
import { contentWrap, spacing } from '../theme/tokens';
import { Theme, useStyles, useTheme } from '../theme/ThemeContext';

// Seamless: sits directly on the page background, no card surface or
// border to separate it from the content below.
export function AppHeader() {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  return (
    <View style={styles.header}>
      <Pressable onPress={() => navigation.navigate('Profile')} hitSlop={13} accessibilityLabel="Profile and settings">
        <Feather name="menu" size={22} color={colors.textPrimary} />
      </Pressable>
      <Logo size={22} />
      <Feather name="bell" size={20} color={colors.textSecondary} />
    </View>
  );
}

const makeStyles = ({ colors, pillPalette }: Theme) => StyleSheet.create({
  header: {
    ...contentWrap,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.pageGutter,
    paddingVertical: spacing.md,
  },
});
