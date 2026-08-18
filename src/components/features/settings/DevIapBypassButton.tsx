/**
 * DEV-only IAP bypass for local AIT SDK crash diagnosis.
 * This module must only be required from an __DEV__ branch.
 */
import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';

interface DevIapBypassButtonProps {
  disabled: boolean;
  onPress: () => void;
  buttonStyle: StyleProp<ViewStyle>;
  disabledStyle: StyleProp<ViewStyle>;
  textStyle: StyleProp<TextStyle>;
}

export function DevIapBypassButton({
  disabled,
  onPress,
  buttonStyle,
  disabledStyle,
  textStyle,
}: DevIapBypassButtonProps) {
  return (
    <TouchableOpacity
      style={[buttonStyle, disabled && disabledStyle]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <Text style={textStyle}>[DEV] IAP 바이패스 — verify-iap-order 직접 호출</Text>
    </TouchableOpacity>
  );
}
