import React from 'react';
import { Tabs } from 'expo-router';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions } from 'react-native';
import { useSelector } from 'react-redux';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RootState } from '@/store/store';

const { width } = Dimensions.get('window');

function TabIcon({ routeName, isFocused }: { routeName: string; isFocused: boolean }) {
  const activeColor = '#BD632F';
  const inactiveColor = '#9C9690';
  const color = isFocused ? activeColor : inactiveColor;
  const size = isFocused ? 24 : 22;

  switch (routeName) {
    case 'index':
    case 'doctor-home':
      return <MaterialCommunityIcons name={isFocused ? 'home' : 'home-outline'} size={size} color={color} />;
    case 'animals':
      return <MaterialCommunityIcons name="cow" size={size} color={color} />;
    case 'doctors':
      return <MaterialCommunityIcons name="doctor" size={size} color={color} />;
    case 'market':
      return <MaterialCommunityIcons name={isFocused ? 'storefront' : 'storefront-outline'} size={size} color={color} />;
    case 'doctor-bookings':
      return <MaterialCommunityIcons name={isFocused ? 'calendar-month' : 'calendar-month-outline'} size={size} color={color} />;
    case 'doctor-messages':
      return <MaterialCommunityIcons name={isFocused ? 'message-processing' : 'message-processing-outline'} size={size} color={color} />;
    case 'profile':
      return <Ionicons name={isFocused ? 'person' : 'person-outline'} size={size} color={color} />;
    default:
      return <Ionicons name="ellipse-outline" size={size} color={color} />;
  }
}

function getLabel(routeName: string) {
  switch (routeName) {
    case 'index':
    case 'doctor-home':
      return 'Home';
    case 'animals':
      return 'Animals';
    case 'doctors':
      return 'Doctors';
    case 'market':
      return 'Market';
    case 'doctor-bookings':
      return 'Calendar';
    case 'doctor-availability':
      return 'Schedule';
    case 'doctor-messages':
      return 'Chat';
    case 'profile':
      return 'Profile';
    default:
      return routeName;
  }
}

function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();

  const visibleRoutes = state.routes.filter((route: any) => {
    const { options } = descriptors[route.key];
    if (options.href === null || options.tabBarItemStyle?.display === 'none') {
      return false;
    }
    return true;
  });

  const bottomPadding = Math.max(insets.bottom, 10);

  return (
    <View style={[styles.tabBarContainer, { height: 65 + bottomPadding }]}>
      <View style={[styles.tabBarBackground, { height: 60 + bottomPadding, paddingBottom: bottomPadding }]}>
        {visibleRoutes.map((route: any) => {
          const isFocused = state.routes[state.index]?.key === route.key;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          const label = getLabel(route.name);

          return (
            <View key={route.key} style={styles.tabItemContainer}>
              {isFocused ? (
                /* Floating Active Tab with Badge Circle */
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityState={{ selected: true }}
                  onPress={onPress}
                  onLongPress={onLongPress}
                  style={styles.floatingActiveButton}
                  activeOpacity={0.85}
                >
                  <View style={styles.floatingInnerCircle}>
                    <TabIcon routeName={route.name} isFocused={true} />
                  </View>
                  <Text style={styles.labelActive}>{label}</Text>
                </TouchableOpacity>
              ) : (
                /* Inactive Tab */
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityState={{ selected: false }}
                  onPress={onPress}
                  onLongPress={onLongPress}
                  style={styles.tabItem}
                  activeOpacity={0.7}
                >
                  <TabIcon routeName={route.name} isFocused={false} />
                  <Text style={styles.labelInactive}>{label}</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default function AppTabs() {
  const user = useSelector((state: RootState) => state.auth.user);
  const isDoctor = user?.role === 'doctor';

  return (
    <Tabs
      initialRouteName={isDoctor ? 'doctor-home' : 'index'}
      screenOptions={{
        headerShown: false,
      }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      {/* Farmer Module Screens */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          href: isDoctor ? null : undefined,
          tabBarItemStyle: isDoctor ? { display: 'none' } : undefined,
        }}
      />
      <Tabs.Screen
        name="animals"
        options={{
          title: 'Animals',
          href: isDoctor ? null : undefined,
          tabBarItemStyle: isDoctor ? { display: 'none' } : undefined,
        }}
      />
      <Tabs.Screen
        name="doctors"
        options={{
          title: 'Doctors',
          href: isDoctor ? null : undefined,
          tabBarItemStyle: isDoctor ? { display: 'none' } : undefined,
        }}
      />
      <Tabs.Screen
        name="market"
        options={{
          title: 'Market',
          href: null,
          tabBarItemStyle: { display: 'none' },
        }}
      />

      {/* Doctor Module Screens */}
      <Tabs.Screen
        name="doctor-home"
        options={{
          title: 'Home',
          href: isDoctor ? undefined : null,
          tabBarItemStyle: isDoctor ? undefined : { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="doctor-bookings"
        options={{
          title: 'Calendar',
          href: isDoctor ? undefined : null,
          tabBarItemStyle: isDoctor ? undefined : { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="doctor-availability"
        options={{
          title: 'Schedule',
          href: null,
          tabBarItemStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="doctor-messages"
        options={{
          title: 'Chat',
          href: isDoctor ? undefined : null,
          tabBarItemStyle: isDoctor ? undefined : { display: 'none' },
        }}
      />

      {/* Shared Screens */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 0,
    width: width,
    backgroundColor: 'transparent',
  },
  tabBarBackground: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    position: 'absolute',
    bottom: 0,
    width: '100%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 12,
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  tabItemContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  tabItem: {
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 4,
  },
  labelInactive: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9C9690',
    marginTop: 4,
  },
  floatingActiveButton: {
    position: 'absolute',
    top: -20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingInnerCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#BD632F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1.5,
    borderColor: '#BD632F',
  },
  labelActive: {
    fontSize: 12,
    fontWeight: '600',
    color: '#BD632F',
    marginTop: 4,
  },
});
