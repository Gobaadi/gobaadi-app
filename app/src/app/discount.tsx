import React, { useState, useMemo } from 'react';
import { useRequireDoctor } from '@/hooks/use-require-doctor';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { SvgXml } from 'react-native-svg';
import {
  useGetDiscountForPatientQuery,
  useEditDiscountMutation,
  useCreateDiscountMutation,
} from '@/store/discountsApi';
import { useGetDashboardStatsQuery, useGetDoctorBookingsQuery } from '@/store/doctorPortalApi';
import { getLastAppointmentText } from '@/utils/last-appointment';
import { PatientAvatar } from '@/components/patient-avatar';
import { RegistrationBackground } from '@/components/registration-background';
import {
  backButtonSvg,
  discountDetailsCallSvg,
  discountDetailsMessageSvg,
  discountDetailsMessageSquareSvg,
  discountDetailsPercentageSvg,
} from '@/components/icons/svg-icon-sources';

const QUICK_DISCOUNTS = [5, 10, 15, 20];

export default function DiscountScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const isDoctor = useRequireDoctor();
  const params = useLocalSearchParams<{
    patientId?: string;
    patientName?: string;
    ownerName?: string;
    patientImage?: string;
    existingDiscount?: string;
  }>();

  const patientId = params.patientId || '';
  const patientName = params.patientName || t('discount.patient');
  const ownerName = params.ownerName || t('discount.owner');
  const patientImage = params.patientImage || '';

  const { data: dashboardStats } = useGetDashboardStatsQuery();
  const { data: bookings = [] } = useGetDoctorBookingsQuery(undefined, {
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });

  const { data: existingDiscount, isLoading: discountLoading } = useGetDiscountForPatientQuery(
    patientId,
    { skip: !patientId }
  );
  const [editDiscount, { isLoading: saving }] = useEditDiscountMutation();
  const [createDiscount, { isLoading: creating }] = useCreateDiscountMutation();

  const initialPercent = existingDiscount?.percent || 0;
  const [selectedDiscount, setSelectedDiscount] = useState<number>(
    QUICK_DISCOUNTS.includes(initialPercent) ? initialPercent : 0
  );
  const [customDiscount, setCustomDiscount] = useState(
    initialPercent > 0 && !QUICK_DISCOUNTS.includes(initialPercent) ? initialPercent.toString() : ''
  );
  const [isEditing, setIsEditing] = useState(false);

  const discountPercent = selectedDiscount || (customDiscount ? parseInt(customDiscount, 10) : 0);
  const appointmentFee = dashboardStats?.consultationFee ?? 1000;
  const discountAmount = useMemo(() => {
    return Math.round(appointmentFee * (discountPercent / 100));
  }, [discountPercent, appointmentFee]);
  const patientPays = appointmentFee - discountAmount;
  const hasDiscount = discountPercent > 0;
  const hasExisting = !!existingDiscount;
  const lastAppointmentText = getLastAppointmentText(bookings, parseInt(patientId, 10) || 0);

  if (!isDoctor) return null;

  const handleQuickDiscount = (percent: number) => {
    setSelectedDiscount(percent);
    setCustomDiscount('');
    if (hasExisting) setIsEditing(true);
  };

  const handleCustomDiscount = (text: string) => {
    const numeric = text.replace(/[^0-9]/g, '');
    if (numeric === '' || parseInt(numeric, 10) <= 100) {
      setCustomDiscount(numeric);
      setSelectedDiscount(0);
      if (hasExisting) setIsEditing(true);
    }
  };

  const handleSave = async () => {
    if (!hasDiscount) return;
    try {
      if (existingDiscount) {
        await editDiscount({
          id: existingDiscount.id,
          data: { percent: discountPercent },
        }).unwrap();
        setIsEditing(false);
        Alert.alert(t('discount.alerts.successTitle'), t('discount.alerts.updated'), [
          { text: t('discount.alerts.ok'), onPress: () => router.back() },
        ]);
      } else {
        await createDiscount({
          patientId: parseInt(patientId, 10) || 0,
          percent: discountPercent,
        }).unwrap();
        Alert.alert(t('discount.alerts.successTitle'), t('discount.alerts.created'), [
          { text: t('discount.alerts.ok'), onPress: () => router.back() },
        ]);
      }
    } catch {
      Alert.alert(
        t('discount.alerts.errorTitle'),
        existingDiscount ? t('discount.alerts.updateFailed') : t('discount.alerts.createFailed'),
      );
    }
  };

  const handleRemove = () => {
    if (!existingDiscount) return;
    router.push({
      pathname: '/remove-discount',
      params: {
        patientId,
        patientName,
        ownerName,
        patientImage,
        percent: existingDiscount.percent.toString(),
      },
    });
  };

  if (discountLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <RegistrationBackground />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <SvgXml width={20} height={20} xml={backButtonSvg} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('discount.title')}</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#BD632F" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <RegistrationBackground />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <SvgXml width={20} height={20} xml={backButtonSvg} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('discount.title')}</Text>
      </View>

      <KeyboardAwareScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.patientCard}>
          <View style={styles.patientAvatarWrap}>
            <PatientAvatar name={patientName} image={patientImage} size={56} />
            <View style={styles.patientAvatarBadge}>
              <SvgXml width={20} height={20} xml={discountDetailsMessageSvg} />
            </View>
          </View>
          <View style={styles.patientInfo}>
            <Text style={styles.patientName}>{patientName}</Text>
            <Text style={styles.patientOwner}>{t('discount.ownerLabel', { name: ownerName })}</Text>
          </View>
          <View style={styles.contactIcons}>
            <TouchableOpacity style={styles.contactBtn} activeOpacity={0.7}>
              <SvgXml width={24} height={24} xml={discountDetailsCallSvg} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.contactBtn} activeOpacity={0.7}>
              <SvgXml width={26} height={26} xml={discountDetailsMessageSquareSvg} />
            </TouchableOpacity>
          </View>
        </View>

        {lastAppointmentText ? (
          <Text style={styles.lastAppointment}>{t('discount.lastAppointment', { time: lastAppointmentText })}</Text>
        ) : (
          <View style={{ height: 20 }} />
        )}

        <View style={styles.priceCard}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>{t('discount.appointmentFee')}</Text>
            <Text style={styles.priceValue}>৳ {appointmentFee.toLocaleString()}</Text>
          </View>
          <View style={styles.priceDividerDashed} />
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>{t('discount.discountLabel', { percent: discountPercent })}</Text>
            <Text style={styles.priceValue}>৳ {discountAmount.toLocaleString()}</Text>
          </View>
          <View style={styles.priceDividerDashed} />
          <View style={styles.priceRow}>
            <Text style={styles.totalLabel}>{t('discount.patientWillPay')}</Text>
            <Text style={styles.totalValue}>৳ {patientPays.toLocaleString()}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>{t('discount.quickDiscount')}</Text>
        <View style={styles.quickDiscountRow}>
          {QUICK_DISCOUNTS.map((percent) => (
            <TouchableOpacity
              key={percent}
              style={[
                styles.quickDiscountBtn,
                selectedDiscount === percent && styles.quickDiscountBtnActive,
              ]}
              onPress={() => handleQuickDiscount(percent)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.quickDiscountText,
                  selectedDiscount === percent && styles.quickDiscountTextActive,
                ]}
              >
                {percent}%
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>{t('discount.customDiscount')}</Text>
        <View style={styles.customInputContainer}>
          <TextInput
            style={styles.customInput}
            placeholder={t('discount.placeholder')}
            placeholderTextColor="#A39E99"
            keyboardType="numeric"
            value={customDiscount}
            onChangeText={handleCustomDiscount}
          />
          <View style={styles.customInputIcon}>
            <SvgXml width={40} height={40} xml={discountDetailsPercentageSvg} />
          </View>
        </View>

        {hasExisting && (
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle-outline" size={20} color="#BD632F" />
            <Text style={styles.infoText}>
              {t('discount.infoBanner')}
            </Text>
          </View>
        )}
        </KeyboardAwareScrollView>

      <View style={styles.bottomBar}>
        {hasExisting && !isEditing ? (
          <View style={styles.removeBtnRow}>
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => setIsEditing(true)}
              activeOpacity={0.85}
            >
              <Text style={styles.editBtnText}>{t('discount.editDiscount')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.removeBtn}
              onPress={handleRemove}
              activeOpacity={0.85}
            >
              <Text style={styles.removeBtnText}>{t('discount.removeDiscount')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.continueBtn, (!hasDiscount || saving || creating) && styles.continueBtnDisabled]}
            onPress={handleSave}
            activeOpacity={0.85}
            disabled={!hasDiscount || saving || creating}
          >
            {saving || creating ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.continueBtnText}>
                {hasExisting ? t('discount.saveChanges') : t('discount.continue')}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>
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
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 12,
    gap: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#BD632F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1817',
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  patientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  patientAvatarWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  patientAvatarBadge: {
    position: 'absolute',
    bottom: -2,
    left: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1817',
  },
  patientOwner: {
    fontSize: 13,
    fontWeight: '500',
    color: '#7C7672',
    marginTop: 2,
  },
  contactIcons: {
    flexDirection: 'row',
    gap: 8,
  },
  contactBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lastAppointment: {
    fontSize: 13,
    fontWeight: '500',
    color: '#7C7672',
    marginBottom: 20,
  },
  priceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E6E1DC',
    padding: 16,
    marginBottom: 24,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  priceDividerDashed: {
    borderBottomWidth: 1,
    borderBottomColor: '#E6E1DC',
    borderStyle: 'dashed',
    marginVertical: 4,
  },
  priceLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#7C7672',
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1817',
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1817',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1817',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1817',
    marginBottom: 12,
  },
  quickDiscountRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  quickDiscountBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E6E1DC',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  quickDiscountBtnActive: {
    borderColor: '#BD632F',
    backgroundColor: '#BD632F',
  },
  quickDiscountText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#7C7672',
  },
  quickDiscountTextActive: {
    color: '#FFFFFF',
  },
  customInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E6E1DC',
    overflow: 'hidden',
    marginBottom: 20,
  },
  customInput: {
    flex: 1,
    height: 52,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#1A1817',
  },
  customInputIcon: {
    width: 52,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: '#FFF2EB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#7C7672',
    lineHeight: 18,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 30,
  },
  continueBtn: {
    backgroundColor: '#BD632F',
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueBtnDisabled: {
    backgroundColor: '#E6E1DC',
  },
  continueBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  removeBtnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  editBtn: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: '#E6E1DC',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBtnText: {
    color: '#1A1817',
    fontSize: 16,
    fontWeight: '700',
  },
  removeBtn: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: '#E74C3C',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeBtnText: {
    color: '#E74C3C',
    fontSize: 16,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
