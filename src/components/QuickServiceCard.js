import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';
import { typography } from '../constants/typography';
import { shadows } from '../constants/shadows';
import { useAnimatedPress } from '../hooks/useAnimatedPress';
import { categories } from '../constants/data';

const QuickServiceCard = memo(({ item, onPress }) => {
  const { scale, pressIn, pressOut } = useAnimatedPress(0.97);

  const categoryColor = colors.services[item.category] || colors.primary[500];
  const categoryData = categories.find(cat => cat.name === item.category);
  const hasCustomIcon = categoryData?.customIcon;

  return (
    <Animated.View style={[styles.container, { transform: [{ scale }] }]}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPressIn={pressIn}
        onPressOut={pressOut}
        onPress={onPress}
        style={styles.touchable}
      >
        <View style={[styles.iconContainer, { backgroundColor: categoryColor + '15' }]}>
          {hasCustomIcon && item.category === 'نجارة' ? (
            <Image source={categoryData.customIcon} style={styles.icon} />
          ) : (
            <Ionicons name={item.icon} size={24} color={categoryColor} />
          )}
        </View>
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={1}>
            {item.title}
          </Text>
          <View style={styles.meta}>
            <Ionicons name="time-outline" size={12} color={colors.gray[400]} />
            <Text style={styles.time}>{item.time}</Text>
            <Text style={styles.price}>{item.price}</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.gray[400]} />
      </TouchableOpacity>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginRight: spacing.md,
    width: 240,
  },
  touchable: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    borderRadius: spacing.radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray[100],
    ...shadows.sm,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: spacing.radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  icon: {
    width: 36,
    height: 36,
    resizeMode: 'contain',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xxs,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  time: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    marginLeft: spacing.xxs,
  },
  price: {
    fontSize: typography.fontSize.xs,
    color: colors.success,
    fontWeight: typography.fontWeight.medium,
  },
});

export default QuickServiceCard;
