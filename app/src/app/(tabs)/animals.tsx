import { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StatusBar,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGetAnimalsQuery } from '@/store/animalsApi';
import { EmptyState } from '@/components/ui/empty-state';
import { MediaCardSkeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/hooks/use-language';

const { width } = Dimensions.get('window');

function animalImage(breed: string) {
  return breed.toLowerCase().includes('buffalo')
    ? require('@/assets/images/albino_buffalo.png')
    : require('@/assets/images/bangladeshi_cow.png');
}

function animalStatus(id: number): 'Healthy' | 'Under Treatment' {
  return id % 2 === 0 ? 'Under Treatment' : 'Healthy';
}

export default function AnimalsListScreen() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState('All');
  const { data: animals = [], isLoading } = useGetAnimalsQuery();
  const { languageCode } = useLanguage();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF9F6" />
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Animals</Text>
        <View style={styles.headerRightControls}>
          <TouchableOpacity
            style={styles.langBadge}
            activeOpacity={0.8}
            onPress={() => router.push('/select-language')}
          >
            <Ionicons name="globe-outline" size={16} color="#BD632F" />
            <Text style={styles.langText}>{languageCode}</Text>
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
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search animals..."
          placeholderTextColor="#A39E99"
        />
      </View>

      {/* Filters Row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersContainer}
      >
        <TouchableOpacity style={styles.filterIconButton}>
          <Text style={styles.filterIcon}>⚙️</Text>
          <Text style={styles.filterIconText}>Filter</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, activeFilter === 'All' && styles.filterTabActive]}
          onPress={() => setActiveFilter('All')}
        >
          <Text style={[styles.filterTabText, activeFilter === 'All' && styles.filterTabTextActive]}>All ({animals.length})</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, activeFilter === 'Calf' && styles.filterTabActive]}
          onPress={() => setActiveFilter('Calf')}
        >
          <Text style={[styles.filterTabText, activeFilter === 'Calf' && styles.filterTabTextActive]}>Calf ({animals.filter(a => (a.age || '').toLowerCase().includes('calf') || (a.name || '').toLowerCase().includes('calf')).length})</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, activeFilter === 'Bull' && styles.filterTabActive]}
          onPress={() => setActiveFilter('Bull')}
        >
          <Text style={[styles.filterTabText, activeFilter === 'Bull' && styles.filterTabTextActive]}>Bull ({animals.filter(a => (a.gender || '').toLowerCase() === 'male').length})</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Animals Cards List */}
      <ScrollView contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <>
            <MediaCardSkeleton imageSize={100} />
            <MediaCardSkeleton imageSize={100} />
            <MediaCardSkeleton imageSize={100} />
          </>
        ) : animals.length === 0 ? (
          <EmptyState
            title="No animals yet"
            description="Add your livestock to start tracking health, tasks, and records."
            actionLabel="Add Animal"
            onAction={() => router.push('/add-animal')}
          />
        ) : (() => {
          const displayAnimals = animals.filter((a) => {
            if (activeFilter === 'All') return true;
            if (activeFilter === 'Calf') return (a.age || '').toLowerCase().includes('calf') || (a.name || '').toLowerCase().includes('calf');
            if (activeFilter === 'Bull') return (a.gender || '').toLowerCase() === 'male';
            return true;
          });
          return displayAnimals.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.card}
              activeOpacity={0.9}
              onPress={() => router.push({
                pathname: '/my-animal-detail',
                params: { id: item.id }
              })}
            >
              <Image source={item.image ? { uri: item.image } : animalImage(item.breed)} style={styles.cardImage} contentFit="cover" />

              <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardName}>{item.name}</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      animalStatus(item.id) === 'Healthy' ? styles.statusHealthy : styles.statusTreatment,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        animalStatus(item.id) === 'Healthy' ? styles.statusTextHealthy : styles.statusTextTreatment,
                      ]}
                    >
                      {animalStatus(item.id)}
                    </Text>
                  </View>
                </View>

                <Text style={styles.cardDesc} numberOfLines={1}>
                  {item.color ? `${item.color} colored coat and characteristics` : 'cream-colored coat and tuft of blond hair'}
                </Text>

                {/* Specs Row */}
                <View style={styles.specsRow}>
                  <View style={styles.specItem}>
                    <Text style={styles.specLabel}>Species</Text>
                    <Text style={styles.specValue}>{item.breed}</Text>
                  </View>
                  <View style={styles.specItem}>
                    <Text style={styles.specLabel}>Age</Text>
                    <Text style={styles.specValue}>{item.age}</Text>
                  </View>
                  <View style={styles.specItem}>
                    <Text style={styles.specLabel}>Weight</Text>
                    <Text style={styles.specValue}>{item.weight}</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ));
          })()}
      </ScrollView>

      {/* Floating Add Animal Button */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => router.push('/add-animal')}
      >
        <View style={styles.fabPlusCircle}>
          <Text style={styles.fabPlusSign}>+</Text>
        </View>
        <Text style={styles.fabText}>Add Animal</Text>
      </TouchableOpacity>
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E1DC',
    borderRadius: 18,
    paddingHorizontal: 12,
    height: 40,
    gap: 6,
  },
  langGlobe: {
    fontSize: 14,
  },
  langText: {
    fontSize: 13,
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
  bellIcon: {
    fontSize: 18,
    color: '#FFFFFF',
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
    fontSize: 16,
    marginRight: 10,
    color: '#7C7672',
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    color: '#1A1817',
  },
  filtersContainer: {
    paddingHorizontal: 24,
    height: 40,
    marginBottom: 20,
    gap: 8,
  },
  filterIconButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E1DC',
    borderRadius: 18,
    paddingHorizontal: 16,
    height: 36,
  },
  filterIcon: {
    fontSize: 14,
    marginRight: 6,
    color: '#7C7672',
  },
  filterIconText: {
    fontSize: 13,
    color: '#1A1817',
    fontWeight: '600',
  },
  filterTab: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E1DC',
    borderRadius: 18,
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
  listContainer: {
    paddingHorizontal: 24,
    paddingBottom: 120, // Leave room for floating tab bar and FAB
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
    width: 84,
    height: 84,
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
  },
  cardName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1817',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  statusHealthy: {
    backgroundColor: '#EEF4E3',
  },
  statusTreatment: {
    backgroundColor: '#FFF3E0',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusTextHealthy: {
    color: '#608030',
  },
  statusTextTreatment: {
    color: '#E65100',
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
    bottom: 85,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#BD632F',
    borderRadius: 28,
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
});
