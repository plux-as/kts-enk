
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
import { useRouter, usePathname, useSegments } from 'expo-router';
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
  const segments = useSegments();

  // Find the active tab index based on the current pathname and segments
  const getActiveIndex = () => {
    console.log('[FloatingTabBar] Current pathname:', pathname);
    console.log('[FloatingTabBar] Current segments:', segments);
    
    // Check segments for more reliable matching
    const segmentString = segments.join('/');
    console.log('[FloatingTabBar] Segment string:', segmentString);
    
    for (let i = 0; i < tabs.length; i++) {
      const tab = tabs[i];
      console.log(`[FloatingTabBar] Checking tab ${i}: ${tab.route}`);
      
      // Special handling for home tab
      if (tab.route === '/(tabs)/(home)') {
        if (
          pathname === '/(tabs)/(home)' || 
          pathname === '/' || 
          pathname.startsWith('/(tabs)/(home)') ||
          segmentString.includes('(tabs)/(home)') ||
          (segments.length >= 2 && segments[0] === '(tabs)' && segments[1] === '(home)')
        ) {
          console.log(`[FloatingTabBar] Matched home tab at index ${i}`);
          return i;
        }
      }
      // Check for log tab
      else if (tab.route === '/(tabs)/log') {
        if (
          pathname === '/(tabs)/log' || 
          pathname.includes('/log') ||
          segmentString.includes('(tabs)/log') ||
          (segments.length >= 2 && segments[0] === '(tabs)' && segments[1] === 'log')
        ) {
          console.log(`[FloatingTabBar] Matched log tab at index ${i}`);
          return i;
        }
      }
      // Check for app-settings tab
      else if (tab.route === '/(tabs)/app-settings') {
        if (
          pathname === '/(tabs)/app-settings' || 
          pathname.includes('/app-settings') ||
          segmentString.includes('(tabs)/app-settings') ||
          (segments.length >= 2 && segments[0] === '(tabs)' && segments[1] === 'app-settings')
        ) {
          console.log(`[FloatingTabBar] Matched app-settings tab at index ${i}`);
          return i;
        }
      }
      // Generic check for other tabs
      else if (pathname === tab.route || pathname.startsWith(tab.route + '/')) {
        console.log(`[FloatingTabBar] Matched tab at index ${i}`);
        return i;
      }
    }
    
    // Default to first tab if no match
    console.log('[FloatingTabBar] No match found, defaulting to index 0');
    return 0;
  };

  // Calculate active index directly from pathname
  const activeIndex = getActiveIndex();
  const translateX = useSharedValue(activeIndex);

  // Update animation whenever pathname, segments, or activeIndex changes
  React.useEffect(() => {
    console.log('[FloatingTabBar] Effect triggered - pathname:', pathname, 'activeIndex:', activeIndex);
    translateX.value = withSpring(activeIndex, {
      damping: 20,
      stiffness: 90,
    });
  }, [pathname, segments, activeIndex, translateX]);

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
    console.log('[FloatingTabBar] Tab pressed:', route);
    router.push(route as any);
  };

  const itemWidth = containerWidth / tabs.length;

  // Android-specific styling
  const isAndroid = Platform.OS === 'android';
  const isWeb = Platform.OS === 'web';
  const containerBackgroundColor = (isAndroid || isWeb)
    ? '#000000' 
    : (theme.dark ? 'rgba(28, 28, 30, 0.8)' : 'rgba(255, 255, 255, 0.8)');

  console.log('[FloatingTabBar] Rendering with activeIndex:', activeIndex);

  return (
    <SafeAreaView
      edges={['bottom']}
      style={[styles.safeArea, { marginBottom: bottomMargin }]}
    >
      <BlurView
        intensity={(isAndroid || isWeb) ? 0 : 80}
        tint={theme.dark ? 'dark' : 'light'}
        style={[
          styles.container,
          {
            width: containerWidth,
            borderRadius,
            backgroundColor: containerBackgroundColor,
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
          // On Android and Web, use black for active tab, white for inactive
          const iconColor = (isAndroid || isWeb)
            ? (isActive ? '#000000' : '#FFFFFF')
            : (isActive ? '#000000' : colors.text);
          const labelColor = (isAndroid || isWeb)
            ? (isActive ? '#000000' : '#FFFFFF')
            : (isActive ? '#000000' : colors.text);

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
                color={iconColor}
              />
              <Text
                style={[
                  styles.label,
                  {
                    color: labelColor,
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
