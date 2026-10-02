import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGetMySubscriptionQuery } from '@/store/subscriptionsApi';
import { SUBSCRIPTION_PLANS } from '@/constants/subscription-plans';

export default function SubscriptionScreen() {
  const router = useRouter();
  const { data: mySubscription, isLoading: subLoading } = useGetMySubscriptionQuery();

  const handleManageBillings = () => {
    Alert.alert('Manage Billings', 'Redirecting to payment billing management portal...');
  };

  const handlePlanPress = () => {
    Alert.alert(
      'Coming Soon',
      'Subscription plans will be available in the future. Connect with us!',
      [
        { text: 'OK', style: 'cancel' },
        { text: 'Contact Us', onPress: () => router.push('/help-support') },
      ]
    );
  };

  const handleCancelSubscription = () => {
    router.back();
  };

  if (subLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Subscription</Text>
          <View style={{ width: 42 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#BD632F" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Subscription</Text>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {SUBSCRIPTION_PLANS.map((plan) => {
          const isCurrentPlan = mySubscription?.planId === plan.id;
          const nextBillingDate = mySubscription?.endDate
            ? new Date(mySubscription.endDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
            : '';

          return (
            <TouchableOpacity
              key={plan.id}
              style={styles.planCard}
              activeOpacity={0.85}
              onPress={handlePlanPress}
            >
              <Text style={styles.planTitle}>{plan.name}</Text>

              {isCurrentPlan && mySubscription ? (
                <View style={styles.innerPlanBox}>
                  <Text style={styles.innerLabel}>Current Plan</Text>
                  <Text style={styles.innerPrice}>${plan.price.toFixed(2)}</Text>
                  <Text style={styles.innerBilling}>Next Billing : {nextBillingDate}</Text>
                </View>
              ) : (
                <View style={styles.priceBox}>
                  <Text style={styles.priceText}>${plan.price.toFixed(2)}</Text>
                </View>
              )}

              <View style={styles.featuresList}>
                {plan.benefits.map((benefit, index) => (
                  <View key={index} style={styles.featureRow}>
                    <View style={styles.checkIconBadge}>
                      <Ionicons name="checkmark" size={16} color="#BD632F" />
                    </View>
                    <Text style={styles.featureText}>{benefit}</Text>
                  </View>
                ))}
              </View>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity style={styles.manageBtn} onPress={handleManageBillings} activeOpacity={0.85}>
          <Text style={styles.manageBtnText}>Manage Billings</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelBtn} onPress={handleCancelSubscription} activeOpacity={0.85}>
          <Ionicons name="trash-outline" size={18} color="#E53935" />
          <Text style={styles.cancelBtnText}>Cancel Subscriptions</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF9F6' },
  scrollContainer: { paddingHorizontal: 24, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
    marginBottom: 24,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#BD632F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#1A1817' },
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E6E1DC',
    padding: 24,
    marginBottom: 20,
  },
  planTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1817',
    marginBottom: 16,
  },
  innerPlanBox: {
    width: '100%',
    backgroundColor: '#FFF2EB',
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
  },
  innerLabel: { fontSize: 12, color: '#7C7672', fontWeight: '500', marginBottom: 4 },
  innerPrice: { fontSize: 24, fontWeight: '800', color: '#1A1817', marginBottom: 4 },
  innerBilling: { fontSize: 12, color: '#7C7672', fontWeight: '500' },
  priceBox: {
    width: '100%',
    backgroundColor: '#FFF2EB',
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
  },
  priceText: { fontSize: 24, fontWeight: '800', color: '#1A1817' },
  featuresList: { width: '100%', gap: 14 },
  featureRow: { flexDirection: 'row', alignItems: 'center' },
  checkIconBadge: { marginRight: 12 },
  featureText: { fontSize: 14, fontWeight: '500', color: '#1A1817', flex: 1 },
  manageBtn: {
    backgroundColor: '#BD632F',
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  manageBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  cancelBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E53935',
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  cancelBtnText: { color: '#E53935', fontSize: 16, fontWeight: '700' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
});
