
import React from 'react';
import FloatingTabBar, { TabBarItem } from '@/components/FloatingTabBar';
import { Platform, View, Text, StyleSheet } from 'react-native';
import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';
import { Stack } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { SafeAreaView } from 'react-native-safe-area-context';

// Custom header component for tab screens
function TabHeader({ title }: { title: string }) {
  return (
    <SafeAreaView edges={['top']} style={styles.headerContainer}>
      <View style={styles.headerContent}>
        <Text style={styles.headerTitle}>{title}</Text>
      </View>
    </SafeAreaView>
  );
}

export default function TabLayout() {
  const tabs: TabBarItem[] = [
    {
      route: '/(tabs)/(home)',
      label: 'Start',
      icon: 'house.fill',
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
        <NativeTabs>
          <NativeTabs.Trigger
            name="(home)"
            options={{
              title: 'Start',
              tabBarIcon: ({ color }) => <Icon name="house.fill" color={color} />,
              tabBarLabel: ({ color }) => <Label color={color}>Start</Label>,
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

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.textSecondary + '20',
  },
  headerContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
    fontFamily: 'BigShouldersStencil_700Bold',
  },
});
