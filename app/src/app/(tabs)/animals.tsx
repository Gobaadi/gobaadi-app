import { useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Modal,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGetAnimalsQuery, type Animal } from '@/store/animalsApi';
import { EmptyState } from '@/components/ui/empty-state';
import { MediaCardSkeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/hooks/use-language';
import { useDebounce } from '@/hooks/use-debounce';
import { isRenderableImageUri } from '@/utils/photo-uri';
import { ageToMonths } from '@/utils/age';
import { useTranslation } from '@/hooks/use-translation';
import { getLanguageLabel } from '@/constants/languages';

type Chip = 'All' | 'Calf' | 'Bull';

type T = ReturnType<typeof useTranslation>['t'];

function animalImage(breed: string) {
  return breed.toLowerCase().includes('buffalo')
    ? require('@/assets/images/albino_buffalo.webp')
    : require('@/assets/images/bangladeshi_cow.webp');
}

function isCalf(a: Animal): boolean {
  const text = `${a.name || ''} ${a.breed || ''} ${a.age || ''}`.toLowerCase();
  return /calf|baby|young|juvenile/.test(text);
}

function isBull(a: Animal): boolean {
  const gender = (a.gender || '').toLowerCase();
  const text = `${a.name || ''} ${a.breed || ''}`.toLowerCase();
  return gender === 'male' || /bull|ox|steer/.test(text);
}

function formatAge(t: T, age?: string, dob?: string): string {
  const m = ageToMonths(age, dob);
  if (m === null) {
    const trimmed = (age || '').trim();
    return trimmed ? trimmed : t('animalsTab.notAvailable');
  }
  return t('animalsTab.ageMonths', { count: m });
}

function formatWeight(t: T, weight?: string): string {
  if (!weight) return t('animalsTab.notAvailable');
  const w = weight.trim();
  if (!w) return t('animalsTab.notAvailable');
  if (/[a-z]/i.test(w)) return w;
  return t('animalsTab.weightKg', { weight: w });
}

function cardDescription(t: T, a: Animal): string {
  if (a.description) return a.description;
  if (a.color) return t('animalsTab.coloredCoat', { color: a.color });
  return t('animalsTab.defaultCoat');
}

export default function AnimalsListScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [activeFilter, setActiveFilter] = useState<Chip>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [genderFilter, setGenderFilter] = useState<'All' | 'Male' | 'Female'>('All');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const { data: animals = [], isLoading } = useGetAnimalsQuery();
  const { language } = useLanguage();
  const [failedImageUris, setFailedImageUris] = useState<string[]>([]);

  const counts = useMemo(
    () => ({
      all: animals.length,
      calf: animals.filter(isCalf).length,
      bull: animals.filter(isBull).length,
    }),
    [animals],
  );

  const displayAnimals = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return animals.filter((a) => {
      if (q) {
        const haystack = `${a.name || ''} ${a.breed || ''} ${a.color || ''} ${a.description || ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (activeFilter === 'Calf' && !isCalf(a)) return false;
      if (activeFilter === 'Bull' && !isBull(a)) return false;
      if (genderFilter !== 'All' && (a.gender || '').toLowerCase() !== genderFilter.toLowerCase()) return false;
      return true;
    });
  }, [animals, debouncedSearch, activeFilter, genderFilter]);

  const hasQuery =
    debouncedSearch.trim().length > 0 ||
    activeFilter !== 'All' ||
    genderFilter !== 'All';

  const resetAdvancedFilters = () => {
    setGenderFilter('All');
    setActiveFilter('All');
    setSearchQuery('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF9F6" />
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('animalsTab.title')}</Text>
        <View style={styles.headerRightControls}>
          <TouchableOpacity
            style={styles.langBadge}
            activeOpacity={0.8}
            onPress={() => router.push('/select-language')}
          >
            <Ionicons name="globe-outline" size={20} color="#BD632F" />
            <Text style={[styles.langText, { fontSize: 14 }]}>{getLanguageLabel(language)}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.notificationButton}
            activeOpacity={0.8}
            onPress={() => router.push('/notifications')}
          >
            <Ionicons name="notifications-outline" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#7C7672" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={t('animalsTab.searchPlaceholder')}
          placeholderTextColor="#A39E99"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCorrect={false}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={18} color="#A39E99" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filters Row */}
      <ScrollView
        horizontal
        style={styles.filtersScroll}
        contentContainerStyle={styles.filtersContainer}
        showsHorizontalScrollIndicator={false}
      >
        <TouchableOpacity
          style={styles.filterIconButton}
          activeOpacity={0.8}
          onPress={() => setFilterModalVisible(true)}
        >
          <Ionicons name="options-outline" size={16} color="#7C7672" style={{ marginRight: 6 }} />
          <Text style={styles.filterIconText}>{t('animalsTab.filter')}</Text>
          {genderFilter !== 'All' && <View style={styles.filterDot} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, activeFilter === 'All' && styles.filterTabActive]}
          onPress={() => setActiveFilter('All')}
        >
          <Text style={[styles.filterTabText, activeFilter === 'All' && styles.filterTabTextActive]}>
            {t('animalsTab.chips.all', { count: counts.all })}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, activeFilter === 'Calf' && styles.filterTabActive]}
          onPress={() => setActiveFilter('Calf')}
        >
          <Text style={[styles.filterTabText, activeFilter === 'Calf' && styles.filterTabTextActive]}>
            {t('animalsTab.chips.calf', { count: counts.calf })}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, activeFilter === 'Bull' && styles.filterTabActive]}
          onPress={() => setActiveFilter('Bull')}
        >
          <Text style={[styles.filterTabText, activeFilter === 'Bull' && styles.filterTabTextActive]}>
            {t('animalsTab.chips.bull', { count: counts.bull })}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Animals Cards List */}
      <View style={styles.listWrapper}>
        <ScrollView
          style={styles.listScroll}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <>
              <MediaCardSkeleton imageSize={100} />
              <MediaCardSkeleton imageSize={100} />
              <MediaCardSkeleton imageSize={100} />
            </>
          ) : animals.length === 0 ? (
            <EmptyState
              title={t('animalsTab.empty.noAnimalsTitle')}
              description={t('animalsTab.empty.noAnimalsDesc')}
              actionLabel={t('animalsTab.addAnimal')}
              onAction={() => router.push('/add-animal')}
            />
          ) : displayAnimals.length === 0 ? (
            <EmptyState
              title={t('animalsTab.empty.noResultsTitle')}
              description={t('animalsTab.empty.noResultsDesc')}
              actionLabel={hasQuery ? t('animalsTab.clearFilters') : t('animalsTab.addAnimal')}
              onAction={hasQuery ? resetAdvancedFilters : () => router.push('/add-animal')}
            />
          ) : (
            displayAnimals.map((item) => {
              const imageUri = isRenderableImageUri(item.image) ? item.image : undefined;
              const imageFailed = !!imageUri && failedImageUris.includes(imageUri);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.card}
                  activeOpacity={0.9}
                  onPress={() =>
                    router.push({
                      pathname: '/my-animal-detail',
                      params: { id: item.id },
                    })
                  }
                >
                  <Image
                    source={!imageFailed && imageUri ? { uri: imageUri } : animalImage(item.breed)}
                    style={styles.cardImage}
                    contentFit="cover"
                    onError={
                      !imageFailed && imageUri
                        ? () =>
                          setFailedImageUris((prev) =>
                            prev.includes(imageUri) ? prev : [...prev, imageUri],
                          )
                        : undefined
                    }
                  />

                  <View style={styles.cardContent}>
                    <View style={styles.cardHeader}>
                      <Text style={styles.cardName} numberOfLines={1}>
                        {item.name || item.breed || t('animalsTab.unnamed')}
                      </Text>
                    </View>

                    <Text style={styles.cardDesc} numberOfLines={1}>
                      {cardDescription(t, item)}
                    </Text>

                    {/* Specs Row */}
                    <View style={styles.specsRow}>
                      <View style={styles.specItem}>
                        <Text style={styles.specLabel}>{t('animalsTab.species')}</Text>
                        <Text style={styles.specValue} numberOfLines={1}>
                          {item.breed || t('animalsTab.notAvailable')}
                        </Text>
                      </View>
                      <View style={styles.specItem}>
                        <Text style={styles.specLabel}>{t('animalsTab.age')}</Text>
                        <Text style={styles.specValue}>{formatAge(t, item.age, item.dob)}</Text>
                      </View>
                      <View style={styles.specItem}>
                        <Text style={styles.specLabel}>{t('animalsTab.weight')}</Text>
                        <Text style={styles.specValue}>{formatWeight(t, item.weight)}</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </View>

      {/* Floating Add Animal Button */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => router.push('/add-animal')}
      >
        <View style={styles.fabPlusCircle}>
          <Text style={styles.fabPlusSign}>+</Text>
        </View>
        <Text style={styles.fabText}>{t('animalsTab.addAnimal')}</Text>
      </TouchableOpacity>

      {/* Advanced Filter Modal */}
      <Modal
        visible={filterModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setFilterModalVisible(false)} activeOpacity={0.7}>
              <Ionicons name="close" size={24} color="#1A1817" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{t('animalsTab.modal.title')}</Text>
            <TouchableOpacity onPress={resetAdvancedFilters} activeOpacity={0.7}>
              <Text style={styles.modalClearBtn}>{t('animalsTab.modal.reset')}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalBodyContent}>
            <Text style={styles.modalSectionTitle}>{t('animalsTab.modal.gender')}</Text>
            <View style={styles.modalChipRow}>
              {(['All', 'Male', 'Female'] as const).map((g) => {
                const isActive = genderFilter === g;
                return (
                  <TouchableOpacity
                    key={g}
                    style={[styles.modalChip, isActive && styles.modalChipActive]}
                    onPress={() => setGenderFilter(g)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.modalChipText, isActive && styles.modalChipTextActive]}>{t(`animalsTab.gender.${g.toLowerCase()}`)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.modalApplyBtn}
              activeOpacity={0.85}
              onPress={() => setFilterModalVisible(false)}
            >
              <Text style={styles.modalApplyText}>
                {t('animalsTab.modal.show', { count: displayAnimals.length })}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF9F6',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1A1817',
  },
  headerRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  langBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 40,
    gap: 6,
  },
  langText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#BD632F',
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#BD632F',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#BD632F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E1DC',
    borderRadius: 14,
    height: 52,
    marginHorizontal: 24,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    color: '#1A1817',
    padding: 0,
  },
  filtersScroll: {
    flexGrow: 0,
    height: 40,
    marginBottom: 16,
  },
  filtersContainer: {
    paddingHorizontal: 24,
    gap: 8,
    alignItems: 'center',
  },
  filterIconButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E1DC',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 36,
  },
  filterIconText: {
    fontSize: 13,
    color: '#1A1817',
    fontWeight: '600',
  },
  filterDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#BD632F',
    marginLeft: 6,
  },
  filterTab: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E1DC',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 36,
  },
  filterTabActive: {
    backgroundColor: '#BD632F',
    borderColor: '#BD632F',
  },
  filterTabText: {
    fontSize: 13,
    color: '#1A1817',
    fontWeight: '500',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  listWrapper: {
    flex: 1,
  },
  listScroll: {
    flex: 1,
  },
  listContainer: {
    paddingHorizontal: 24,
    paddingBottom: 120,
    flexGrow: 1,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    marginBottom: 16,
    padding: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E6E1DC',
  },
  cardImage: {
    width: 100,
    height: 100,
    borderRadius: 16,
  },
  cardContent: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 24,
  },
  cardName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1817',
    flex: 1,
    marginRight: 8,
  },
  cardDesc: {
    fontSize: 12.5,
    color: '#7C7672',
    marginTop: 4,
    marginBottom: 10,
  },
  specsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  specItem: {
    alignItems: 'flex-start',
    flexShrink: 1,
  },
  specLabel: {
    fontSize: 12,
    color: '#BD7D5B',
    fontWeight: '500',
  },
  specValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1817',
    marginTop: 2,
  },
  fab: {
    position: 'absolute',
    bottom: 105,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#BD632F',
    borderRadius: 17,
    height: 52,
    paddingHorizontal: 20,
    shadowColor: '#BD632F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 99,
  },
  fabPlusCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  fabPlusSign: {
    color: '#BD632F',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 20,
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FAF9F6',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E6E1DC',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1817',
  },
  modalClearBtn: {
    fontSize: 14,
    fontWeight: '600',
    color: '#BD632F',
  },
  modalBodyContent: {
    padding: 24,
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1817',
    marginBottom: 12,
  },
  modalChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modalChip: {
    paddingHorizontal: 16,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E1DC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalChipActive: {
    backgroundColor: '#BD632F',
    borderColor: '#BD632F',
  },
  modalChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1A1817',
  },
  modalChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  modalFooter: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    paddingTop: 8,
  },
  modalApplyBtn: {
    backgroundColor: '#BD632F',
    borderRadius: 28,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalApplyText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
