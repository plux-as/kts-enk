import React from 'react';
import { DynamicColorIOS } from 'react-native';
import { NativeTabs, Icon, Label, NativeTabsLabelStyle } from 'expo-router/unstable-native-tabs';
import { colors } from '@/styles/commonStyles';

const selectedLabelStyle: NativeTabsLabelStyle = {
  color: colors.primary,
};

export default function TabLayout() {
  const dynamicLabelColor = DynamicColorIOS({
    dark: '#FFFFFF',
    light: '#000000',
  });

  const dynamicTintColor = DynamicColorIOS({
    dark: '#B7FF00',
    light: '#3A4300',
  });

  return (
    <NativeTabs
      labelStyle={{ color: dynamicLabelColor }}
      tintColor={dynamicTintColor}
    >
      <NativeTabs.Trigger
        name="(home)"
        options={{
          title: 'Start',
        }}
      >
        <Icon selectedColor={colors.primary} sf="shield.fill" drawable="ic_log" />
        <Label selectedStyle={selectedLabelStyle}>Start</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger
        name="log"
        options={{
          title: 'Logg',
        }}
      >
        <Icon selectedColor={colors.primary} sf="clock.fill" drawable="ic_log" />
        <Label selectedStyle={selectedLabelStyle}>Logg</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger
        name="app-settings"
        options={{
          title: 'Innstillinger',
        }}
      >
        <Icon selectedColor={colors.primary} sf="gear" drawable="ic_settings" />
        <Label selectedStyle={selectedLabelStyle}>Innstillinger</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
