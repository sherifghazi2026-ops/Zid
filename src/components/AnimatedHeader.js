import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';
import { typography } from '../constants/typography';
import { shadows } from '../constants/shadows';

const AnimatedHeader = memo(() => {
  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.greeting}>Zayed-ID</Text>
        <View style={styles.locationContainer}>
          <Ionicons name="location-outline" size={16} color={colors.primary[500]} />
          <Text style={styles.location}>الشيخ زايد</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.profileButton}>
        <Ionicons name="person-circle-outline" size={40} color={colors.primary[600]} />
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.screen.horizontal,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    backgroundColor: colors.background.primary,
  },
  greeting: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  location: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginLeft: spacing.xxs,
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: spacing.radius.full,
    backgroundColor: colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.xs,
  },
});

export default AnimatedHeader;
