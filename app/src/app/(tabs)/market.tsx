import React, { useState, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGetProductsQuery } from '@/store/productsApi';
import { useGetLivestockQuery, useGetMyListingsQuery } from '@/store/livestockApi';
import { useDebounce } from '@/hooks/use-debounce';
import { EmptyState } from '@/components/ui/empty-state';
import { MediaCardSkeleton } from '@/components/ui/skeleton';

interface Category {
  id: string;
  name: string;
  icon: string;
}

interface MarketItemView {
  id: number;
  title: string;
  price: string;
  timeAgo: string;
  species: string;
  age: string;
  liveWeight: string;
  sellerName: string;
  location: string;
  image: any;
}

export default function MarketScreen() {
  const router = useRouter();
  const [tradeType, setTradeType] = useState<'Buy' | 'Sell'>('Buy');
  const [activeCategory, setActiveCategory] = useState('Animals');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedSpecies, setSelectedSpecies] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<{ min: string; max: string }>({ min: '', max: '' });
  const debouncedSearch = useDebounce(searchQuery, 300);

  const categories: Category[] = [
    { id: '1', name: 'Animals', icon: '🐂' },
    { id: '2', name: 'Proteins', icon: '🥩' },
    { id: '3', name: 'Dairy', icon: '🧀' },
    { id: '4', name: 'Food', icon: '🌾' },
    { id: '5', name: 'Equipments', icon: '🪓' },
    { id: '6', name: 'Vaccines', icon: '💉' },
  ];

  const { data: products, isLoading: isProductsLoading } = useGetProductsQuery({}, { skip: activeCategory === 'Animals' || tradeType !== 'Buy' });
  const { data: livestock, isLoading: isLivestockLoading } = useGetLivestockQuery({}, { skip: activeCategory !== 'Animals' || tradeType !== 'Buy' });
  const { data: myListings = [], isLoading: isMyListingsLoading } = useGetMyListingsQuery(undefined, { skip: tradeType !== 'Sell' });

  const isCatalogLoading = tradeType === 'Sell' ? isMyListingsLoading : (activeCategory === 'Animals' ? isLivestockLoading : isProductsLoading);

  const catalogList = activeCategory === 'Animals' 
    ? (Array.isArray(livestock) ? livestock : (livestock as any)?.data || []) 
    : (Array.isArray(products) ? products : (products as any)?.data || []);

  const marketItems: MarketItemView[] = useMemo(() => {
    return catalogList.map((item: any) => {
      const isLivestock = activeCategory === 'Animals';
      return {
        id: item.id,
        title: item.name || `${item.breed || ''} ${item.species || ''}`,
        price: item.price.toLocaleString(),
        timeAgo: 'Just now',
        species: isLivestock ? (item.species || 'Cattle') : 'Feed/Med',
        age: isLivestock ? (item.age || 'N/A') : 'N/A',
        liveWeight: isLivestock ? `${item.weight || 0} Kg` : 'N/A',
        sellerName: isLivestock ? (item.farmName || 'Seller') : 'Gobadi Store',
        location: item.location || 'Dhaka',
        image: item.images && item.images[0]
          ? { uri: item.images[0] }
          : (item.name || '').toLowerCase().includes('goat') || (item.breed || '').toLowerCase().includes('goat')
            ? require('@/assets/images/kota_goat.png')
            : require('@/assets/images/albino_buffalo.png'),
      };
    });
  }, [catalogList, activeCategory]);

  const filteredItems = useMemo(() => {
    const items = tradeType === 'Sell'
      ? myListings.map((item: any) => ({
          id: item.id,
          title: `${item.breed || ''} ${item.species || ''}`.trim(),
          price: item.price?.toLocaleString() || '0',
          timeAgo: 'Active',
          species: item.species || 'Cattle',
          age: item.age || 'N/A',
          liveWeight: `${item.weight || 0} Kg`,
          sellerName: 'Me',
          location: item.location || 'My Farm',
          image: item.images && item.images[0]
            ? { uri: item.images[0] }
            : require('@/assets/images/kota_goat.png'),
        }))
      : marketItems;

    return items.filter((item) => {
      // Search filter — matches title, species, breed, location
      if (debouncedSearch) {
        const q = debouncedSearch.toLowerCase();
        const searchable = `${item.title} ${item.species} ${item.location}`.toLowerCase();
        if (!searchable.includes(q)) return false;
      }

      // Category chip filter (Calf, Bull, etc.)
      if (activeFilter !== 'All') {
        const filterLower = activeFilter.toLowerCase();
        const itemText = `${item.title} ${item.species} ${item.age}`.toLowerCase();
        if (!itemText.includes(filterLower)) return false;
      }

      // Modal species filter
      if (selectedSpecies.length > 0) {
        if (!selectedSpecies.includes(item.species)) return false;
      }

      // Modal price range filter
      const price = parseInt(item.price.replace(/[^0-9]/g, ''), 10);
      if (priceRange.min && price < parseInt(priceRange.min, 10)) return false;
      if (priceRange.max && price > parseInt(priceRange.max, 10)) return false;

      return true;
    });
  }, [tradeType, myListings, marketItems, debouncedSearch, activeFilter, selectedSpecies, priceRange]);

  // Derive dynamic filter chip counts from current items
  const filterChips = useMemo(() => {
    const allCount = marketItems.length;
    const calfCount = marketItems.filter((i) => /calf|baby|young/i.test(`${i.title} ${i.species} ${i.age}`)).length;
    const bullCount = marketItems.filter((i) => /bull|ox|steer/i.test(`${i.title} ${i.species}`)).length;

    return [
      { label: `All (${allCount})`, value: 'All' },
      { label: `Calf (${calfCount})`, value: 'Calf' },
      { label: `Bull (${bullCount})`, value: 'Bull' },
    ];
  }, [marketItems]);

  const hasActiveFilters = activeFilter !== 'All' || selectedSpecies.length > 0 || priceRange.min || priceRange.max;

  const clearFilters = useCallback(() => {
    setActiveFilter('All');
    setSelectedSpecies([]);
    setPriceRange({ min: '', max: '' });
    setSearchQuery('');
  }, []);

  const toggleSpecies = useCallback((species: string) => {
    setSelectedSpecies((prev) =>
      prev.includes(species) ? prev.filter((s) => s !== species) : [...prev, species]
    );
  }, []);

  // Derive available species from current catalog
  const availableSpecies = useMemo(() => {
    const speciesSet = new Set<string>();
    marketItems.forEach((item) => speciesSet.add(item.species));
    return Array.from(speciesSet).sort();
  }, [marketItems]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Marketplace</Text>
          {/* Location row */}
          <View style={styles.locationRow}>
            <Text style={styles.locationPin}>📍</Text>
            <Text style={styles.locationText}>Uttar Badda, Dhaka</Text>
            <Text style={styles.dropdownArrow}>▼</Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.wishlistButton}
            onPress={() => router.push('/wishlist')}
            activeOpacity={0.8}
          >
            <Text style={styles.wishlistText}>♥</Text>
          </TouchableOpacity>

          {/* My Cart Button */}
          <TouchableOpacity
            style={styles.cartButton}
            onPress={() => router.push('/cart')}
            activeOpacity={0.8}
          >
            <Text style={styles.cartText}>🛒 My Cart</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Buy / Sell Toggle Selector */}
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleBtn, tradeType === 'Buy' && styles.toggleBtnActive]}
            onPress={() => setTradeType('Buy')}
            activeOpacity={0.8}
          >
            <Text style={[styles.toggleBtnText, tradeType === 'Buy' && styles.toggleBtnTextActive]}>
              Buy
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, tradeType === 'Sell' && styles.toggleBtnActive]}
            onPress={() => setTradeType('Sell')}
            activeOpacity={0.8}
          >
            <Text style={[styles.toggleBtnText, tradeType === 'Sell' && styles.toggleBtnTextActive]}>
              Sell
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search input field */}
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Search anything...."
            placeholderTextColor="#A39E99"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
              <Ionicons name="close-circle" size={20} color="#9C9690" />
            </TouchableOpacity>
          )}
        </View>

        {/* Active filters indicator */}
        {hasActiveFilters && (
          <View style={styles.activeFiltersBanner}>
            <Text style={styles.activeFiltersText}>
              Filters active{filteredItems.length > 0 ? ` — ${filteredItems.length} results` : ''}
            </Text>
            <TouchableOpacity onPress={clearFilters} activeOpacity={0.7}>
              <Text style={styles.clearFiltersText}>Clear all</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Categories Horizontal Selector Row */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesRow}
        >
          {categories.map((cat) => {
            const isActive = activeCategory === cat.name;
            return (
              <TouchableOpacity
                key={cat.id}
                style={styles.categoryItem}
                onPress={() => setActiveCategory(cat.name)}
                activeOpacity={0.8}
              >
                <View style={[styles.categoryCircle, isActive && styles.categoryCircleActive]}>
                  <Text style={styles.categoryIcon}>{cat.icon}</Text>
                </View>
                <Text style={[styles.categoryLabel, isActive && styles.categoryLabelActive]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {tradeType === 'Sell' ? (
          <>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>My Listings</Text>
            </View>

            <View style={styles.itemsList}>
              {isCatalogLoading ? (
                <MediaCardSkeleton imageSize={100} />
              ) : filteredItems.length === 0 ? (
                <EmptyState
                  compact
                  title="No listings yet"
                  description="You haven't listed anything for sale yet."
                  actionLabel="Add Listing"
                  onAction={() => router.push('/add-listing')}
                />
              ) : (
                filteredItems.map((item) => (
                  <View key={item.id} style={styles.itemCard}>
                    <View style={styles.cardMain}>
                      <Image source={item.image} style={styles.itemImage} />
                      <View style={styles.itemMeta}>
                        <Text style={styles.itemTitle}>{item.title}</Text>
                        <Text style={styles.itemPrice}>৳ {item.price}</Text>
                        <Text style={styles.specValue}>{item.species}</Text>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>

            <TouchableOpacity
              style={styles.addListingBtn}
              onPress={() => router.push('/add-listing')}
              activeOpacity={0.85}
            >
              <Text style={styles.addListingBtnText}>＋ Add Listing</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            {/* Trending Section */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Most Trending Animals</Text>
            </View>

            {/* Filters Row */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filtersRow}
            >
              <TouchableOpacity
                style={styles.filterBtn}
                activeOpacity={0.8}
                onPress={() => setFilterModalVisible(true)}
              >
                <Text style={styles.filterBtnIcon}>⚙️</Text>
                <Text style={styles.filterBtnText}>Filter</Text>
              </TouchableOpacity>
              {filterChips.map((chip) => {
                const isSelected = activeFilter === chip.value;
                return (
                  <TouchableOpacity
                    key={chip.value}
                    style={[styles.filterChip, isSelected && styles.filterChipActive]}
                    onPress={() => setActiveFilter(chip.value)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                      {chip.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Item Cards List */}
            <View style={styles.itemsList}>
              {isCatalogLoading ? (
                <>
                  <MediaCardSkeleton imageSize={100} />
                  <MediaCardSkeleton imageSize={100} />
                </>
              ) : filteredItems.length === 0 ? (
                <EmptyState
                  compact
                  title="Nothing here yet"
                  description="No items match this category right now."
                />
              ) : (
              filteredItems.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.itemCard}
                  onPress={() => router.push({ pathname: '/animal-details', params: { id: item.id } })}
                  activeOpacity={0.9}
                >
                  <View style={styles.cardMain}>
                    <Image source={item.image} style={styles.itemImage} />

                    <View style={styles.itemMeta}>
                      <View style={styles.titleRow}>
                        <Text style={styles.itemTitle}>{item.title}</Text>
                        <Text style={styles.timeBadge}>{item.timeAgo}</Text>
                        <TouchableOpacity style={styles.shareBtn} activeOpacity={0.7}>
                          <Text style={styles.shareIcon}>📤</Text>
                        </TouchableOpacity>
                      </View>

                      <Text style={styles.itemPrice}>৳ {item.price}</Text>

                      {/* Animal Specifications */}
                      <View style={styles.specsRow}>
                        <View style={styles.specCell}>
                          <Text style={styles.specLabel}>Species</Text>
                          <Text style={styles.specValue}>{item.species}</Text>
                        </View>
                        <View style={styles.specCell}>
                          <Text style={styles.specLabel}>Age</Text>
                          <Text style={styles.specValue}>{item.age}</Text>
                        </View>
                        <View style={styles.specCell}>
                          <Text style={styles.specLabel}>Live Weight</Text>
                          <Text style={styles.specValue}>{item.liveWeight}</Text>
                        </View>
                      </View>

                      {/* Seller info row */}
                      <View style={styles.sellerRow}>
                        <View style={styles.sellerLeft}>
                          <View style={styles.sellerAvatarCircle}>
                            <Text style={styles.sellerAvatarEmoji}>👤</Text>
                          </View>
                          <View>
                            <Text style={styles.sellerName}>{item.sellerName}</Text>
                            <Text style={styles.sellerLoc}>📍 {item.location}</Text>
                          </View>
                        </View>
                        <TouchableOpacity
                          style={styles.messageBtn}
                          onPress={() => router.push('/chat')}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.messageBtnText}>💬 Message</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  {/* Action Buttons footer */}
                  <View style={styles.cardActionsRow}>
                    <TouchableOpacity
                      style={styles.bookBtn}
                      onPress={() => router.push({ pathname: '/book-animal', params: { id: item.id } })}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.bookBtnText}>🏷️ Book Animal</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.buyBtn}
                      onPress={() => router.push({ pathname: '/checkout', params: { id: item.id } })}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.buyBtnText}>🛒 Buy Animal</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              )))}
            </View>
          </>
        )}
      </ScrollView>

      {/* Filter Modal */}
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
            <Text style={styles.modalTitle}>Filters</Text>
            <TouchableOpacity onPress={clearFilters} activeOpacity={0.7}>
              <Text style={styles.modalClearBtn}>Reset</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalBodyContent}>
            {/* Species filter */}
            <Text style={styles.modalSectionTitle}>Species</Text>
            <View style={styles.modalChipRow}>
              {availableSpecies.map((species) => {
                const isActive = selectedSpecies.includes(species);
                return (
                  <TouchableOpacity
                    key={species}
                    style={[styles.modalChip, isActive && styles.modalChipActive]}
                    onPress={() => toggleSpecies(species)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.modalChipText, isActive && styles.modalChipTextActive]}>
                      {species}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Price Range */}
            <Text style={[styles.modalSectionTitle, { marginTop: 24 }]}>Price Range (৳)</Text>
            <View style={styles.priceRow}>
              <TextInput
                style={styles.priceInput}
                placeholder="Min"
                placeholderTextColor="#A39E99"
                keyboardType="numeric"
                value={priceRange.min}
                onChangeText={(v) => setPriceRange((p) => ({ ...p, min: v }))}
              />
              <Text style={styles.priceDash}>—</Text>
              <TextInput
                style={styles.priceInput}
                placeholder="Max"
                placeholderTextColor="#A39E99"
                keyboardType="numeric"
                value={priceRange.max}
                onChangeText={(v) => setPriceRange((p) => ({ ...p, max: v }))}
              />
            </View>
          </ScrollView>

          {/* Apply button */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.modalApplyBtn}
              onPress={() => setFilterModalVisible(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.modalApplyBtnText}>
                Show {filteredItems.length} result{filteredItems.length !== 1 ? 's' : ''}
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
  scrollContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A1817',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  locationPin: {
    fontSize: 14,
    marginRight: 4,
  },
  locationText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1817',
    marginRight: 4,
  },
  dropdownArrow: {
    fontSize: 8,
    color: '#BD632F',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  wishlistButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E1DC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  wishlistText: {
    fontSize: 16,
    color: '#BD632F',
  },
  cartButton: {
    backgroundColor: '#BD632F',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: '#BD632F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cartText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E1DC',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
  },
  toggleBtn: {
    flex: 1,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  toggleBtnActive: {
    backgroundColor: '#BD632F',
  },
  toggleBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#7C7672',
  },
  toggleBtnTextActive: {
    color: '#FFFFFF',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E1DC',
    borderRadius: 14,
    height: 52,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 10,
    color: '#9C9690',
  },
  textInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    color: '#1A1817',
  },
  categoriesRow: {
    gap: 16,
    paddingBottom: 20,
  },
  categoryItem: {
    alignItems: 'center',
  },
  categoryCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E1DC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryCircleActive: {
    borderColor: '#BD632F',
    borderWidth: 1.5,
  },
  categoryIcon: {
    fontSize: 24,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9C9690',
  },
  categoryLabelActive: {
    color: '#BD632F',
    fontWeight: '700',
  },
  sectionHeaderRow: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1817',
  },
  filtersRow: {
    gap: 8,
    paddingBottom: 20,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E1DC',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  filterBtnIcon: {
    fontSize: 13,
    marginRight: 6,
  },
  filterBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7C7672',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E1DC',
  },
  filterChipActive: {
    backgroundColor: '#BD632F',
    borderColor: '#BD632F',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7C7672',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  itemsList: {
    gap: 20,
  },
  addListingBtn: {
    backgroundColor: '#BD632F',
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  addListingBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E6E1DC',
    padding: 16,
  },
  cardMain: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  itemImage: {
    width: 100,
    height: 100,
    borderRadius: 20,
    marginRight: 14,
  },
  itemMeta: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1817',
    flex: 1,
  },
  timeBadge: {
    fontSize: 10,
    color: '#BD632F',
    backgroundColor: '#FFF8F4',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 6,
  },
  shareBtn: {
    padding: 2,
  },
  shareIcon: {
    fontSize: 13,
    color: '#BD632F',
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: '#BD632F',
    marginBottom: 8,
  },
  specsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  specCell: {
    flex: 1,
  },
  specLabel: {
    fontSize: 9,
    color: '#9C9690',
    fontWeight: '500',
    marginBottom: 2,
  },
  specValue: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1A1817',
  },
  sellerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1.5,
    borderTopColor: '#FAF9F6',
    paddingTop: 12,
  },
  sellerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sellerAvatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E9E5DF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  sellerAvatarEmoji: {
    fontSize: 14,
  },
  sellerName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A1817',
  },
  sellerLoc: {
    fontSize: 10,
    color: '#9C9690',
    marginTop: 1,
  },
  messageBtn: {
    backgroundColor: '#FFF8F4',
    borderWidth: 1,
    borderColor: '#E6E1DC',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  messageBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#BD632F',
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  bookBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#BD632F',
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookBtnText: {
    color: '#BD632F',
    fontSize: 14,
    fontWeight: '700',
  },
  buyBtn: {
    flex: 1,
    backgroundColor: '#BD632F',
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buyBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  activeFiltersBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF8F4',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 12,
  },
  activeFiltersText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#BD632F',
  },
  clearFiltersText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#BD632F',
    textDecorationLine: 'underline',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FAF9F6',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
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
  modalBody: {
    flex: 1,
  },
  modalBodyContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
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
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E1DC',
  },
  modalChipActive: {
    backgroundColor: '#BD632F',
    borderColor: '#BD632F',
  },
  modalChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7C7672',
  },
  modalChipTextActive: {
    color: '#FFFFFF',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  priceInput: {
    flex: 1,
    height: 48,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E1DC',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#1A1817',
  },
  priceDash: {
    fontSize: 16,
    color: '#9C9690',
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderTopColor: '#E6E1DC',
  },
  modalApplyBtn: {
    backgroundColor: '#BD632F',
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalApplyBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
