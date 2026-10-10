import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSearchQuery } from '@/store/searchApi';

const DEBOUNCE_MS = 300;

export default function SearchScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(query.trim()), DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [query]);

  const { data: results = {}, isFetching: isLoading } = useSearchQuery(debouncedQuery, {
    skip: debouncedQuery.length < 2,
  });

  const hasAnyResults =
    (results.animals?.length || 0) +
      (results.marketplace?.length || 0) +
      (results.doctors?.length || 0) +
      (results.alerts?.length || 0) >
    0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.circleButton} onPress={() => router.back()} activeOpacity={0.8}>
          <Text style={styles.buttonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('search.title')}</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Search Input */}
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.textInput}
          placeholder={t('search.placeholder')}
          placeholderTextColor="#A39E99"
          value={query}
          onChangeText={setQuery}
          autoFocus
        />
        {isLoading ? <ActivityIndicator size="small" color="#BD632F" /> : null}
      </View>

      <ScrollView contentContainerStyle={styles.resultsContainer} showsVerticalScrollIndicator={false}>
        {query.trim().length < 2 ? (
          <Text style={styles.hintText}>{t('search.hintMinChars')}</Text>
        ) : !isLoading && !hasAnyResults ? (
          <Text style={styles.hintText}>{t('search.noResults', { query })}</Text>
        ) : null}

        {results.animals && results.animals.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('search.sections.animals')}</Text>
            {results.animals.map((item) => (
              <TouchableOpacity
                key={`animal-${item.id}`}
                style={styles.resultRow}
                onPress={() => router.push({ pathname: '/my-animal-detail', params: { id: item.id } })}
                activeOpacity={0.7}
              >
                <Text style={styles.resultTitle}>{item.name}</Text>
                <Text style={styles.resultSub}>{item.breed}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        {results.marketplace && results.marketplace.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('search.sections.marketplace')}</Text>
            {results.marketplace.map((item) => (
              <TouchableOpacity
                key={`market-${item.id}`}
                style={styles.resultRow}
                onPress={() => router.push({ pathname: '/animal-details', params: { id: item.id } })}
                activeOpacity={0.7}
              >
                <Text style={styles.resultTitle}>{item.name}</Text>
                <Text style={styles.resultSub}>{item.category} • ৳ {item.price.toLocaleString()}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        {results.doctors && results.doctors.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('search.sections.doctors')}</Text>
            {results.doctors.map((item) => (
              <TouchableOpacity
                key={`doctor-${item.id}`}
                style={styles.resultRow}
                onPress={() => router.push({ pathname: '/doctor-detail', params: { id: item.id } })}
                activeOpacity={0.7}
              >
                <Text style={styles.resultTitle}>{item.name}</Text>
                <Text style={styles.resultSub}>{item.specialty}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        {results.alerts && results.alerts.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('search.sections.alerts')}</Text>
            {results.alerts.map((item) => (
              <View key={`alert-${item.id}`} style={styles.resultRow}>
                <Text style={styles.resultTitle}>{item.title}</Text>
                <Text style={styles.resultSub}>{item.location} • {item.crop}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E1DC',
    borderRadius: 14,
    height: 52,
    paddingHorizontal: 16,
    marginHorizontal: 24,
    marginBottom: 16,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 10,
    color: '#7C7672',
  },
  textInput: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    color: '#1A1817',
  },
  resultsContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  hintText: {
    fontSize: 13,
    color: '#9C9690',
    textAlign: 'center',
    paddingVertical: 30,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#BD632F',
    marginBottom: 8,
  },
  resultRow: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E1DC',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1817',
  },
  resultSub: {
    fontSize: 12,
    color: '#7C7672',
    marginTop: 2,
  },
});
