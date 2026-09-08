import { Feather } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Logo } from './Logo';
import { colors } from '../theme/tokens';

export function AppHeader() {
  return (
    <View style={styles.header}>
      <Feather name="menu" size={22} color={colors.white} />
      <Logo size={20} color={colors.white} />
      <Feather name="bell" size={20} color={colors.white} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: colors.black,
  },
});
