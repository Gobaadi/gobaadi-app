import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useGetLivestockItemQuery } from '@/store/livestockApi';
import { useGetReviewsQuery, useVoteHelpfulMutation } from '@/store/reviewsApi';

const { width } = Dimensions.get('window');

export default function AnimalDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const id = String(params.id || '');

  const { data: item } = useGetLivestockItemQuery(parseInt(id, 10), { skip: !id });
  const { data: reviews = [] } = useGetReviewsQuery(
    { targetType: 'livestock', targetId: id },
    { skip: !id },
  );
  const [voteHelpful] = useVoteHelpfulMutation();
  const avgRating = reviews.length
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  const animalImage = item?.images?.[0]
    ? { uri: item.images[0] }
    : (item?.breed || '').toLowerCase().includes('goat')
      ? require('@/assets/images/kota_goat.webp')
      : require('@/assets/images/albino_buffalo.webp');
  const animalName = item ? `${item.breed} ${item.species}` : 'Loading...';
  const animalPrice = item?.price?.toLocaleString() || '—';

  const basicInfo = item ? [{ label: 'Category', value: 'Livestock' }] : [];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Header Image Area */}
        <View style={styles.imageContainer}>
          <Image source={animalImage} style={styles.mainImage} resizeMode="cover" />

          {/* Overlaid Actions */}
          <View style={styles.imageHeader}>
            <TouchableOpacity
              style={styles.circleButton}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>←</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.circleButton}
              activeOpacity={0.8}
              onPress={async () => {
                try {
                  await Share.share({
                    message: `Check out this animal listing: ${animalName} - ৳${animalPrice}`,
                  });
                } catch {}
              }}
            >
              <Text style={styles.buttonText}>📤</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Content Area */}
        <View style={styles.contentContainer}>
          {/* Title and Price */}
          <View style={styles.titlePriceRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.animalTitle}>{animalName}</Text>
            </View>
            <View style={styles.priceCol}>
              <Text style={styles.priceText}>৳ {animalPrice}</Text>
            </View>
          </View>

          {/* Seller profile bar */}
          <View style={styles.sellerContainer}>
            <View style={styles.sellerLeft}>
              <View style={styles.sellerAvatar}>
                <Text style={styles.avatarEmoji}>👤</Text>
              </View>
              <Text style={styles.sellerName}>Have a question about this listing?</Text>
            </View>
            <TouchableOpacity
              style={styles.messageBtn}
              onPress={() => router.push('/chat')}
              activeOpacity={0.8}
            >
              <Text style={styles.messageBtnText}>💬 Message</Text>
            </TouchableOpacity>
          </View>

          {/* Section Divider */}
          <View style={styles.divider} />

          {/* Basic Information */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Details</Text>
          </View>

          <View style={styles.gridContainer}>
            {basicInfo.map((info, idx) => (
              <View key={idx} style={styles.gridCard}>
                <Text style={styles.gridLabel}>{info.label}</Text>
                <Text style={styles.gridValue}>{info.value}</Text>
              </View>
            ))}
          </View>

          {/* Reviews */}
          <View style={styles.divider} />
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Reviews {avgRating ? `(${avgRating} ★, ${reviews.length})` : ''}</Text>
          </View>

          {reviews.length === 0 ? (
            <Text style={styles.gridLabel}>No reviews yet.</Text>
          ) : (
            <View style={{ gap: 12 }}>
              {reviews.map((review) => (
                <View key={review.id} style={styles.gridCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={styles.gridValue}>{review.user?.name || 'Anonymous'}</Text>
                    <Text style={styles.gridLabel}>{'★'.repeat(review.rating)}</Text>
                  </View>
                  <Text style={[styles.gridLabel, { marginBottom: 8 }]}>{review.text}</Text>
                  <TouchableOpacity onPress={() => voteHelpful(review.id)} activeOpacity={0.7}>
                    <Text style={styles.messageBtnText}>👍 Helpful ({review.helpfulCount})</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Floating Bottom action buttons */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.bookBtn}
          onPress={() => router.push({ pathname: '/book-animal', params: { id } })}
          activeOpacity={0.85}
        >
          <Text style={styles.bookBtnText}>🏷️ Book Animal</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.buyBtn}
          onPress={() => router.push({ pathname: '/checkout', params: { id } })}
          activeOpacity={0.85}
        >
          <Text style={styles.buyBtnText}>🛒 Buy Animal</Text>
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
    paddingBottom: 120,
  },
  imageContainer: {
    width: '100%',
    height: 300,
    position: 'relative',
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  imageHeader: {
    position: 'absolute',
    top: 24,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  circleButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#BD632F',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: '#BD632F',
    width: 12,
  },
  dotInactive: {
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    padding: 24,
  },
  titlePriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  animalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A1817',
    marginBottom: 4,
  },
  verifiedRow: {
    flexDirection: 'row',
  },
  verifiedBadge: {
    backgroundColor: '#7CB342',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  verifiedText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  priceCol: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#BD632F',
  },
  negotiableText: {
    fontSize: 12,
    color: '#7CB342',
    fontWeight: '700',
    marginTop: 2,
  },
  sellerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E1DC',
    borderRadius: 18,
    padding: 14,
    marginBottom: 20,
  },
  sellerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sellerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E9E5DF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarEmoji: {
    fontSize: 18,
  },
  sellerName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1817',
  },
  sellerLocation: {
    fontSize: 11,
    color: '#9C9690',
    marginTop: 2,
  },
  messageBtn: {
    backgroundColor: '#FFF8F4',
    borderWidth: 1.5,
    borderColor: '#E6E1DC',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  messageBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#BD632F',
  },
  divider: {
    height: 1.5,
    backgroundColor: '#FAF9F6',
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#BD632F',
  },
  statusBadge: {
    backgroundColor: '#EEFBEF',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeText: {
    color: '#2E7D32',
    fontSize: 11,
    fontWeight: '700',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  gridCard: {
    width: (width - 60) / 2,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E1DC',
    borderRadius: 14,
    padding: 14,
  },
  gridLabel: {
    fontSize: 10,
    color: '#9C9690',
    fontWeight: '500',
    marginBottom: 4,
  },
  gridValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1817',
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
    flexDirection: 'row',
    gap: 12,
  },
  bookBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#BD632F',
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookBtnText: {
    color: '#BD632F',
    fontSize: 15,
    fontWeight: '700',
  },
  buyBtn: {
    flex: 1,
    backgroundColor: '#BD632F',
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buyBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
