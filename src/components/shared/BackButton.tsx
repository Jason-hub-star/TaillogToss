/**
 * App-wide back button using the same icon treatment as /dashboard/analysis.
 * Parity: UIUX-001
 */
import React from 'react';
import {
  Image,
  StyleSheet,
  TouchableOpacity,
  View,
  type ImageStyle,
  type Insets,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { ICONS } from 'lib/data/iconSources';

export const BACK_BUTTON_SLOT_WIDTH = 40;
export const BACK_BUTTON_ICON_SIZE = 24;

const DEFAULT_HIT_SLOP: Insets = { top: 8, bottom: 8, left: 8, right: 8 };

export interface BackButtonProps {
  onPress: () => void;
  accessibilityLabel?: string;
  hitSlop?: Insets;
  style?: StyleProp<ViewStyle>;
  iconStyle?: StyleProp<ImageStyle>;
}

export function BackButton({
  onPress,
  accessibilityLabel = '뒤로가기',
  hitSlop = DEFAULT_HIT_SLOP,
  style,
  iconStyle,
}: BackButtonProps) {
  return (
    <TouchableOpacity
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      activeOpacity={0.7}
      hitSlop={hitSlop}
      onPress={onPress}
      style={[styles.button, style]}
    >
      <Image source={{ uri: ICONS['ic-back'] }} style={[styles.icon, iconStyle]} resizeMode="contain" />
    </TouchableOpacity>
  );
}

export function BackButtonSpacer({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.spacer, style]} />;
}

const styles = StyleSheet.create({
  button: {
    width: BACK_BUTTON_SLOT_WIDTH,
    height: BACK_BUTTON_ICON_SIZE,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  icon: {
    width: BACK_BUTTON_ICON_SIZE,
    height: BACK_BUTTON_ICON_SIZE,
  },
  spacer: {
    width: BACK_BUTTON_SLOT_WIDTH,
    height: BACK_BUTTON_ICON_SIZE,
  },
});
