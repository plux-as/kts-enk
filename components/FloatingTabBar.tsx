
import React from 'react';
import { IconSymbol } from '@/components/IconSymbol';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@react-navigation/native';
import { colors } from '@/styles/commonStyles';

export interface TabBarItem {
  route: string;
  label: string;
  icon: string;
}

interface FloatingTabBarProps {
  tabs: TabBarItem[];
  containerWidth?: number;
  borderRadius?: number;
  bottomMargin?: number;
}

export default function FloatingTabBar({
  tabs,
  containerWidth = Dimensions.get('window').width - 40,
  borderRadius = 25,
  bottomMargin = 20,
}: FloatingTabBarProps) {
  const theme = useTheme();
  const router = useRouter();
  const pathname = usePathname();

  // Find the active tab index based on the current pathname
  const getActiveIndex = () => {
    const index = tabs.findIndex((tab) => {
      if (tab.route === '/(tabs)/(home)') {
        return pathname === '/(tabs)/(home)' || pathname === '/';
      }
      return pathname.includes(tab.route);
    });
    return index >= 0 ? index : 0;
  };

  const activeIndex = getActiveIndex();
  const translateX = useSharedValue(activeIndex);

  React.useEffect(() => {
    const newIndex = getActiveIndex();
    translateX.value = withSpring(newIndex, {
      damping: 20,
      stiffness: 90,
    });
  }, [pathname]);

  const animatedStyle = useAnimatedStyle(() => {
    const itemWidth = containerWidth / tabs.length;
    return {
      transform: [
        {
          translateX: interpolate(
            translateX.value,
            [0, tabs.length - 1],
            [0, itemWidth * (tabs.length - 1)]
          ),
        },
      ],
    };
  });

  const handleTabPress = (route: string) => {
    router.push(route as any);
  };

  const itemWidth = containerWidth / tabs.length;

  return (
    <SafeAreaView
      edges={['bottom']}
      style={[styles.safeArea, { marginBottom: bottomMargin }]}
    >
      <BlurView
        intensity={80}
        tint={theme.dark ? 'dark' : 'light'}
        style={[
          styles.container,
          {
            width: containerWidth,
            borderRadius,
            backgroundColor: theme.dark
              ? 'rgba(28, 28, 30, 0.8)'
              : 'rgba(255, 255, 255, 0.8)',
          },
        ]}
      >
        <Animated.View
          style={[
            styles.activeIndicator,
            {
              width: itemWidth - 20,
              backgroundColor: colors.primary,
              borderRadius: borderRadius - 5,
            },
            animatedStyle,
          ]}
        />

        {tabs.map((tab, index) => {
          const isActive = index === activeIndex;
          return (
            <TouchableOpacity
              key={tab.route}
              style={[styles.tab, { width: itemWidth }]}
              onPress={() => handleTabPress(tab.route)}
              activeOpacity={0.7}
            >
              <IconSymbol
                name={tab.icon as any}
                size={24}
                color={isActive ? '#FFFFFF' : colors.text}
              />
              <Text
                style={[
                  styles.label,
                  {
                    color: isActive ? '#FFFFFF' : colors.text,
                    fontFamily: 'BigShouldersStencil_700Bold',
                  },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </BlurView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: 70,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
    overflow: 'hidden',
  },
  activeIndicator: {
    position: 'absolute',
    height: 50,
    left: 10,
    zIndex: 0,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    zIndex: 1,
  },
  label: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
});
