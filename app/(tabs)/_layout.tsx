
import React from 'react';
import FloatingTabBar, { TabBarItem } from '@/components/FloatingTabBar';
import { Platform } from 'react-native';
import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';
import { Stack } from 'expo-router';
import { colors } from '@/styles/commonStyles';

export default function TabLayout() {
  const tabs: TabBarItem[] = [
    {
      route: '/(tabs)/(home)',
      label: 'Hjem',
      icon: 'house.fill',
    },
    {
      route: '/(tabs)/log',
      label: 'Logg',
      icon: 'history',
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
        <NativeTabs>
          <NativeTabs.Trigger
            name="(home)"
            options={{
              title: 'Hjem',
              tabBarIcon: ({ color }) => <Icon name="house.fill" color={color} />,
              tabBarLabel: ({ color }) => <Label color={color}>Hjem</Label>,
            }}
          />
          <NativeTabs.Trigger
            name="log"
            options={{
              title: 'Logg',
              tabBarIcon: ({ color }) => <Icon name="clock.fill" color={color} />,
              tabBarLabel: ({ color }) => <Label color={color}>Logg</Label>,
            }}
          />
          <NativeTabs.Trigger
            name="app-settings"
            options={{
              title: 'Innstillinger',
              tabBarIcon: ({ color }) => <Icon name="gear" color={color} />,
              tabBarLabel: ({ color }) => <Label color={color}>Innstillinger</Label>,
            }}
          />
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
