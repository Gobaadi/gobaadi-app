import { DarkTheme, DefaultTheme, ThemeProvider, Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import { Provider, useSelector } from 'react-redux';

let Notifications: typeof import('expo-notifications') | null = null;
try {
  Notifications = require('expo-notifications');
} catch {
  // expo-notifications not available in Expo Go (SDK 53+)
}

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { store, bootstrapAuth } from '@/store/store';
import type { RootState } from '@/store/store';
import { socketManager } from '@/lib/socket-manager';
import { registerForPushNotifications, unregisterPushNotifications } from '@/lib/push-notifications';
import { ErrorBoundary } from '@/components/error-boundary';
import { IncomingCallProvider } from '@/components/IncomingCallProvider';

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

function RootNavigator() {
  const { user, isBootstrapping } = useSelector((state: RootState) => state.auth);
  const router = useRouter();

  useEffect(() => {
    if (user) {
      socketManager.connect();
      registerForPushNotifications();
    } else {
      socketManager.disconnect();
      unregisterPushNotifications();
    }
  }, [user]);

  useEffect(() => {
    if (!Notifications) return;
    const subscription = Notifications.addNotificationResponseReceivedListener(() => {
      if (user?.role === 'doctor') {
        router.push('/doctor-notifications');
      } else {
        router.push('/notifications');
      }
    });
    return () => subscription.remove();
  }, [router, user]);

  if (isBootstrapping) {
    return null;
  }

  return (
    <IncomingCallProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={!user}>
          <Stack.Screen name="index" />
          <Stack.Screen name="signup" />
          <Stack.Screen name="otp" />
          <Stack.Screen name="login" />
          <Stack.Screen name="forgot" />
          <Stack.Screen name="reset-password" />
          <Stack.Screen name="password-setup" />
        </Stack.Protected>

        <Stack.Protected guard={!!user}>
          <Stack.Screen name="(tabs)" />
        </Stack.Protected>

        {/* Onboarding success screens: accessible after OTP stores tokens */}
        <Stack.Screen name="congo" />
        <Stack.Screen name="doctor-registration-success" />
        <Stack.Screen name="account-details" />

        <Stack.Screen name="animal-details" />
        <Stack.Screen name="my-animal-detail" />
        <Stack.Screen name="search" />
        <Stack.Screen name="add-animal" />
        <Stack.Screen name="ai-scan" />
        <Stack.Screen name="ai-hold" />
        <Stack.Screen name="ai-summary" />
        <Stack.Screen name="all-doctors" />
        <Stack.Screen name="doctor-detail" />
        <Stack.Screen name="book-slot" />
        <Stack.Screen name="confirm-booking" />
        <Stack.Screen name="booking-details" />
        {/* Hidden screens - payment/bkash flow disabled for now */}
        {/* <Stack.Screen name="confirm-pay" /> */}
        {/* <Stack.Screen name="payment-method" /> */}
        {/* <Stack.Screen name="bkash-number" /> */}
        {/* <Stack.Screen name="payment-success" /> */}
        {/* <Stack.Screen name="billing-details" /> */}
        <Stack.Screen name="chat" />
        <Stack.Screen name="video-call" />
        <Stack.Screen name="my-treatment" />
        <Stack.Screen name="checkout" />
        <Stack.Screen name="order-success" />
        <Stack.Screen name="animal-billing-details" />
        <Stack.Screen name="cart" />
        <Stack.Screen name="wishlist" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="notification-preferences" />
        <Stack.Screen name="doctor-notifications" />
        <Stack.Screen name="doctor-notification-preferences" />
        <Stack.Screen name="book-animal" />
        <Stack.Screen name="my-appointments" />
        {/* <Stack.Screen name="booking-payment" /> */}
        {/* <Stack.Screen name="booking-bkash-number" /> */}
        <Stack.Screen name="edit-profile" />
        <Stack.Screen name="profile-details" />
        <Stack.Screen name="profile-edit" />
        <Stack.Screen name="my-task" />
        <Stack.Screen name="add-task" />
        <Stack.Screen name="edit-task" />
        <Stack.Screen name="my-orders" />
        <Stack.Screen name="medical-records" />
        <Stack.Screen name="add-listing" />
        <Stack.Screen name="refer-earn" />
        <Stack.Screen name="help-support" />
        <Stack.Screen name="faqs" />
        <Stack.Screen name="contact-support" />
        <Stack.Screen name="report-issues" />
        <Stack.Screen name="subscription" />
        <Stack.Screen name="select-language" />
        <Stack.Screen name="wallet" />
        <Stack.Screen name="payment-methods" />
        <Stack.Screen name="add-payment-method" />
        <Stack.Screen name="otp-verification" />
        <Stack.Screen name="appointments" />
        <Stack.Screen name="appointment-filter" />
        <Stack.Screen name="appointment-details" />
        <Stack.Screen name="appointment-cancel" />
        <Stack.Screen name="appointment-cancelled" />
        <Stack.Screen name="appointment-reschedule" />
        <Stack.Screen name="doctor-patients" />
        <Stack.Screen name="discount" />
        <Stack.Screen name="schedule" />
        <Stack.Screen name="calendar-settings" />
        <Stack.Screen name="working-hours" />
        <Stack.Screen name="block-time-off" />
        <Stack.Screen name="legal-about" />
        <Stack.Screen name="terms-of-service" />
        <Stack.Screen name="privacy-policy" />
        <Stack.Screen name="about-app" />
      </Stack>
    </IncomingCallProvider>
  );
}
export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    bootstrapAuth();
  }, []);

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <Provider store={store}>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <AnimatedSplashOverlay />
            <RootNavigator />
          </ThemeProvider>
        </Provider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
