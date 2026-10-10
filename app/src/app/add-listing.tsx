import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useCreateListingMutation } from '@/store/livestockApi';

const CATEGORIES = [
  { key: 'animals', labelKey: 'addListing.categories.animals' },
  { key: 'proteins', labelKey: 'addListing.categories.proteins' },
  { key: 'dairy', labelKey: 'addListing.categories.dairy' },
  { key: 'food', labelKey: 'addListing.categories.food' },
  { key: 'equipments', labelKey: 'addListing.categories.equipments' },
  { key: 'vaccines', labelKey: 'addListing.categories.vaccines' },
];

export default function AddListingScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0].key);
  const [createListing, { isLoading }] = useCreateListingMutation();

  async function handleSubmit() {
    const trimmedName = name.trim();
    const parsedPrice = parseFloat(price);
    if (!trimmedName || !parsedPrice || parsedPrice <= 0) {
      Alert.alert(t('addListing.alerts.missingInfo'), t('addListing.alerts.missingMsg'));
      return;
    }
    try {
      await createListing({
        species: trimmedName.toLowerCase().includes('goat') ? 'goat' : 'cow',
        breed: trimmedName,
        price: parsedPrice,
        age: '12 Months',
        weight: 120,
        gender: 'male',
        location: 'Dhaka',
        farmName: 'My Farm',
        healthStatus: 'Healthy',
        status: 'published',
      }).unwrap();
      router.replace('/(tabs)/market');
    } catch (err) {
      console.log('Error creating listing:', err);
      Alert.alert(t('addListing.alerts.createFailed'), t('addListing.alerts.tryAgain'));
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.circleButton} onPress={() => router.back()} activeOpacity={0.8}>
          <Text style={styles.buttonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('addListing.title')}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>{t('addListing.fields.name')}</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder={t('addListing.namePlaceholder')}
            placeholderTextColor="#A39E99"
          />
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>{t('addListing.fields.price')}</Text>
          <TextInput
            style={styles.input}
            value={price}
            onChangeText={setPrice}
            placeholder={t('addListing.pricePlaceholder')}
            placeholderTextColor="#A39E99"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>{t('addListing.fields.category')}</Text>
          <View style={styles.categoryRow}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.key}
                style={[styles.categoryChip, category === cat.key && styles.categoryChipActive]}
                onPress={() => setCategory(cat.key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.categoryChipText, category === cat.key && styles.categoryChipTextActive]}>
                  {t(cat.labelKey)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, isLoading && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={isLoading}
          activeOpacity={0.85}
        >
          <Text style={styles.submitButtonText}>{isLoading ? t('addListing.creating') : t('addListing.createListing')}</Text>
        </TouchableOpacity>
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
  scrollContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1817',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E1DC',
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#1A1817',
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E1DC',
  },
  categoryChipActive: {
    backgroundColor: '#BD632F',
    borderColor: '#BD632F',
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7C7672',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },
  submitButton: {
    backgroundColor: '#BD632F',
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
