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

import { useGetWishlistQuery, useRemoveFromWishlistMutation } from '@/store/wishlistApi';

export default function WishlistScreen() {
  const router = useRouter();
  const { data: items = [], isLoading } = useGetWishlistQuery();
  const [removeFromWishlist] = useRemoveFromWishlistMutation();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.circleButton} onPress={() => router.back()} activeOpacity={0.8}>
          <Text style={styles.buttonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Wishlist</Text>
        <View style={styles.circleButton} />
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#BD632F" />
      ) : items.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Your wishlist is empty.</Text>
          <TouchableOpacity style={styles.browseBtn} onPress={() => router.push('/(tabs)/market')} activeOpacity={0.85}>
            <Text style={styles.browseBtnText}>Browse Marketplace</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.listContainer}>
            {items.map((item) => {
              const entity = item.product || item.livestock;
              const name = entity?.name || `${entity?.breed || ''} ${entity?.species || ''}`.trim() || 'Item';
              const price = entity?.price;
              const image = entity?.images?.[0];

              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.itemCard}
                  activeOpacity={0.9}
                  onPress={() =>
                    router.push(
                      item.livestockId
                        ? { pathname: '/animal-details', params: { id: String(item.livestockId) } }
                        : { pathname: '/checkout', params: { id: String(item.productId) } },
                    )
                  }
                >
                  <Image
                    source={image ? { uri: image } : require('@/assets/images/kota_goat.webp')}
                    style={styles.itemImage}
                  />
                  <View style={styles.itemDetails}>
                    <Text style={styles.itemName} numberOfLines={1}>{name}</Text>
                    {price != null && <Text style={styles.itemPrice}>৳ {Number(price).toLocaleString()}</Text>}
                  </View>
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => removeFromWishlist(item.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.removeBtnText}>Remove</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
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
  scrollContainer: { paddingHorizontal: 24, paddingBottom: 40 },
  listContainer: { gap: 16 },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E6E1DC',
    padding: 12,
  },
  itemImage: { width: 64, height: 64, borderRadius: 14, marginRight: 12 },
  itemDetails: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '700', color: '#1A1817', marginBottom: 4 },
  itemPrice: { fontSize: 14, fontWeight: '800', color: '#BD632F' },
  removeBtn: { paddingHorizontal: 8 },
  removeBtnText: { fontSize: 12, fontWeight: '600', color: '#9C9690' },
});
