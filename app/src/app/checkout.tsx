import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';

import { useGetLivestockItemQuery } from '@/store/livestockApi';
import { useGetCartQuery, useAddCartItemMutation, useClearCartMutation } from '@/store/cartApi';
import { useCreateOrderMutation } from '@/store/ordersApi';
import { useCreatePaymentIntentMutation, useSimulateSuccessMutation } from '@/store/paymentsApi';

export default function CheckoutScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const itemId = String(params.id || '');
  const isDirectCheckout = !!itemId;

  const { data: livestockItem } = useGetLivestockItemQuery(parseInt(itemId, 10), { skip: !isDirectCheckout });
  const { data: cartData } = useGetCartQuery(undefined, { skip: isDirectCheckout });

  const [createOrder] = useCreateOrderMutation();
  const [createPaymentIntent] = useCreatePaymentIntentMutation();
  const [simulateSuccess] = useSimulateSuccessMutation();
  const [addCartItem] = useAddCartItemMutation();
  const [clearCart] = useClearCartMutation();

  const itemName = isDirectCheckout 
    ? (livestockItem ? `${livestockItem.breed} ${livestockItem.species}` : 'Loading...')
    : `Cart Checkout (${cartData?.items?.length || 0} items)`;

  const categoryName = isDirectCheckout ? 'Livestock' : 'Various';

  const subtotal = isDirectCheckout ? (livestockItem?.price || 0) : (cartData?.subtotal || 0);
  const tax = isDirectCheckout ? Math.round(subtotal * 0.05) : (cartData?.tax || 0);
  const shipping = isDirectCheckout ? 1500 : (cartData?.shipping || 0);
  const totalPrice = subtotal + tax + shipping;

  const imageUri = isDirectCheckout && livestockItem?.images?.[0]
    ? { uri: livestockItem.images[0] }
    : require('@/assets/images/albino_buffalo.webp');

  const handlePlaceOrder = async () => {
    try {
      if (isDirectCheckout && livestockItem) {
        await clearCart().unwrap();
        await addCartItem({ livestockId: livestockItem.id, quantity: 1 }).unwrap();
      }

      const order = await createOrder({
        deliveryAddress: {
          label: 'Home',
          contactName: 'Abdul Kader',
          phone: '+8801XXXXXXXXX',
          division: 'Dhaka',
          district: 'Dhaka',
          upazila: 'Mirpur',
          postalCode: '1216',
          addressLine: 'Road# 9, house# 5, Lane#3, Mirpur 11/a',
        },
        deliveryMethod: 'standard',
        deliveryNotes: 'Please call before delivery',
      }).unwrap();

      const intent = await createPaymentIntent({
        orderId: order.id,
        provider: 'simulate',
      }).unwrap();

      await simulateSuccess(intent.transactionId).unwrap();
      router.push({ pathname: '/order-success', params: { orderId: order.id } });
    } catch (err: any) {
      console.log('Error placing order:', err);
      Alert.alert('Order Failed', err?.data?.message || 'Could not place your order. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.circleButton}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>←</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Checkout</Text>

        <TouchableOpacity style={styles.circleButton} activeOpacity={0.8} onPress={() => router.push('/notifications')}>
          <Text style={styles.buttonText}>🔔</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Order Summary Section */}
        <Text style={styles.sectionTitle}>Order Summary</Text>
        
        <View style={styles.summaryCard}>
          <Image
            source={imageUri}
            style={styles.animalImage}
          />
          <View style={styles.summaryDetails}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Item:</Text>
              <Text style={styles.detailValue}>{itemName}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Category:</Text>
              <Text style={styles.detailValue}>{categoryName}</Text>
            </View>
          </View>
        </View>

        {/* Delivery Details Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Delivery Details</Text>
          <TouchableOpacity style={styles.changeAddressBtn} activeOpacity={0.7} onPress={() => Alert.alert('Change Address', 'Address selection feature coming soon.')}>
            <Text style={styles.changeAddressText}>Change Address</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.addressCard}>
          <View style={styles.addressHeader}>
            <Text style={styles.addressPin}>📍</Text>
            <Text style={styles.addressType}>Home Delivery</Text>
          </View>
          <Text style={styles.addressText}>
            Road# 9, house# 5, Lane#3, Mirpur 11/a, Dhaka-1216.
          </Text>
        </View>

        {/* Pricing Details Section */}
        <Text style={styles.sectionTitle}>Pricing Details</Text>

        <View style={styles.pricingCard}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Item Price</Text>
            <Text style={styles.priceVal}>৳ {subtotal.toLocaleString()}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>VAT (5%)</Text>
            <Text style={styles.priceVal}>৳ {tax.toLocaleString()}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Delivery Charge</Text>
            <Text style={styles.priceVal}>৳ {shipping.toLocaleString()}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.priceRow}>
            <Text style={styles.totalLabel}>Total Payment</Text>
            <Text style={styles.totalVal}>৳ {totalPrice.toLocaleString()}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Floating Bottom Place Order Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.placeOrderButton}
          onPress={handlePlaceOrder}
          activeOpacity={0.85}
        >
          <Text style={styles.placeOrderIcon}>⚙️</Text>
          <Text style={styles.placeOrderText}>Place Order</Text>
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
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1817',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1817',
    marginBottom: 12,
    marginTop: 8,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E6E1DC',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  animalImage: {
    width: 90,
    height: 90,
    borderRadius: 16,
    marginRight: 14,
  },
  summaryDetails: {
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
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  changeAddressBtn: {
    backgroundColor: '#BD632F',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  changeAddressText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
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
  pricingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E6E1DC',
    padding: 16,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  priceLabel: {
    fontSize: 13,
    color: '#9C9690',
  },
  priceVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1817',
  },
  divider: {
    height: 1.5,
    backgroundColor: '#FAF9F6',
    marginVertical: 10,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1817',
  },
  totalVal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#BD632F',
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
  placeOrderButton: {
    flexDirection: 'row',
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
  placeOrderIcon: {
    color: '#FFFFFF',
    fontSize: 16,
    marginRight: 8,
  },
  placeOrderText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
