import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';

import { useGetLivestockItemQuery, useReserveListingMutation } from '@/store/livestockApi';

interface BookingOption {
  id: string;
  title: string;
  description: string;
  cost: string;
}

export default function BookAnimalScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const livestockId = id ? parseInt(id, 10) : undefined;
  const { data: animal } = useGetLivestockItemQuery(livestockId!, { skip: !livestockId });
  const [reserveListing, { isLoading: isReserving }] = useReserveListingMutation();
  const [selectedOption, setSelectedOption] = useState('1');

  const options: BookingOption[] = [
    {
      id: '1',
      title: 'Save For 20 Days',
      description: 'By selecting this option the animal will be locked for 20 days from your booking with the same price.',
      cost: '15000',
    },
    {
      id: '2',
      title: 'Save For 10 Days',
      description: 'By selecting this option the animal will be locked for 10 days from your booking with the same price.',
      cost: '12000',
    },
    {
      id: '3',
      title: 'Save For 5 Days',
      description: 'By selecting this option the animal will be locked for 5 days from your booking with the same price.',
      cost: '8000',
    },
    {
      id: '4',
      title: 'Save For 3 Days',
      description: 'By selecting this option the animal will be locked for 3 days from your booking with the same price.',
      cost: '5000',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.circleButton}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>←</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Book Animal</Text>

        <TouchableOpacity style={styles.circleButton} activeOpacity={0.8} onPress={() => router.push('/notifications')}>
          <Text style={styles.buttonText}>🔔</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Animal Details */}
        <Text style={styles.sectionTitle}>Animal Details</Text>
        
        <View style={styles.animalCard}>
          <Image
            source={animal?.images?.[0] ? { uri: animal.images[0] } : require('@/assets/images/albino_buffalo.png')}
            style={styles.animalImage}
          />
          <View style={styles.animalMeta}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Species:</Text>
              <Text style={styles.detailValue}>{animal?.species ?? 'Loading...'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Live Weight:</Text>
              <Text style={styles.detailValue}>{animal ? `${animal.weight} Kg` : '—'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Age:</Text>
              <Text style={styles.detailValue}>{animal?.age ?? '—'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Breed:</Text>
              <Text style={styles.detailValue}>{animal?.breed ?? '—'}</Text>
            </View>
          </View>
        </View>

        {/* Booking Options */}
        <Text style={styles.sectionTitle}>Booking Options</Text>

        <View style={styles.optionsList}>
          {options.map((opt) => {
            const isSelected = selectedOption === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                style={[styles.optionCard, isSelected && styles.optionCardActive]}
                onPress={() => setSelectedOption(opt.id)}
                activeOpacity={0.9}
              >
                <View style={styles.optionHeaderRow}>
                  {/* Custom Radio Button */}
                  <View style={styles.radioOuterCircle}>
                    {isSelected && <View style={styles.radioInnerCircle} />}
                  </View>
                  <Text style={styles.optionTitle}>{opt.title}</Text>
                </View>
                <Text style={styles.optionDescription}>{opt.description}</Text>
                <Text style={styles.optionCostText}>
                  It will cost only <Text style={styles.costHighlight}>৳ {opt.cost}</Text> to confirm.
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Proceed button */}
        <TouchableOpacity
          style={[styles.proceedButton, (!livestockId || isReserving) && { opacity: 0.6 }]}
          disabled={!livestockId || isReserving}
          onPress={async () => {
            if (!livestockId) return;
            try {
              await reserveListing({ id: livestockId, isReserved: true }).unwrap();
              const option = options.find((o) => o.id === selectedOption)!;
              router.push({ pathname: '/booking-payment', params: { id: String(livestockId), cost: option.cost } });
            } catch (err: any) {
              console.log('Error reserving listing:', err);
              Alert.alert('Booking Failed', err?.data?.message || 'Could not book this animal. Please try again.');
            }
          }}
          activeOpacity={0.85}
        >
          <Text style={styles.proceedIcon}>✓</Text>
          <Text style={styles.proceedText}>Proceed Booking</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tcButton} activeOpacity={0.7} onPress={() => router.push('/terms-of-service')}>
          <Text style={styles.tcText}>Terms & Conditions applicable</Text>
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
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1817',
    marginBottom: 12,
    marginTop: 8,
  },
  animalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E6E1DC',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  animalImage: {
    width: 90,
    height: 90,
    borderRadius: 16,
    marginRight: 14,
  },
  animalMeta: {
    flex: 1,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 12,
    color: '#9C9690',
    fontWeight: '500',
    width: 80,
  },
  detailValue: {
    fontSize: 12,
    color: '#1A1817',
    fontWeight: '700',
  },
  optionsList: {
    gap: 12,
    marginBottom: 24,
  },
  optionCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E1DC',
    borderRadius: 20,
    padding: 16,
  },
  optionCardActive: {
    borderColor: '#BD632F',
    borderWidth: 1.5,
  },
  optionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  radioOuterCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#BD632F',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  radioInnerCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#BD632F',
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1817',
  },
  optionDescription: {
    fontSize: 12,
    color: '#7C7672',
    lineHeight: 18,
    marginBottom: 8,
    paddingLeft: 30,
  },
  optionCostText: {
    fontSize: 12,
    color: '#1A1817',
    paddingLeft: 30,
  },
  costHighlight: {
    fontWeight: '700',
    color: '#BD632F',
  },
  proceedButton: {
    flexDirection: 'row',
    backgroundColor: '#BD632F',
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#BD632F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 16,
  },
  proceedIcon: {
    color: '#FFFFFF',
    fontSize: 14,
    marginRight: 6,
  },
  proceedText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  tcButton: {
    alignSelf: 'center',
  },
  tcText: {
    color: '#29B6F6',
    fontSize: 13,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
