import { useCallback, useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Dimensions,
  Share,
  FlatList,
  ImageSourcePropType,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useGetAnimalByIdQuery, useDeleteAnimalMutation } from '@/store/animalsApi';

const { width } = Dimensions.get('window');
const AUTO_SCROLL_MS = 3000;
const SLIDE_HEIGHT = 320;

export default function MyAnimalDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const id = String(params.id || '');

  const { data: animal } = useGetAnimalByIdQuery(id, { skip: !id });
  const [deleteAnimal] = useDeleteAnimalMutation();
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<FlatList<ImageSourcePropType>>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fallbackImage = animal?.breed?.toLowerCase().includes('buffalo')
    ? require('@/assets/images/albino_buffalo.png')
    : require('@/assets/images/bangladeshi_cow.png');

  const photos: ImageSourcePropType[] = (() => {
    const fromPhotos = (animal?.photos || []).filter(Boolean).map((uri) => ({ uri }));
    if (fromPhotos.length > 0) return fromPhotos;
    if (animal?.image) return [{ uri: animal.image }];
    return [fallbackImage];
  })();

  const photoCount = photos.length;
  const dotIndex = photoCount > 0 ? activeIndex % photoCount : 0;

  const startAutoScroll = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % photoCount;
        listRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, AUTO_SCROLL_MS);
  }, [photoCount]);

  useEffect(() => {
    if (photoCount <= 1) return;

    startAutoScroll();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [photoCount, startAutoScroll]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    if (index !== activeIndex && index >= 0 && index < photoCount) {
      setActiveIndex(index);
    }
  };

  const handleMomentumEnd = () => {
    if (photoCount <= 1) return;
    startAutoScroll();
  };

  function confirmDelete() {
    Alert.alert('Delete Animal', `Remove ${animal?.name || 'this animal'} from your farm?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteAnimal(id).unwrap();
            router.back();
          } catch (err) {
            console.log('Error deleting animal:', err);
          }
        },
      },
    ]);
  }

  async function handleShare() {
    try {
      await Share.share({
        message: `Check out ${animal?.name || 'this animal'} (${animal?.breed || 'Livestock'}) on Gobadi! Live Weight: ${animal?.weight || '725 Kg'}.`,
      });
    } catch (err) {
      console.log('Error sharing:', err);
    }
  }

  function handleAddToMarketplace() {
    Alert.alert('Added to Marketplace', `${animal?.name || 'Animal'} has been listed in the Gobadi marketplace.`);
  }

  const basicInfo = [
    { label: 'Date Of Birth', value: animal?.dob || 'N/A' },
    { label: 'Gender', value: animal?.gender || 'N/A' },
    { label: 'Source', value: animal?.source || 'N/A' },
    { label: 'Breed', value: animal?.breed || 'N/A' },
    { label: 'Age', value: animal?.age || 'N/A' },
    { label: 'Color', value: animal?.color || 'N/A' },
    { label: 'Joined Farm', value: animal?.joinedFarm || 'N/A' },
    { label: 'Stage', value: animal?.source || 'N/A' },
    { label: 'Live Weight', value: animal?.liveWeight || 'N/A' },
    { label: 'Price per kg', value: animal?.liveWeightPrice || 'N/A' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Header Image Area */}
        <View style={styles.imageContainer}>
          <FlatList
            ref={listRef}
            key={id}
            data={photos}
            keyExtractor={(_, index) => `photo-${index}`}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
            onScroll={handleScroll}
            onMomentumScrollEnd={handleMomentumEnd}
            scrollEventThrottle={16}
            renderItem={({ item }) => (
              <Image source={item} style={styles.mainImage} resizeMode="cover" />
            )}
          />

          {/* Carousel Pagination Dots */}
          {photoCount > 1 && (
            <View style={styles.paginationRow}>
              {photos.map((_, i) => (
                <View key={i} style={[styles.dot, i === dotIndex && styles.dotActive]} />
              ))}
            </View>
          )}

          {/* Header Action Buttons */}
          <SafeAreaView edges={['top']} style={styles.imageHeaderSafeArea}>
            <View style={styles.imageHeader}>
              <TouchableOpacity
                style={styles.circleButton}
                onPress={() => router.back()}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonText}>←</Text>
              </TouchableOpacity>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity style={styles.circleButton} onPress={confirmDelete} activeOpacity={0.8}>
                  <Text style={styles.buttonText}>🗑️</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.circleButton}
                  onPress={() => router.push('/notifications')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.buttonText}>🔔</Text>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </View>

        {/* Content Sheet Area */}
        <View style={styles.sheetContainer}>
          {/* Header Title & Price Row */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <Text style={styles.animalTitle}>{animal?.name}</Text>
              <View style={styles.healthyBadge}>
                <Text style={styles.healthyBadgeText}>Healthy</Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              <Text style={styles.priceText}>৳ {animal?.liveWeightPrice || 0}</Text>
              <Text style={styles.priceSubtext}>(Negotiable/Live wight)</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.addToMarketBtn}
              activeOpacity={0.8}
              onPress={handleAddToMarketplace}
            >
              <Text style={styles.addToMarketBtnText}>🛒 Add To Marketplace</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.shareDetailsBtn}
              activeOpacity={0.8}
              onPress={handleShare}
            >
              <Text style={styles.shareDetailsBtnText}>📤 Share Details</Text>
            </TouchableOpacity>
          </View>

          {/* Basic Informations Grid */}
          <Text style={styles.sectionTitle}>Basic Informations</Text>

          <View style={styles.gridContainer}>
            {basicInfo.map((info, idx) => (
              <View key={idx} style={styles.gridCard}>
                <Text style={styles.gridLabel}>{info.label}</Text>
                <Text style={styles.gridValue}>{info.value}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Floating Bottom Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => router.push({ pathname: '/add-animal', params: { id, edit: '1' } })}
          activeOpacity={0.85}
        >
          <Text style={styles.editBtnText}>✏️ Edit Animal Details</Text>
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
    paddingBottom: 90,
  },
  imageContainer: {
    width: '100%',
    height: SLIDE_HEIGHT,
    position: 'relative',
    backgroundColor: '#EBE5DF',
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  paginationRow: {
    position: 'absolute',
    bottom: 42,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    opacity: 0.8,
  },
  dotActive: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#BD632F',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    opacity: 1,
  },
  imageHeaderSafeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  imageHeader: {
    paddingHorizontal: 20,
    paddingTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  circleButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#BD632F',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  sheetContainer: {
    backgroundColor: '#FAF9F6',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -28,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headerLeft: {
    flex: 1,
  },
  animalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A1817',
    marginBottom: 8,
  },
  healthyBadge: {
    backgroundColor: '#EEF4E3',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  healthyBadgeText: {
    color: '#608030',
    fontSize: 12,
    fontWeight: '700',
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1817',
    marginBottom: 4,
  },
  priceSubtext: {
    fontSize: 11,
    color: '#608030',
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  addToMarketBtn: {
    flex: 1,
    height: 48,
    backgroundColor: '#BD632F',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addToMarketBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  shareDetailsBtn: {
    flex: 1,
    height: 48,
    backgroundColor: '#FFF7F2',
    borderWidth: 1,
    borderColor: '#E8C5B0',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareDetailsBtnText: {
    color: '#BD632F',
    fontSize: 13,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#BD7D5B',
    marginBottom: 16,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  gridCard: {
    width: (width - 60) / 2,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E1DC',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  gridLabel: {
    fontSize: 11,
    color: '#BD7D5B',
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
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#E9E5DF',
  },
  editBtn: {
    backgroundColor: '#BD632F',
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
