
import React from 'react';
import FloatingTabBar, { TabBarItem } from '@/components/FloatingTabBar';
import { ColorValue, OpaqueColorValue, Platform, DynamicColorIOS } from 'react-native';
import { NativeTabs, Icon, Label, NativeTabsLabelStyle } from 'expo-router/unstable-native-tabs';
import { Stack } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { SymbolView } from 'expo-symbols';

const selectedLabelStyle: NativeTabsLabelStyle = {
  color: colors.primary,
};

export default function TabLayout() {

	// Only use DynamicColorIOS on iOS platform
	const dynamicLabelColor = Platform.OS === 'ios' ? DynamicColorIOS({
		dark: '#FFFFFF',
		light: '#000000',
	}) : colors.text;

	const dynamicTintColor = Platform.OS === 'ios' ? DynamicColorIOS({
		dark: '#B7FF00',   // your foreground color on dark glass
		light: '#3A4300',  // same hue but adapted for light glass
	}) : colors.primary;
	
  const tabs: TabBarItem[] = [
    {
      route: '/(tabs)/(home)',
      label: 'Start',
      icon: 'shield.fill',
    },
    {
      route: '/(tabs)/log',
      label: 'Logg',
      icon: 'clock.fill',
    },
    {
      route: '/(tabs)/app-settings',
      label: 'Innstillinger',
      icon: 'gear',
    },
  ];

  if (Platform.OS === 'ios') {
    return (
      <>
        {/* 
          Note: The Icon component uses the 'selectedColor' prop (a color value),
          while the Label component uses the 'selectedStyle' prop (a NativeTabsLabelStyle object
          which has color as a value).
        */}
        <NativeTabs
      labelStyle={{ color: dynamicLabelColor}}
      tintColor={dynamicTintColor}>
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
      </>
    );
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(home)" />
        <Stack.Screen name="log" />
        <Stack.Screen name="app-settings" />
      </Stack>
      <FloatingTabBar tabs={tabs} />
    </>
  );
}
