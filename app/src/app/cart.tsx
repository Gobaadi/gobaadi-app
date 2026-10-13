import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import {
  useGetCartQuery,
  useUpdateCartItemMutation,
  useRemoveCartItemMutation,
} from '@/store/cartApi';

export default function CartScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { data: cart, isLoading, isFetching } = useGetCartQuery();
  const [updateCartItem] = useUpdateCartItemMutation();
  const [removeCartItem] = useRemoveCartItemMutation();

  const items = cart?.items ?? [];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.circleButton} onPress={() => router.back()} activeOpacity={0.8}>
          <Text style={styles.buttonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('cart.title')}</Text>
        <View style={styles.circleButton} />
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#BD632F" />
      ) : items.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>{t('cart.empty')}</Text>
          <TouchableOpacity style={styles.browseBtn} onPress={() => router.push('/(tabs)/market')} activeOpacity={0.85}>
            <Text style={styles.browseBtnText}>{t('cart.browseMarketplace')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
            <View style={styles.listContainer}>
              {items.map((item) => (
                <View key={item.id} style={styles.itemCard}>
                  <Image
                    source={item.image ? { uri: item.image } : require('@/assets/images/kota_goat.webp')}
                    style={styles.itemImage}
                  />
                  <View style={styles.itemDetails}>
                    <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.itemPrice}>৳ {(item.discountPrice || item.unitPrice).toLocaleString()}</Text>
                    {!item.isAvailable && (
                      <Text style={styles.warningText}>{item.warning || t('cart.unavailable')}</Text>
                    )}

                    <View style={styles.qtyRow}>
                      <TouchableOpacity
                        style={styles.qtyBtn}
                        disabled={item.quantity <= 1}
                        onPress={() => updateCartItem({ id: item.id, quantity: item.quantity - 1 })}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.qtyBtnText}>−</Text>
                      </TouchableOpacity>
                      <Text style={styles.qtyValue}>{item.quantity}</Text>
                      <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() => updateCartItem({ id: item.id, quantity: item.quantity + 1 })}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.qtyBtnText}>+</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.removeBtn}
                        onPress={() => removeCartItem(item.id)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.removeBtnText}>{t('cart.remove')}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>

          <View style={styles.summaryContainer}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{t('cart.subtotal')}</Text>
              <Text style={styles.summaryValue}>৳ {cart!.subtotal.toLocaleString()}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{t('cart.tax')}</Text>
              <Text style={styles.summaryValue}>৳ {cart!.tax.toLocaleString()}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{t('cart.shipping')}</Text>
              <Text style={styles.summaryValue}>৳ {cart!.shipping.toLocaleString()}</Text>
            </View>
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>{t('cart.total')}</Text>
              <Text style={styles.totalValue}>৳ {cart!.total.toLocaleString()}</Text>
            </View>

            <TouchableOpacity
              style={[styles.checkoutBtn, isFetching && styles.checkoutBtnDisabled]}
              disabled={isFetching}
              onPress={() => router.push('/checkout')}
              activeOpacity={0.85}
            >
              <Text style={styles.checkoutBtnText}>{t('cart.proceedToCheckout')}</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF9F6' },
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
  buttonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#1A1817' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  emptyText: { fontSize: 15, color: '#7C7672', marginBottom: 16 },
  browseBtn: {
    backgroundColor: '#BD632F',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  browseBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  scrollContainer: { paddingHorizontal: 24, paddingBottom: 16 },
  listContainer: { gap: 16 },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E6E1DC',
    padding: 12,
  },
  itemImage: { width: 72, height: 72, borderRadius: 14, marginRight: 12 },
  itemDetails: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '700', color: '#1A1817', marginBottom: 4 },
  itemPrice: { fontSize: 14, fontWeight: '800', color: '#BD632F', marginBottom: 4 },
  warningText: { fontSize: 11, color: '#E53935', marginBottom: 4 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFF8F4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyBtnText: { fontSize: 16, fontWeight: '700', color: '#BD632F' },
  qtyValue: { fontSize: 14, fontWeight: '700', color: '#1A1817', marginHorizontal: 12, minWidth: 16, textAlign: 'center' },
  removeBtn: { marginLeft: 'auto' },
  removeBtnText: { fontSize: 12, fontWeight: '600', color: '#9C9690' },
  summaryContainer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#E6E1DC',
    backgroundColor: '#FFFFFF',
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { fontSize: 13, color: '#7C7672' },
  summaryValue: { fontSize: 13, fontWeight: '600', color: '#1A1817' },
  totalRow: { marginTop: 4, marginBottom: 16 },
  totalLabel: { fontSize: 16, fontWeight: '700', color: '#1A1817' },
  totalValue: { fontSize: 16, fontWeight: '800', color: '#BD632F' },
  checkoutBtn: {
    backgroundColor: '#BD632F',
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkoutBtnDisabled: { opacity: 0.6 },
  checkoutBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
