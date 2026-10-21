import React from 'react';
import { useRequireDoctor } from '@/hooks/use-require-doctor';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SvgXml } from 'react-native-svg';
import {
  useGetDiscountForPatientQuery,
  useRemoveDiscountMutation,
} from '@/store/discountsApi';
import { PatientAvatar } from '@/components/patient-avatar';
import { RegistrationBackground } from '@/components/registration-background';
import { backButtonSvg, removeDiscountDeleteSvg, discountDetailsMessageSvg } from '@/components/icons/svg-icon-sources';

export default function RemoveDiscountScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const isDoctor = useRequireDoctor();
  const params = useLocalSearchParams<{
    patientId?: string;
    patientName?: string;
    ownerName?: string;
    patientImage?: string;
    percent?: string;
  }>();

  const patientId = params.patientId || '';
  const patientName = params.patientName || t('removeDiscount.defaults.patient');
  const ownerName = params.ownerName || t('removeDiscount.defaults.owner');
  const patientImage = params.patientImage || '';
  const percent = params.percent || '0';

  const { data: existingDiscount, isLoading } = useGetDiscountForPatientQuery(patientId, {
    skip: !patientId,
  });
  const [removeDiscount, { isLoading: removing }] = useRemoveDiscountMutation();

  if (!isDoctor) return null;

  const handleRemove = async () => {
    if (!existingDiscount) return;
    try {
      await removeDiscount(existingDiscount.id).unwrap();
      router.replace('/apply-discount');
    } catch {
      Alert.alert(t('removeDiscount.alerts.error'), t('removeDiscount.alerts.removeFailed'));
    }
  };

  const handleCancel = () => router.back();

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <RegistrationBackground />
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} style={styles.backBtn} activeOpacity={0.7}>
            <SvgXml width={20} height={20} xml={backButtonSvg} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('removeDiscount.title')}</Text>
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
        <TouchableOpacity onPress={handleCancel} style={styles.backBtn} activeOpacity={0.7}>
          <SvgXml width={20} height={20} xml={backButtonSvg} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('removeDiscount.title')}</Text>
      </View>

      <View style={styles.patientCard}>
        <View style={styles.patientAvatarWrap}>
          <PatientAvatar name={patientName} image={patientImage} size={48} radius={14} />
          <View style={styles.patientAvatarBadge}>
            <SvgXml width={18} height={18} xml={discountDetailsMessageSvg} />
          </View>
        </View>
        <View style={styles.patientInfo}>
          <Text style={styles.patientName}>{patientName}</Text>
          <View style={styles.patientOwner}>
            <Text style={styles.patientOwnerLabel}>{t('removeDiscount.ownerLabel')}</Text>
            <Text style={styles.patientOwnerName}>: {ownerName}</Text>
          </View>
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.deleteCircle}>
          <SvgXml width={72} height={72} xml={removeDiscountDeleteSvg} />
        </View>
        <Text style={styles.bodyTitle}>{t('removeDiscount.bodyTitle')}</Text>
        <Text style={styles.bodyText}>
          {t('removeDiscount.bodyText', { percent, name: patientName })}
        </Text>
      </View>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.removeBtn, (removing || !existingDiscount) && { opacity: 0.6 }]}
          onPress={handleRemove}
          activeOpacity={0.85}
          disabled={removing || !existingDiscount}
        >
          {removing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.removeBtnText}>{t('removeDiscount.removeBtn')}</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} activeOpacity={0.85}>
          <Text style={styles.cancelBtnText}>{t('removeDiscount.cancel')}</Text>
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
    flex: 1,
    minWidth: 0,
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1817',
  },
  patientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 20,
    backgroundColor: '#FFF2EB',
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
  },
  patientAvatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
  },
  patientAvatarBadge: {
    position: 'absolute',
    bottom: -2,
    left: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
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
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  patientOwnerLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#BD632F',
  },
  patientOwnerName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1A1817',
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 20,
  },
  deleteCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#FBE9E7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  bodyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1817',
    marginBottom: 8,
    textAlign: 'center',
  },
  bodyText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#7C7672',
    lineHeight: 20,
    textAlign: 'center',
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 30,
    gap: 10,
  },
  removeBtn: {
    height: 52,
    borderRadius: 26,
    backgroundColor: '#E74C3C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelBtn: {
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: '#E6E1DC',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#1A1817',
    fontSize: 16,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
