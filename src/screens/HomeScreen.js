import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Dimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';
import { typography } from '../constants/typography';
import { categories, quickServices } from '../constants/data';
import AIAssistantButton from '../components/AIAssistantButton';
import * as Location from 'expo-location';

const { width } = Dimensions.get('window');
const CARD_SIZE = (width - spacing.screen.horizontal * 2 - spacing.md) / 2;

export default function HomeScreen({ navigation }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [userLocation, setUserLocation] = useState(null);

  useFocusEffect(
    useCallback(() => {
      StatusBar.setBackgroundColor('transparent');
      StatusBar.setBarStyle('dark-content');
      StatusBar.setTranslucent(true);
      
      // جلب موقع المستخدم
      (async () => {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({});
          setUserLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude
          });
        }
      })();
    }, [])
  );

  const handleCategoryPress = (category) => {
    navigation.navigate('Service', { category });
  };

  const handleQuickServicePress = (service) => {
    const category = categories.find((cat) => cat.name === service.category);
    if (category) navigation.navigate('Service', { category });
  };

  const renderCategory = ({ item }) => (
    <TouchableOpacity
      style={[styles.categoryCard, { width: CARD_SIZE }]}
      onPress={() => handleCategoryPress(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.categoryIcon, { backgroundColor: colors.services[item.colorKey] + '15' }]}>
        {item.customIcon ? (
          <Image source={item.customIcon} style={styles.categoryImage} />
        ) : (
          <Ionicons name={item.icon} size={32} color={colors.services[item.colorKey]} />
        )}
      </View>
      <Text style={styles.categoryName}>{item.name}</Text>
    </TouchableOpacity>
  );

  const renderQuickService = ({ item }) => (
    <TouchableOpacity
      style={styles.quickServiceCard}
      onPress={() => handleQuickServicePress(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.quickServiceIcon, { backgroundColor: colors.services[item.category] + '15' }]}>
        <Ionicons name={item.icon} size={24} color={colors.services[item.category]} />
      </View>
      <View style={styles.quickServiceInfo}>
        <Text style={styles.quickServiceTitle}>{item.title}</Text>
        <View style={styles.quickServiceMeta}>
          <Ionicons name="time-outline" size={12} color="#6B7280" />
          <Text style={styles.quickServiceTime}>{item.time}</Text>
          <Text style={styles.quickServicePrice}>{item.price}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const filteredCategories = categories;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar backgroundColor="transparent" barStyle="dark-content" translucent />

      {/* Header بسيط */}
      <View style={styles.header}>
        <Text style={styles.greeting}>مرحباً بك 👋</Text>
        <Text style={styles.location}>الشيخ زايد</Text>
      </View>

      {/* Search Bar */}
      <TouchableOpacity style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color="#9CA3AF" />
        <Text style={styles.searchText}>ابحث عن خدمة</Text>
      </TouchableOpacity>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Quick Services */}
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

        {/* All Categories */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>جميع الخدمات</Text>
            <TouchableOpacity>
              <Text style={styles.seeAll}>الكل</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.categoriesGrid}>
            {filteredCategories.map((item) => (
              <React.Fragment key={item.id}>
                {renderCategory({ item })}
              </React.Fragment>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* AI Assistant Button */}
      <AIAssistantButton userLocation={userLocation} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 5,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  location: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    marginHorizontal: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginLeft: 8,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  seeAll: {
    fontSize: 14,
    color: '#4F46E5',
    fontWeight: '500',
  },
  quickServicesList: {
    paddingHorizontal: 20,
  },
  quickServiceCard: {
    width: 240,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 12,
    marginRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  quickServiceIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  quickServiceInfo: {
    flex: 1,
  },
  quickServiceTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  quickServiceMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickServiceTime: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 2,
  },
  quickServicePrice: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
    marginLeft: 8,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  categoryCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  categoryIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryImage: {
    width: 48,
    height: 48,
    resizeMode: 'contain',
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
  },
});
