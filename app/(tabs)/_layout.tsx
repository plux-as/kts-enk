
import React from 'react';
import FloatingTabBar, { TabBarItem } from '@/components/FloatingTabBar';
import { Stack } from 'expo-router';

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

export default function TabLayout() {
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
