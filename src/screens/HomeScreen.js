import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';
import { typography } from '../constants/typography';
import { categories, quickServices } from '../constants/data';
import AnimatedHeader from '../components/AnimatedHeader';
import SearchBar from '../components/SearchBar';
import CategoryCard from '../components/CategoryCard';
import QuickServiceCard from '../components/QuickServiceCard';

const HomeScreen = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const scrollY = useRef(new Animated.Value(0)).current;

  const handleCategoryPress = useCallback(
    (category) => {
      navigation.navigate('Service', { category });
    },
    [navigation]
  );

  const handleQuickServicePress = useCallback(
    (service) => {
      const category = categories.find((cat) => cat.name === service.category);
      if (category) navigation.navigate('Service', { category });
    },
    [navigation]
  );

  const filteredCategories = categories; // We'll keep it simple, no filter for now

  const renderCategory = useCallback(
    ({ item, index }) => (
      <CategoryCard item={item} index={index} onPress={handleCategoryPress} />
    ),
    [handleCategoryPress]
  );

  const renderQuickService = useCallback(
    ({ item }) => (
      <QuickServiceCard item={item} onPress={() => handleQuickServicePress(item)} />
    ),
    [handleQuickServicePress]
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar backgroundColor="transparent" barStyle="dark-content" translucent />
      <AnimatedHeader />
      <SearchBar onSearch={setSearchQuery} />

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Quick Services Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>خدمات سريعة</Text>
            <TouchableOpacity>
              <Text style={styles.seeAll}>عرض الكل</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={quickServices}
            renderItem={renderQuickService}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickServicesList}
          />
        </View>

        {/* All Categories Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>جميع الخدمات</Text>
            <TouchableOpacity>
              <Text style={styles.seeAll}>الكل</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.categoriesGrid}>
            {filteredCategories.map((item, index) => (
              <CategoryCard key={item.id} item={item} index={index} onPress={handleCategoryPress} />
            ))}
          </View>
        </View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  scrollContent: {
    paddingBottom: spacing.xxxl,
  },
  section: {
    marginTop: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.screen.horizontal,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  seeAll: {
    fontSize: typography.fontSize.sm,
    color: colors.primary[600],
    fontWeight: typography.fontWeight.semibold,
  },
  quickServicesList: {
    paddingHorizontal: spacing.screen.horizontal,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screen.horizontal,
  },
});

export default HomeScreen;
