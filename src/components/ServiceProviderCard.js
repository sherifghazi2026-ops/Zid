import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';
import { typography } from '../constants/typography';
import { shadows } from '../constants/shadows';
import AnimatedButton from './AnimatedButton';

const ServiceProviderCard = memo(({ provider, onCall, onWhatsApp, index, fadeAnim }) => {
  return (
    <Animated.View
      style={[
        styles.card,
        {
          opacity: fadeAnim,
          transform: [
            {
              translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              }),
            },
          ],
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.providerInfo}>
          <Text style={styles.name}>{provider.name}</Text>
          <View style={styles.rating}>
            <Ionicons name="star" size={14} color={colors.warning} />
            <Text style={styles.ratingText}>{provider.rating}</Text>
            <Text style={styles.experience}>• {provider.experience}</Text>
          </View>
        </View>
      </View>
      <View style={styles.actions}>
        <AnimatedButton
          title="اتصال"
          icon="call-outline"
          onPress={() => onCall(provider.phone)}
          variant="success"
          size="sm"
        />
        <AnimatedButton
          title="واتساب"
          icon="logo-whatsapp"
          onPress={() => onWhatsApp(provider.phone)}
          variant="primary"
          size="sm"
        />
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.primary,
    borderRadius: spacing.radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray[100],
    ...shadows.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  providerInfo: {
    flex: 1,
  },
  name: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xxs,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginLeft: spacing.xxs,
    marginRight: spacing.sm,
  },
  experience: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
});

export default ServiceProviderCard;
