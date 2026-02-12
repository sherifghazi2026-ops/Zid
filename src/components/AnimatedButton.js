import React, { memo } from 'react';
import { Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';
import { typography } from '../constants/typography';
import { shadows } from '../constants/shadows';
import { useAnimatedPress } from '../hooks/useAnimatedPress';

const AnimatedButton = memo(({ title, icon, onPress, variant = 'primary', size = 'md' }) => {
  const { scale, pressIn, pressOut } = useAnimatedPress(0.95);

  const getBackgroundColor = () => {
    switch (variant) {
      case 'success':
        return colors.success;
      case 'primary':
        return colors.primary[600];
      default:
        return colors.primary[600];
    }
  };

  const getPadding = () => {
    switch (size) {
      case 'sm':
        return { paddingVertical: spacing.xs, paddingHorizontal: spacing.md };
      case 'md':
        return { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg };
      default:
        return { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg };
    }
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPressIn={pressIn}
        onPressOut={pressOut}
        onPress={onPress}
        style={[styles.button, { backgroundColor: getBackgroundColor() }, getPadding()]}
      >
        {icon && <Ionicons name={icon} size={16} color={colors.text.inverse} style={styles.icon} />}
        <Text style={styles.text}>{title}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: spacing.radius.full,
    ...shadows.xs,
  },
  icon: {
    marginRight: spacing.xs,
  },
  text: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.inverse,
  },
});

export default AnimatedButton;
