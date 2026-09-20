import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGetReviewsQuery } from '@/store/reviewsApi';

export default function AllReviewsScreen() {
  const router = useRouter();
  const { doctorId, doctorName } = useLocalSearchParams<{
    doctorId: string;
    doctorName: string;
  }>();

  const { data: reviews = [], isLoading } = useGetReviewsQuery(
    { targetType: 'doctor', targetId: doctorId ?? '' },
    { skip: !doctorId },
  );

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : '0.0';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Patient Reviews</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.summaryRow}>
        <Ionicons name="star" size={24} color="#F59E0B" />
        <Text style={styles.avgRating}>{avgRating}</Text>
        <Text style={styles.totalReviews}>({reviews.length} reviews)</Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#BD632F" />
        </View>
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubble-ellipses-outline" size={48} color="#D1CCC7" />
              <Text style={styles.emptyText}>No reviews yet</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <View style={styles.reviewAvatar}>
                  {item.user?.avatar ? (
                    <Image source={{ uri: item.user.avatar }} style={styles.avatarImage} />
                  ) : (
                    <Ionicons name="person-outline" size={16} color="#9C9690" />
                  )}
                </View>
                <View style={styles.reviewInfo}>
                  <Text style={styles.reviewName}>{item.user?.name || 'Anonymous'}</Text>
                  <View style={styles.reviewStars}>
                    {Array.from({ length: item.rating }).map((_, si) => (
                      <Ionicons key={si} name="star" size={12} color="#F59E0B" />
                    ))}
                  </View>
                </View>
                <Text style={styles.reviewTime}>
                  {new Date(item.createdAt).toLocaleDateString()}
                </Text>
              </View>
              <Text style={styles.reviewText}>{item.text}</Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF9F6' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#BD632F', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1A1817' },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#FFFFFF', marginHorizontal: 20, borderRadius: 14, borderWidth: 1, borderColor: '#E6E1DC', marginBottom: 16 },
  avgRating: { fontSize: 22, fontWeight: '800', color: '#1A1817' },
  totalReviews: { fontSize: 14, fontWeight: '500', color: '#9C9690' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingHorizontal: 20, paddingBottom: 40 },
  emptyContainer: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, fontWeight: '600', color: '#9C9690' },
  reviewCard: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E6E1DC', padding: 14, marginBottom: 10 },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  reviewAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F5F2EC', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  avatarImage: { width: 32, height: 32, borderRadius: 16 },
  reviewInfo: { flex: 1 },
  reviewName: { fontSize: 13, fontWeight: '700', color: '#1A1817' },
  reviewStars: { flexDirection: 'row', gap: 1 },
  reviewTime: { fontSize: 11, fontWeight: '500', color: '#9C9690' },
  reviewText: { fontSize: 12, fontWeight: '500', color: '#7C7672', lineHeight: 18 },
});
