import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Linking, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';
import { typography } from '../constants/typography';
import { shadows } from '../constants/shadows';
import { serviceProviders, categories } from '../constants/data';
import ServiceProviderCard from '../components/ServiceProviderCard';
import { useFadeIn } from '../hooks/useFadeIn';

const ServiceScreen = ({ route, navigation }) => {
  const { category } = route.params;
  const fadeAnim = useFadeIn(600);
  
  const providers = useMemo(() => serviceProviders[category.name] || [], [category.name]);
  const categoryData = useMemo(() => categories.find(c => c.name === category.name), [category.name]);

  const makeCall = useCallback((phone) => {
    Linking.openURL(`tel:${phone}`);
  }, []);

  const openWhatsApp = useCallback((phone) => {
    Linking.openURL(`whatsapp://send?phone=+2${phone}`).catch(() => {
      Alert.alert('خطأ', 'الرجاء تثبيت واتساب أولاً');
    });
  }, []);

  React.useEffect(() => {
    navigation.setOptions({
      title: category.name,
    });
  }, [navigation, category.name]);

  const categoryColor = colors.services[category.name] || colors.primary[500];
  const hasCustomIcon = categoryData?.customIcon;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={[styles.header, { backgroundColor: categoryColor + '10' }]}>
        <View style={[styles.iconContainer, { backgroundColor: categoryColor + '20' }]}>
          {hasCustomIcon ? (
            <Image source={categoryData.customIcon} style={styles.customIcon} />
          ) : (
            <Ionicons name={category.icon} size={40} color={categoryColor} />
          )}
        </View>
        <Text style={styles.headerTitle}>{category.name}</Text>
        <Text style={styles.headerDesc}>{category.description}</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>مقدمي الخدمة</Text>
        {providers.length > 0 ? (
          providers.map((provider, index) => (
            <ServiceProviderCard
              key={provider.id}
              provider={provider}
              index={index}
              fadeAnim={fadeAnim}
              onCall={makeCall}
              onWhatsApp={openWhatsApp}
            />
          ))
        ) : (
          <View style={styles.empty}>
            <Ionicons name="sad-outline" size={48} color={colors.gray[300]} />
            <Text style={styles.emptyText}>لا يوجد مقدمي خدمة حالياً</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  contentContainer: {
    paddingBottom: spacing.xxxl,
  },
  header: {
    padding: spacing.xxxl,
    alignItems: 'center',
    borderBottomLeftRadius: spacing.radius.xxl,
    borderBottomRightRadius: spacing.radius.xxl,
    ...shadows.sm,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: spacing.radius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  customIcon: {
    width: 48,
    height: 48,
    resizeMode: 'contain',
  },
  headerTitle: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  headerDesc: {
    fontSize: typography.fontSize.md,
    color: colors.text.secondary,
  },
  content: {
    padding: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.lg,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl,
  },
  emptyText: {
    fontSize: typography.fontSize.md,
    color: colors.text.tertiary,
    marginTop: spacing.md,
  },
});

export default ServiceScreen;
