import React from 'react';
import { View, ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// SafeAreaView (native) measures its inset after layout, so a screen that
// becomes visible lays out once with 0 and jumps down a frame later. The
// context inset is known on the first frame. Used by the four tab screens.
export function TopInsetView({ style, ...rest }: ViewProps) {
  const { top } = useSafeAreaInsets();
  return <View {...rest} style={[style, { paddingTop: top }]} />;
}
