import React, { memo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';
import { typography } from '../constants/typography';
import { shadows } from '../constants/shadows';
import { useAnimatedPress } from '../hooks/useAnimatedPress';

const { width } = Dimensions.get('window');
const CARD_SIZE = (width - spacing.screen.horizontal * 2 - spacing.md) / 2;

const CategoryCard = memo(({ item, index, onPress }) => {
  const { scale, pressIn, pressOut } = useAnimatedPress(0.96);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 50,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 400,
        delay: index * 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const categoryColor = colors.services[item.colorKey] || colors.primary[500];
  const isWoodIcon = item.name === 'نجارة' && item.customIcon;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          width: CARD_SIZE,
          opacity: fadeAnim,
          transform: [{ translateY }, { scale }],
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPressIn={pressIn}
        onPressOut={pressOut}
        onPress={() => onPress(item)}
        style={styles.touchable}
      >
        <View style={[styles.iconContainer, { backgroundColor: categoryColor + '15' }]}>
          {isWoodIcon ? (
            <Image source={item.customIcon} style={styles.icon} />
          ) : (
            <Ionicons name={item.icon} size={32} color={categoryColor} />
          )}
        </View>
        <Text style={styles.title} numberOfLines={1}>
          {item.name}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  touchable: {
    backgroundColor: colors.background.primary,
    borderRadius: spacing.radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.gray[100],
    ...shadows.sm,
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: spacing.radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  icon: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
  },
  title: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    textAlign: 'center',
  },
});

export default CategoryCard;
