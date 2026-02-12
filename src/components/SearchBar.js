import React, { memo, useState, useRef } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';
import { typography } from '../constants/typography';
import { shadows } from '../constants/shadows';

const SearchBar = memo(({ onSearch, placeholder = 'ابحث عن خدمة...' }) => {
  const [isFocused, setIsFocused] = useState(false);
  const focusAnim = useRef(new Animated.Value(0)).current;

  const handleFocus = () => {
    setIsFocused(true);
    Animated.timing(focusAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.timing(focusAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const borderColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.gray[200], colors.primary[500]],
  });

  return (
    <Animated.View style={[styles.container, { borderColor }]}>
      <Ionicons name="search-outline" size={18} color={colors.gray[400]} />
      <TextInput
        placeholder={placeholder}
        placeholderTextColor={colors.gray[400]}
        style={styles.input}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChangeText={onSearch}
        textAlign="right"
      />
      <TouchableOpacity style={styles.filterButton}>
        <Ionicons name="options-outline" size={18} color={colors.gray[600]} />
      </TouchableOpacity>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    marginHorizontal: spacing.screen.horizontal,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: spacing.radius.xl,
    borderWidth: 1,
    borderColor: colors.gray[200],
    ...shadows.xs,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: typography.fontSize.md,
    color: colors.text.primary,
    marginHorizontal: spacing.sm,
    textAlign: 'right',
  },
  filterButton: {
    padding: spacing.sm,
    backgroundColor: colors.gray[100],
    borderRadius: spacing.radius.lg,
  },
});

export default SearchBar;
