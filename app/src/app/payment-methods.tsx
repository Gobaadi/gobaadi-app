import React from 'react';
import { useRequireDoctor } from '@/hooks/use-require-doctor';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import {
  useGetPaymentMethodsQuery,
  useSetDefaultPaymentMethodMutation,
  useRemovePaymentMethodMutation,
} from '@/store/paymentMethodsApi';

const PROVIDER_ICONS: Record<string, { icon: string; bg: string; color: string }> = {
  bkash: { icon: 'paper-plane', bg: '#E53935', color: '#FFFFFF' },
  nagad: { icon: 'wallet', bg: '#FF9800', color: '#FFFFFF' },
  upay: { icon: 'phone-portrait', bg: '#4CAF50', color: '#FFFFFF' },
  rocket: { icon: 'rocket', bg: '#7B1FA2', color: '#FFFFFF' },
  visa: { icon: 'card', bg: '#1A237E', color: '#FFFFFF' },
  mastercard: { icon: 'card', bg: '#E53935', color: '#FFFFFF' },
  stripe: { icon: 'card', bg: '#635BFF', color: '#FFFFFF' },
  paypal: { icon: 'logo-paypal', bg: '#003087', color: '#FFFFFF' },
};

function getProviderConfig(type: string, provider: string) {
  const key = provider?.toLowerCase() || type?.toLowerCase() || '';
  return PROVIDER_ICONS[key] || { icon: 'card', bg: '#9C9690', color: '#FFFFFF' };
}

export default function PaymentMethodsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const isDoctor = useRequireDoctor();
  if (!isDoctor) return null;

  const { data: methods, isLoading, isError } = useGetPaymentMethodsQuery();
  const [setDefault] = useSetDefaultPaymentMethodMutation();
  const [removeMethod] = useRemovePaymentMethodMutation();

  const handleSetDefault = async (id: number) => {
    try {
      await setDefault(id).unwrap();
    } catch {
      Alert.alert(t('paymentMethods.alerts.error'), t('paymentMethods.alerts.setDefaultFailed'));
    }
  };

  const handleRemove = (id: number) => {
    Alert.alert(t('paymentMethods.alerts.removeTitle'), t('paymentMethods.alerts.removeConfirm'), [
      { text: t('paymentMethods.alerts.cancel'), style: 'cancel' },
      {
        text: t('paymentMethods.alerts.remove'),
        style: 'destructive',
        onPress: async () => {
          try {
            await removeMethod(id).unwrap();
          } catch {
            Alert.alert(t('paymentMethods.alerts.error'), t('paymentMethods.alerts.removeFailed'));
          }
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('paymentMethods.title')}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#BD632F" />
        </View>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('paymentMethods.title')}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Ionicons name="cloud-offline-outline" size={48} color="#9C9690" />
          <Text style={styles.errorText}>{t('paymentMethods.loadFailed')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('paymentMethods.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {!methods || methods.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="card-outline" size={48} color="#9C9690" />
            <Text style={styles.emptyText}>{t('paymentMethods.empty')}</Text>
          </View>
        ) : (
          methods.map((method) => {
            const config = getProviderConfig(method.type, method.provider);
            return (
              <TouchableOpacity
                key={method.id}
                style={[styles.methodCard, method.isDefault && styles.methodCardDefault]}
                onLongPress={() => {
                  const options = [];
                  if (!method.isDefault) options.push({ text: t('paymentMethods.setAsDefault'), onPress: () => handleSetDefault(method.id) });
                  options.push({ text: t('paymentMethods.alerts.remove'), style: 'destructive' as const, onPress: () => handleRemove(method.id) });
                  options.push({ text: t('paymentMethods.alerts.cancel'), style: 'cancel' as const });
                  Alert.alert(t('paymentMethods.title'), method.provider || method.type, options);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.methodLeft}>
                  <View style={[styles.methodIcon, { backgroundColor: config.bg }]}>
                    <Ionicons name={config.icon as any} size={18} color={config.color} />
                  </View>
                  <View style={styles.methodInfo}>
                    <View style={styles.methodTypeRow}>
                      <Text style={styles.methodType}>{method.provider || method.type}</Text>
                      {method.isDefault && (
                        <View style={styles.defaultBadge}>
                          <Text style={styles.defaultText}>{t('paymentMethods.defaultBadge')}</Text>
                        </View>
                      )}
                      {method.isVerified && (
                        <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
                      )}
                    </View>
                    <Text style={styles.methodLabel}>{method.type}</Text>
                    <Text style={styles.methodDetail}>{method.maskedNumber}</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.menuBtn} activeOpacity={0.7}>
                  <Ionicons name="ellipsis-vertical" size={16} color="#9C9690" />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })
        )}

        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/add-payment-method')}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={styles.addBtnText}>{t('paymentMethods.addAccount')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF9F6' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#BD632F', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1A1817' },
  scrollContainer: { paddingHorizontal: 20, paddingBottom: 100 },
  methodCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1.5, borderColor: '#E6E1DC', padding: 14, marginBottom: 10 },
  methodCardDefault: { borderColor: '#BD632F', backgroundColor: '#FFF8F4' },
  methodLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  methodIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  methodInfo: { flex: 1 },
  methodTypeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  methodType: { fontSize: 14, fontWeight: '700', color: '#1A1817' },
  defaultBadge: { backgroundColor: '#FFF2EB', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  defaultText: { fontSize: 10, fontWeight: '700', color: '#BD632F' },
  methodLabel: { fontSize: 12, fontWeight: '500', color: '#7C7672', marginBottom: 1 },
  methodDetail: { fontSize: 12, fontWeight: '500', color: '#9C9690' },
  menuBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  addBtn: { flexDirection: 'row', backgroundColor: '#BD632F', borderRadius: 26, paddingVertical: 16, justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 10 },
  addBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  errorText: { fontSize: 14, fontWeight: '500', color: '#9C9690' },
  emptyContainer: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 14, fontWeight: '500', color: '#9C9690' },
});
