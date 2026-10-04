import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';

import { useGetOrderQuery } from '@/store/ordersApi';

export default function AnimalBillingDetailsScreen() {
  const router = useRouter();
  const { orderId } = useLocalSearchParams<{ orderId?: string }>();
  const { data: order } = useGetOrderQuery(orderId ?? '', { skip: !orderId });
  const item = order?.items?.[0];

  const barcodePattern = [
    2, 1, 4, 2, 1, 3, 1, 2, 4, 1, 2, 3, 1, 4, 2, 1, 2, 3, 1, 4, 
    2, 1, 3, 1, 2, 4, 1, 2, 3, 1, 4, 2, 1, 2, 3, 1, 4, 2, 1, 3
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View />
        <TouchableOpacity style={styles.circleButton} activeOpacity={0.8}>
          <Text style={styles.buttonText}>🔔</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.billCard}>
          <Text style={styles.billTitle}>Billing Details</Text>
          <View style={styles.divider} />

          {/* Cow Summary Card */}
          <View style={styles.doctorRow}>
            <Image
              source={require('@/assets/images/albino_buffalo.webp')}
              style={styles.doctorPortrait}
            />
            <View style={styles.doctorDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Item:</Text>
                <Text style={styles.detailValue}>{item?.name ?? 'Loading...'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Quantity:</Text>
                <Text style={styles.detailValue}>{item?.quantity ?? '—'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Order ID:</Text>
                <Text style={styles.detailValue}>{order?.id ?? '—'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Status:</Text>
                <Text style={styles.detailValue}>{order?.status ?? '—'}</Text>
              </View>
            </View>
          </View>

          {/* Delivery Details Section */}
          <View style={styles.addressCard}>
            <View style={styles.addressHeader}>
              <Text style={styles.addressPin}>📍</Text>
              <Text style={styles.addressType}>Delivery Address</Text>
            </View>
            <Text style={styles.addressText}>
              {order?.deliveryAddress
                ? `${order.deliveryAddress.addressLine}, ${order.deliveryAddress.upazila}, ${order.deliveryAddress.district}-${order.deliveryAddress.postalCode}.`
                : 'Loading...'}
            </Text>
          </View>

          {/* Pricing Details Section */}
          <View style={styles.slotDetailRow}>
            <Text style={styles.slotLabel}>Subtotal</Text>
            <Text style={styles.feeValue}>৳ {order ? (order.netAmount - order.tax - order.shippingFee).toLocaleString() : '—'}</Text>
          </View>

          <View style={styles.slotDetailRow}>
            <Text style={styles.slotLabel}>Tax</Text>
            <Text style={styles.feeValue}>৳ {order?.tax.toLocaleString() ?? '—'}</Text>
          </View>

          <View style={styles.slotDetailRow}>
            <Text style={styles.slotLabel}>Delivery Charge</Text>
            <Text style={styles.feeValue}>৳ {order?.shippingFee.toLocaleString() ?? '—'}</Text>
          </View>

          {!!order?.discountAmount && (
            <View style={styles.slotDetailRow}>
              <Text style={styles.slotLabel}>Discount</Text>
              <Text style={[styles.feeValue, { color: '#E53935' }]}>- ৳ {order.discountAmount.toLocaleString()}</Text>
            </View>
          )}

          <View style={styles.divider} />

          <View style={styles.slotDetailRow}>
            <Text style={styles.totalLabel}>Total Payment</Text>
            <Text style={styles.totalValue}>৳ {order?.netAmount.toLocaleString() ?? '—'}</Text>
          </View>

          {/* Custom flexbox barcode */}
          <View style={styles.barcodeContainer}>
            <View style={styles.barcodeStripes}>
              {barcodePattern.map((widthVal, index) => (
                <View
                  key={index}
                  style={[
                    styles.barcodeStripe,
                    {
                      width: widthVal,
                      backgroundColor: index % 2 === 0 ? '#1A1817' : '#FFFFFF',
                    },
                  ]}
                />
              ))}
            </View>
            <Text style={styles.barcodeCode}>PC123456789</Text>
          </View>
        </View>
      </ScrollView>

      {/* Floating Bottom Back to home Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.homeButton}
          onPress={() => router.replace('/(tabs)')}
          activeOpacity={0.85}
        >
          <Text style={styles.homeButtonText}>← Back to home</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF9F6',
  },
  scrollContainer: {
    paddingHorizontal: 24,
    paddingBottom: 120,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    marginBottom: 20,
  },
  circleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#BD632F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  billCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E6E1DC',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
  },
  billTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1817',
    marginBottom: 16,
  },
  divider: {
    height: 1.5,
    backgroundColor: '#FAF9F6',
    marginVertical: 16,
  },
  doctorRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  doctorPortrait: {
    width: 90,
    height: 90,
    borderRadius: 16,
    marginRight: 14,
  },
  doctorDetails: {
    flex: 1,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 12,
    color: '#9C9690',
    fontWeight: '500',
    width: 80,
  },
  detailValue: {
    fontSize: 12,
    color: '#1A1817',
    fontWeight: '700',
  },
  addressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E6E1DC',
    padding: 16,
    marginBottom: 20,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  addressPin: {
    fontSize: 14,
    marginRight: 6,
  },
  addressType: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1817',
  },
  addressText: {
    fontSize: 12,
    color: '#7C7672',
    lineHeight: 18,
  },
  slotDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  slotLabel: {
    fontSize: 13,
    color: '#9C9690',
    fontWeight: '500',
  },
  feeValue: {
    fontSize: 13,
    color: '#1A1817',
    fontWeight: '700',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1817',
  },
  totalValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#BD632F',
  },
  barcodeContainer: {
    alignItems: 'center',
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1.5,
    borderTopColor: '#FAF9F6',
  },
  barcodeStripes: {
    flexDirection: 'row',
    height: 64,
    alignItems: 'stretch',
    marginBottom: 8,
  },
  barcodeStripe: {
    height: '100%',
  },
  barcodeCode: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7C7672',
    letterSpacing: 2,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FAF9F6',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E9E5DF',
  },
  homeButton: {
    backgroundColor: '#BD632F',
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#BD632F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  homeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
