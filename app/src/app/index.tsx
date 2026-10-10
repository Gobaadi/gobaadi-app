import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';

type OnboardingSlide =
  | {
      id: string;
      image: any;
      subtitle: string;
      type: 'slide1';
      titlePart1: string;
      titlePart2: string;
    }
  | {
      id: string;
      image: any;
      subtitle: string;
      type: 'slide2';
      titleFull: string;
    };

const slides: OnboardingSlide[] = [
  {
    id: '1',
    type: 'slide1',
    image: require('@/assets/images/OnboardingImage-1.webp'),
    titlePart1: 'onboarding.slides.slide1.titlePart1',
    titlePart2: 'onboarding.slides.slide1.titlePart2',
    subtitle: 'onboarding.slides.slide1.subtitle',
  },
  {
    id: '2',
    type: 'slide2',
    image: require('@/assets/images/OnboardingImage-2.webp'),
    titleFull: 'onboarding.slides.slide2.titleFull',
    subtitle: 'onboarding.slides.slide2.subtitle',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / width);
    if (index !== activeIndex && index >= 0 && index < slides.length) {
      setActiveIndex(index);
    }
  };

  const handleNext = () => {
    if (activeIndex < slides.length - 1) {
      const nextIndex = activeIndex + 1;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setActiveIndex(nextIndex);
    } else {
      router.push('/signup');
    }
  };

  const handleSkip = () => {
    router.push('/signup');
  };

  const renderItem = ({ item }: { item: OnboardingSlide }) => {
    if (item.type === 'slide1') {
      return (
        <ScrollView
          style={{ width }}
          contentContainerStyle={styles.slideScrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Top Illustration */}
          <View style={styles.illustrationWrapper}>
            <Image
              source={item.image}
              style={styles.heroImage}
              resizeMode="contain"
            />
          </View>

          {/* Titles & Subtitle */}
          <View style={styles.textWrapper}>
            <Text style={styles.titleDark}>{t(item.titlePart1)}</Text>
            <Text style={styles.titleTerracotta}>{t(item.titlePart2)}</Text>
            <Text style={styles.subtitleText}>{t(item.subtitle)}</Text>
          </View>

          {/* Feature List Card */}
          <View style={styles.cardContainer}>
            {/* Item 1 */}
            <View style={styles.cardRow}>
              <View style={styles.iconCircle}>
                <Ionicons name="shield-outline" size={22} color="#BD632F" />
              </View>
              <View style={styles.cardTextContent}>
                <Text style={styles.cardTitle}>{t('onboarding.features.healthCheckup.title')}</Text>
                <Text style={styles.cardSubtitle}>{t('onboarding.features.healthCheckup.subtitle')}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Item 2 */}
            <View style={styles.cardRow}>
              <View style={styles.iconCircle}>
                <FontAwesome5 name="syringe" size={20} color="#BD632F" />
              </View>
              <View style={styles.cardTextContent}>
                <Text style={styles.cardTitle}>{t('onboarding.features.timelyTreatment.title')}</Text>
                <Text style={styles.cardSubtitle}>{t('onboarding.features.timelyTreatment.subtitle')}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Item 3 */}
            <View style={styles.cardRow}>
              <View style={styles.iconCircle}>
                <Ionicons name="heart-outline" size={22} color="#BD632F" />
              </View>
              <View style={styles.cardTextContent}>
                <Text style={styles.cardTitle}>{t('onboarding.features.productivity.title')}</Text>
                <Text style={styles.cardSubtitle}>{t('onboarding.features.productivity.subtitle')}</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      );
    }

    // Slide 2
    return (
      <ScrollView
        style={{ width }}
        contentContainerStyle={styles.slideScrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Top Illustration */}
        <View style={styles.illustrationWrapper}>
          <Image
            source={item.image}
            style={styles.heroImage}
            resizeMode="contain"
          />
        </View>

        {/* Titles & Subtitle */}
        <View style={styles.textWrapper}>
          <Text style={styles.titleFull}>{t(item.titleFull)}</Text>
          <Text style={styles.subtitleText}>{t(item.subtitle)}</Text>
        </View>

        <View style={{ flex: 1, minHeight: 20 }} />
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Slides Carousel */}
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        bounces={false}
      />

      {/* Footer Area with Dots & Action Button */}
      <View style={styles.footerContainer}>
        {/* Skip Button - Only on Slide 1 */}
        {activeIndex === 0 && (
          <View style={styles.skipRow}>
            <TouchableOpacity onPress={handleSkip} activeOpacity={0.7}>
              <Text style={styles.skipText}>{t('onboarding.skip')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Pagination Dots */}
        <View style={styles.paginationRow}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                activeIndex === index ? styles.activeDot : styles.inactiveDot,
              ]}
            />
          ))}
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={styles.actionButton}
          activeOpacity={0.85}
          onPress={handleNext}
        >
          <Text style={styles.actionButtonText}>
            {activeIndex === 0 ? t('onboarding.next') : t('onboarding.getStarted')}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  slideScrollContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  illustrationWrapper: {
    width: '100%',
    height: 320,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  textWrapper: {
    alignItems: 'center',
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  titleDark: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1C1917',
    textAlign: 'center',
    lineHeight: 34,
  },
  titleTerracotta: {
    fontSize: 26,
    fontWeight: '800',
    color: '#BD632F',
    textAlign: 'center',
    lineHeight: 34,
    marginBottom: 12,
  },
  titleFull: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1C1917',
    textAlign: 'center',
    lineHeight: 34,
    marginBottom: 12,
  },
  subtitleText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  cardContainer: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 18,
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: '#F3EFEA',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FAF0E6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  cardTextContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1C1917',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#8E8780',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3EFEA',
    marginVertical: 2,
  },
  footerContainer: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    paddingTop: 8,
    backgroundColor: '#FAF8F5',
  },
  skipRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  skipText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  activeDot: {
    width: 24,
    backgroundColor: '#BD632F',
  },
  inactiveDot: {
    width: 8,
    backgroundColor: '#E0D8D0',
  },
  actionButton: {
    backgroundColor: '#BD632F',
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#BD632F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
});

