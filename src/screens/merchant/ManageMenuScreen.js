import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Image,
  Modal,
  TextInput,
  Switch,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getMenuItemsByRestaurant,
  createMenuItem,
  deleteMenuItem,
  toggleItemAvailability,
  updateMenuItem,
} from '../../services/menuService';
import { uploadMenuItemImage } from '../../services/uploadService';

const CATEGORY_SUGGESTIONS = ['مقبلات', 'أطباق رئيسية', 'مشاوي', 'مأكولات بحرية', 'بيتزا', 'باستا', 'برجر', 'سندوتشات', 'شوربة', 'سلطات', 'حلويات', 'مشروبات', 'فطور', 'أخرى'];
const UNIT_SUGGESTIONS = ['قطعة', 'طبق', 'كيلو', 'جرام', 'لتر', 'حصة', 'علبة', 'صحن', 'كوب', 'ملعقة'];

export default function ManageMenuScreen({ navigation }) {
  const [menuItems, setMenuItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [restaurantId, setRestaurantId] = useState(null);
  const [restaurantName, setRestaurantName] = useState('');
  const [merchantData, setMerchantData] = useState(null);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);

  const [itemName, setItemName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [offerPrice, setOfferPrice] = useState('');
  const [hasOffer, setHasOffer] = useState(false);
  const [category, setCategory] = useState('');
  const [unit, setUnit] = useState('');
  const [spicyLevel, setSpicyLevel] = useState(0);
  const [image, setImage] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);
  const [ingredients, setIngredients] = useState([]);
  const [currentIngredient, setCurrentIngredient] = useState('');
  const [options, setOptions] = useState([]);
  const [currentOption, setCurrentOption] = useState({ name: '', price: '' });

  useEffect(() => {
    loadMerchantData();
  }, []);

  useEffect(() => {
    filterItems();
  }, [menuItems, selectedCategory, searchQuery]);

  const loadMerchantData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await AsyncStorage.getItem('userData');
      if (!data) {
        setError('لا توجد بيانات مستخدم');
        setLoading(false);
        return;
      }

      const parsed = JSON.parse(data);
      setMerchantData(parsed);

      if (parsed.placeId) {
        setRestaurantId(parsed.placeId);
        setRestaurantName(parsed.placeName || 'مطعم');
        await loadMenuItems(parsed.placeId);
      } else {
        setError('لا يوجد مطعم مرتبط بحسابك');
      }
    } catch (error) {
      setError('حدث خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const loadMenuItems = async (placeId) => {
    try {
      const result = await getMenuItemsByRestaurant(placeId);
      if (result.success) {
        setMenuItems(result.data);
        setFilteredItems(result.data);
      }
    } catch (error) {
      setMenuItems([]);
      setFilteredItems([]);
    } finally {
      setRefreshing(false);
    }
  };

  const filterItems = () => {
    let filtered = menuItems;
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }
    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    setFilteredItems(filtered);
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('خطأ', 'يجب السماح بالوصول للمعرض');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('خطأ', 'فشل في اختيار الصورة');
    }
  };

  const addIngredient = () => {
    if (currentIngredient.trim()) {
      setIngredients([...ingredients, currentIngredient.trim()]);
      setCurrentIngredient('');
    }
  };

  const removeIngredient = (index) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const addOption = () => {
    if (currentOption.name.trim() && currentOption.price) {
      setOptions([...options, { ...currentOption, price: parseFloat(currentOption.price) }]);
      setCurrentOption({ name: '', price: '' });
    }
  };

  const removeOption = (index) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setItemName('');
    setDescription('');
    setPrice('');
    setOfferPrice('');
    setHasOffer(false);
    setCategory('');
    setUnit('');
    setSpicyLevel(0);
    setImage(null);
    setImageUrl('');
    setIsAvailable(true);
    setIngredients([]);
    setOptions([]);
    setCurrentIngredient('');
    setCurrentOption({ name: '', price: '' });
  };

  const handleAddItem = async () => {
    if (!itemName.trim()) {
      Alert.alert('تنبيه', 'اسم الصنف مطلوب');
      return;
    }

    if (!price.trim() || isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
      Alert.alert('تنبيه', 'السعر يجب أن يكون رقماً صحيحاً');
      return;
    }

    if (!restaurantId) {
      Alert.alert('تنبيه', 'لا يوجد مطعم مرتبط');
      return;
    }

    setSubmitting(true);
    try {
      let finalImageUrl = null;
      if (image) {
        setUploading(true);
        const uploadResult = await uploadMenuItemImage(image, restaurantName);
        setUploading(false);
        if (uploadResult.success) {
          finalImageUrl = uploadResult.fileUrl;
        }
      }

      const itemData = {
        itemName: itemName.trim(),
        description: description.trim() || null,
        price: parseFloat(price),
        offerPrice: hasOffer && offerPrice ? parseFloat(offerPrice) : null,
        category: category.trim() || null,
        unit: unit.trim() || null,
        spicyLevel: spicyLevel || 0,
        imageUrl: finalImageUrl,
        isAvailable,
        ingredients: ingredients.length ? ingredients : null,
        options: options.length ? options : null,
        restaurantId: restaurantId,
      };

      const result = await createMenuItem(itemData);

      if (result.success) {
        Alert.alert('✅ تم', 'تم إضافة الصنف بنجاح');
        setModalVisible(false);
        resetForm();
        loadMenuItems(restaurantId);
      } else {
        Alert.alert('خطأ', result.error);
      }
    } catch (error) {
      Alert.alert('خطأ', 'فشل في إضافة الصنف');
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  const openEditModal = (item) => {
    setSelectedItem(item);
    setItemName(item.itemName || '');
    setDescription(item.description || '');
    setPrice(item.price?.toString() || '');
    setOfferPrice(item.offerPrice?.toString() || '');
    setHasOffer(!!item.offerPrice);
    setCategory(item.category || '');
    setUnit(item.unit || '');
    setSpicyLevel(item.spicyLevel || 0);
    setImageUrl(item.imageUrl || '');
    setIsAvailable(item.isAvailable !== false);
    setIngredients(item.ingredients || []);
    setOptions(item.options || []);
    setEditModalVisible(true);
  };

  const handleEditItem = async () => {
    if (!selectedItem) return;

    setSubmitting(true);
    try {
      let finalImageUrl = imageUrl;
      if (image) {
        setUploading(true);
        const uploadResult = await uploadMenuItemImage(image, restaurantName);
        setUploading(false);
        if (uploadResult.success) {
          finalImageUrl = uploadResult.fileUrl;
        }
      }

      const updateData = {
        itemName: itemName.trim(),
        description: description.trim() || null,
        price: parseFloat(price),
        offerPrice: hasOffer && offerPrice ? parseFloat(offerPrice) : null,
        category: category.trim() || null,
        unit: unit.trim() || null,
        spicyLevel: spicyLevel || 0,
        imageUrl: finalImageUrl,
        isAvailable,
        ingredients: ingredients.length ? ingredients : null,
        options: options.length ? options : null,
      };

      const result = await updateMenuItem(selectedItem.$id, updateData);

      if (result.success) {
        Alert.alert('✅ تم', 'تم تحديث الصنف بنجاح');
        setEditModalVisible(false);
        resetForm();
        setSelectedItem(null);
        loadMenuItems(restaurantId);
      } else {
        Alert.alert('خطأ', result.error);
      }
    } catch (error) {
      Alert.alert('خطأ', 'فشل في تحديث الصنف');
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  const handleDeleteItem = (item) => {
    Alert.alert('حذف الصنف', `هل أنت متأكد من حذف ${item.itemName}؟`, [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف',
        style: 'destructive',
        onPress: async () => {
          const result = await deleteMenuItem(item.$id, item.imageUrl);
          if (result.success) {
            loadMenuItems(restaurantId);
          } else {
            Alert.alert('خطأ', result.error);
          }
        }
      }
    ]);
  };

  const handleToggleAvailability = async (item) => {
    const result = await toggleItemAvailability(item.$id, !item.isAvailable);
    if (result.success) {
      loadMenuItems(restaurantId);
    } else {
      Alert.alert('خطأ', result.error);
    }
  };

  const getSpicyLevelText = (level) => {
    const levels = ['بدون', 'خفيف', 'متوسط', 'حار'];
    return levels[level] || 'بدون';
  };

  const renderItemCard = ({ item }) => (
    <TouchableOpacity
      style={[styles.itemCard, !item.isAvailable && styles.itemCardDisabled]}
      onPress={() => openEditModal(item)}
      activeOpacity={0.7}
    >
      <View style={styles.itemImageContainer}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
        ) : (
          <View style={[styles.itemImage, styles.placeholderImage]}>
            <Ionicons name="image-outline" size={30} color="#9CA3AF" />
          </View>
        )}
        {item.offerPrice && (
          <View style={styles.offerBadge}>
            <Text style={styles.offerText}>عرض</Text>
          </View>
        )}
      </View>

      <View style={styles.itemContent}>
        <View style={styles.itemHeader}>
          <Text style={styles.itemName}>{item.itemName}</Text>
          <View style={styles.priceContainer}>
            {item.offerPrice ? (
              <>
                <Text style={styles.oldPrice}>{item.price} ج</Text>
                <Text style={styles.offerPrice}>{item.offerPrice} ج</Text>
              </>
            ) : (
              <Text style={styles.price}>{item.price} ج</Text>
            )}
          </View>
        </View>

        {item.description ? (
          <Text style={styles.itemDescription} numberOfLines={2}>{item.description}</Text>
        ) : null}

        <View style={styles.itemMeta}>
          {item.category && (
            <View style={styles.metaItem}>
              <Ionicons name="pricetag-outline" size={14} color="#6B7280" />
              <Text style={styles.metaText}>{item.category}</Text>
            </View>
          )}
          {item.unit && (
            <View style={styles.metaItem}>
              <Ionicons name="scale-outline" size={14} color="#6B7280" />
              <Text style={styles.metaText}>{item.unit}</Text>
            </View>
          )}
          {item.spicyLevel > 0 && (
            <View style={styles.metaItem}>
              <Ionicons name="flame-outline" size={14} color="#EF4444" />
              <Text style={[styles.metaText, styles.spicyText]}>
                {getSpicyLevelText(item.spicyLevel)}
              </Text>
            </View>
          )}
          {item.ingredients?.length > 0 && (
            <View style={styles.metaItem}>
              <Ionicons name="basket-outline" size={14} color="#8B5CF6" />
              <Text style={styles.metaText}>{item.ingredients.length} مكون</Text>
            </View>
          )}
        </View>

        {!item.isAvailable && (
          <View style={styles.unavailableBadge}>
            <Text style={styles.unavailableText}>غير متاح</Text>
          </View>
        )}
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.toggleButton]}
          onPress={() => handleToggleAvailability(item)}
        >
          <Ionicons
            name={item.isAvailable ? "close-outline" : "checkmark-outline"}
            size={20}
            color="#FFF"
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteItem(item)}
        >
          <Ionicons name="trash-outline" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const onRefresh = () => {
    setRefreshing(true);
    if (restaurantId) loadMenuItems(restaurantId);
    else loadMerchantData();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>جاري تحميل القائمة...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={60} color="#EF4444" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadMerchantData}>
          <Text style={styles.retryButtonText}>إعادة المحاولة</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-forward" size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>قائمة الطعام</Text>
        <TouchableOpacity onPress={() => setModalVisible(true)}>
          <Ionicons name="add-circle" size={28} color="#4F46E5" />
        </TouchableOpacity>
      </View>

      {restaurantName ? (
        <View style={styles.restaurantHeader}>
          <Text style={styles.restaurantName}>{restaurantName}</Text>
        </View>
      ) : null}

      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder="بحث عن صنف..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesScroll}
      >
        <TouchableOpacity
          style={[styles.categoryChip, selectedCategory === 'all' && styles.categoryChipActive]}
          onPress={() => setSelectedCategory('all')}
        >
          <Text style={[styles.categoryChipText, selectedCategory === 'all' && styles.categoryChipTextActive]}>الكل</Text>
        </TouchableOpacity>
        {[...new Set(menuItems.map(item => item.category).filter(Boolean))].map(cat => (
          <TouchableOpacity
            key={cat}
            style={[styles.categoryChip, selectedCategory === cat && styles.categoryChipActive]}
            onPress={() => setSelectedCategory(cat)}
          >
            <Text style={[styles.categoryChipText, selectedCategory === cat && styles.categoryChipTextActive]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filteredItems}
        renderItem={renderItemCard}
        keyExtractor={item => item.$id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="restaurant-outline" size={80} color="#E5E7EB" />
            <Text style={styles.emptyText}>لا توجد أصناف</Text>
            <Text style={styles.emptySubText}>اضغط على + لإضافة صنف جديد</Text>
          </View>
        }
      />

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>إضافة صنف جديد</Text>
                <TouchableOpacity onPress={() => { setModalVisible(false); resetForm(); }}>
                  <Ionicons name="close" size={24} color="#EF4444" />
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>صورة الصنف (اختياري)</Text>
              <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
                {image ? (
                  <Image source={{ uri: image }} style={styles.previewImage} />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Ionicons name="camera-outline" size={40} color="#9CA3AF" />
                    <Text style={styles.imagePlaceholderText}>اضغط لإضافة صورة</Text>
                  </View>
                )}
              </TouchableOpacity>

              <Text style={styles.label}>اسم الصنف <Text style={styles.required}>*</Text></Text>
              <TextInput style={styles.input} placeholder="مثال: فرخة مشوية" value={itemName} onChangeText={setItemName} />

              <Text style={styles.label}>الوصف (اختياري)</Text>
              <TextInput style={[styles.input, styles.textArea]} placeholder="وصف الصنف..." value={description} onChangeText={setDescription} multiline numberOfLines={3} />

              <View style={styles.row}>
                <View style={styles.halfWidth}>
                  <Text style={styles.label}>السعر <Text style={styles.required}>*</Text></Text>
                  <TextInput style={styles.input} placeholder="120" value={price} onChangeText={setPrice} keyboardType="numeric" />
                </View>
                <View style={styles.halfWidth}>
                  <View style={styles.offerSwitch}>
                    <Text style={styles.label}>عرض خاص</Text>
                    <Switch value={hasOffer} onValueChange={setHasOffer} trackColor={{ false: '#E5E7EB', true: '#4F46E5' }} />
                  </View>
                  {hasOffer && (
                    <TextInput style={styles.input} placeholder="سعر العرض" value={offerPrice} onChangeText={setOfferPrice} keyboardType="numeric" />
                  )}
                </View>
              </View>

              <Text style={styles.label}>التصنيف (اختياري)</Text>
              <TextInput style={styles.input} placeholder="مثال: مشاوي، مقبلات..." value={category} onChangeText={setCategory} />
              <ScrollView horizontal style={styles.suggestionsRow}>
                {CATEGORY_SUGGESTIONS.map(sugg => (
                  <TouchableOpacity key={sugg} style={styles.suggestionChip} onPress={() => setCategory(sugg)}>
                    <Text style={styles.suggestionText}>{sugg}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.label}>وحدة القياس (اختياري)</Text>
              <TextInput style={styles.input} placeholder="مثال: كيلو، قطعة، طبق..." value={unit} onChangeText={setUnit} />
              <ScrollView horizontal style={styles.suggestionsRow}>
                {UNIT_SUGGESTIONS.map(sugg => (
                  <TouchableOpacity key={sugg} style={styles.suggestionChip} onPress={() => setUnit(sugg)}>
                    <Text style={styles.suggestionText}>{sugg}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.label}>مستوى الحراق (اختياري)</Text>
              <View style={styles.spicyContainer}>
                {[0, 1, 2, 3].map(level => (
                  <TouchableOpacity
                    key={level}
                    style={[styles.spicyOption, spicyLevel === level && styles.spicyOptionActive]}
                    onPress={() => setSpicyLevel(level)}
                  >
                    <Text style={[styles.spicyOptionText, spicyLevel === level && styles.spicyOptionTextActive]}>
                      {['بدون', 'خفيف', 'متوسط', 'حار'][level]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>المكونات (اختياري)</Text>
              <View style={styles.ingredientInput}>
                <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} placeholder="أضف مكوناً..." value={currentIngredient} onChangeText={setCurrentIngredient} />
                <TouchableOpacity style={styles.addButton} onPress={addIngredient}>
                  <Ionicons name="add" size={24} color="#FFF" />
                </TouchableOpacity>
              </View>
              {ingredients.length > 0 && (
                <View style={styles.ingredientsList}>
                  {ingredients.map((ing, index) => (
                    <View key={index} style={styles.ingredientTag}>
                      <Text style={styles.ingredientTagText}>{ing}</Text>
                      <TouchableOpacity onPress={() => removeIngredient(index)}>
                        <Ionicons name="close-circle" size={18} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <Text style={styles.label}>خيارات إضافية (اختياري)</Text>
              <View style={styles.optionInput}>
                <TextInput style={[styles.input, { flex: 2, marginBottom: 0, marginRight: 8 }]} placeholder="الخيار" value={currentOption.name} onChangeText={(text) => setCurrentOption({ ...currentOption, name: text })} />
                <TextInput style={[styles.input, { flex: 1, marginBottom: 0, marginRight: 8 }]} placeholder="السعر" value={currentOption.price} onChangeText={(text) => setCurrentOption({ ...currentOption, price: text })} keyboardType="numeric" />
                <TouchableOpacity style={styles.addButton} onPress={addOption}>
                  <Ionicons name="add" size={24} color="#FFF" />
                </TouchableOpacity>
              </View>
              {options.length > 0 && (
                <View style={styles.optionsList}>
                  {options.map((opt, index) => (
                    <View key={index} style={styles.optionTag}>
                      <Text style={styles.optionTagText}>{opt.name} +{opt.price} ج</Text>
                      <TouchableOpacity onPress={() => removeOption(index)}>
                        <Ionicons name="close-circle" size={18} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.switchContainer}>
                <Text style={styles.label}>متاح للطلب</Text>
                <Switch value={isAvailable} onValueChange={setIsAvailable} trackColor={{ false: '#E5E7EB', true: '#4F46E5' }} />
              </View>

              <TouchableOpacity style={[styles.submitButton, (submitting || uploading) && styles.disabled]} onPress={handleAddItem} disabled={submitting || uploading}>
                {(submitting || uploading) ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitButtonText}>إضافة الصنف</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={editModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>تعديل الصنف</Text>
                <TouchableOpacity onPress={() => { setEditModalVisible(false); resetForm(); setSelectedItem(null); }}>
                  <Ionicons name="close" size={24} color="#EF4444" />
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>صورة الصنف (اختياري)</Text>
              <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
                {image || imageUrl ? (
                  <Image source={{ uri: image || imageUrl }} style={styles.previewImage} />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Ionicons name="camera-outline" size={40} color="#9CA3AF" />
                    <Text style={styles.imagePlaceholderText}>تغيير الصورة</Text>
                  </View>
                )}
              </TouchableOpacity>

              <Text style={styles.label}>اسم الصنف <Text style={styles.required}>*</Text></Text>
              <TextInput style={styles.input} placeholder="اسم الصنف" value={itemName} onChangeText={setItemName} />

              <Text style={styles.label}>الوصف (اختياري)</Text>
              <TextInput style={[styles.input, styles.textArea]} placeholder="الوصف" value={description} onChangeText={setDescription} multiline />

              <View style={styles.row}>
                <View style={styles.halfWidth}>
                  <Text style={styles.label}>السعر</Text>
                  <TextInput style={styles.input} placeholder="السعر" value={price} onChangeText={setPrice} keyboardType="numeric" />
                </View>
                <View style={styles.halfWidth}>
                  <View style={styles.offerSwitch}>
                    <Text style={styles.label}>عرض خاص</Text>
                    <Switch value={hasOffer} onValueChange={setHasOffer} trackColor={{ false: '#E5E7EB', true: '#4F46E5' }} />
                  </View>
                  {hasOffer && (
                    <TextInput style={styles.input} placeholder="سعر العرض" value={offerPrice} onChangeText={setOfferPrice} keyboardType="numeric" />
                  )}
                </View>
              </View>

              <Text style={styles.label}>التصنيف (اختياري)</Text>
              <TextInput style={styles.input} placeholder="التصنيف" value={category} onChangeText={setCategory} />
              <ScrollView horizontal style={styles.suggestionsRow}>
                {CATEGORY_SUGGESTIONS.map(sugg => (
                  <TouchableOpacity key={sugg} style={styles.suggestionChip} onPress={() => setCategory(sugg)}>
                    <Text style={styles.suggestionText}>{sugg}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.label}>وحدة القياس (اختياري)</Text>
              <TextInput style={styles.input} placeholder="وحدة القياس" value={unit} onChangeText={setUnit} />
              <ScrollView horizontal style={styles.suggestionsRow}>
                {UNIT_SUGGESTIONS.map(sugg => (
                  <TouchableOpacity key={sugg} style={styles.suggestionChip} onPress={() => setUnit(sugg)}>
                    <Text style={styles.suggestionText}>{sugg}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.label}>مستوى الحراق (اختياري)</Text>
              <View style={styles.spicyContainer}>
                {[0, 1, 2, 3].map(level => (
                  <TouchableOpacity
                    key={level}
                    style={[styles.spicyOption, spicyLevel === level && styles.spicyOptionActive]}
                    onPress={() => setSpicyLevel(level)}
                  >
                    <Text style={[styles.spicyOptionText, spicyLevel === level && styles.spicyOptionTextActive]}>
                      {['بدون', 'خفيف', 'متوسط', 'حار'][level]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>المكونات (اختياري)</Text>
              <View style={styles.ingredientInput}>
                <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} placeholder="أضف مكوناً..." value={currentIngredient} onChangeText={setCurrentIngredient} />
                <TouchableOpacity style={styles.addButton} onPress={addIngredient}>
                  <Ionicons name="add" size={24} color="#FFF" />
                </TouchableOpacity>
              </View>
              {ingredients.length > 0 && (
                <View style={styles.ingredientsList}>
                  {ingredients.map((ing, index) => (
                    <View key={index} style={styles.ingredientTag}>
                      <Text style={styles.ingredientTagText}>{ing}</Text>
                      <TouchableOpacity onPress={() => removeIngredient(index)}>
                        <Ionicons name="close-circle" size={18} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <Text style={styles.label}>خيارات إضافية (اختياري)</Text>
              <View style={styles.optionInput}>
                <TextInput style={[styles.input, { flex: 2, marginBottom: 0, marginRight: 8 }]} placeholder="الخيار" value={currentOption.name} onChangeText={(text) => setCurrentOption({ ...currentOption, name: text })} />
                <TextInput style={[styles.input, { flex: 1, marginBottom: 0, marginRight: 8 }]} placeholder="السعر" value={currentOption.price} onChangeText={(text) => setCurrentOption({ ...currentOption, price: text })} keyboardType="numeric" />
                <TouchableOpacity style={styles.addButton} onPress={addOption}>
                  <Ionicons name="add" size={24} color="#FFF" />
                </TouchableOpacity>
              </View>
              {options.length > 0 && (
                <View style={styles.optionsList}>
                  {options.map((opt, index) => (
                    <View key={index} style={styles.optionTag}>
                      <Text style={styles.optionTagText}>{opt.name} +{opt.price} ج</Text>
                      <TouchableOpacity onPress={() => removeOption(index)}>
                        <Ionicons name="close-circle" size={18} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.switchContainer}>
                <Text style={styles.label}>متاح للطلب</Text>
                <Switch value={isAvailable} onValueChange={setIsAvailable} trackColor={{ false: '#E5E7EB', true: '#4F46E5' }} />
              </View>

              <TouchableOpacity style={[styles.submitButton, (submitting || uploading) && styles.disabled]} onPress={handleEditItem} disabled={submitting || uploading}>
                {(submitting || uploading) ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitButtonText}>تحديث الصنف</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#6B7280' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { fontSize: 16, color: '#EF4444', textAlign: 'center', marginVertical: 20 },
  retryButton: { backgroundColor: '#4F46E5', padding: 12, borderRadius: 8 },
  retryButtonText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  restaurantHeader: { backgroundColor: '#4F46E5', padding: 12, alignItems: 'center' },
  restaurantName: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    margin: 16,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 14,
  },
  categoriesScroll: {
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  categoryChip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  categoryChipActive: { backgroundColor: '#4F46E5' },
  categoryChipText: { fontSize: 13, color: '#6B7280' },
  categoryChipTextActive: { color: '#FFF', fontWeight: '600' },
  list: { padding: 16 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { marginTop: 12, fontSize: 16, color: '#1F2937', fontWeight: '600' },
  emptySubText: { marginTop: 4, fontSize: 14, color: '#9CA3AF' },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  itemCardDisabled: { opacity: 0.6, backgroundColor: '#F9FAFB' },
  itemImageContainer: { position: 'relative' },
  itemImage: { width: 70, height: 70, borderRadius: 8, marginRight: 12 },
  placeholderImage: { backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  offerBadge: {
    position: 'absolute',
    top: -5,
    right: 5,
    backgroundColor: '#EF4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  offerText: { color: '#FFF', fontSize: 8, fontWeight: '600' },
  itemContent: { flex: 1 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  itemName: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  priceContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  price: { fontSize: 14, fontWeight: 'bold', color: '#F59E0B' },
  oldPrice: { fontSize: 12, color: '#9CA3AF', textDecorationLine: 'line-through' },
  offerPrice: { fontSize: 14, fontWeight: 'bold', color: '#EF4444' },
  itemDescription: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  itemMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  metaText: { fontSize: 10, color: '#6B7280' },
  spicyText: { color: '#EF4444' },
  unavailableBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  unavailableText: { fontSize: 10, color: '#EF4444', fontWeight: '600' },
  actionButtons: { flexDirection: 'row', gap: 6 },
  actionButton: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  toggleButton: { backgroundColor: '#10B981' },
  deleteButton: { backgroundColor: '#EF4444' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalScrollContent: { paddingBottom: 20, paddingTop: 60 },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1F2937' },
  label: { fontSize: 14, fontWeight: '600', color: '#4B5563', marginBottom: 5, marginTop: 10 },
  required: { color: '#EF4444' },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 14,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 10 },
  halfWidth: { flex: 1 },
  offerSwitch: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  suggestionsRow: { flexDirection: 'row', marginBottom: 15, marginTop: -5 },
  suggestionChip: { backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginRight: 8 },
  suggestionText: { fontSize: 12, color: '#4F46E5' },
  spicyContainer: { flexDirection: 'row', gap: 8, marginBottom: 15 },
  spicyOption: { flex: 1, backgroundColor: '#F3F4F6', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  spicyOptionActive: { backgroundColor: '#4F46E5' },
  spicyOptionText: { fontSize: 12, color: '#4B5563' },
  spicyOptionTextActive: { color: '#FFF', fontWeight: '600' },
  ingredientInput: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  addButton: { backgroundColor: '#4F46E5', width: 48, height: 48, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  ingredientsList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 15 },
  ingredientTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  ingredientTagText: { fontSize: 12, color: '#4F46E5' },
  optionInput: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  optionsList: { gap: 8, marginBottom: 15 },
  optionTag: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  optionTagText: { fontSize: 12, color: '#1F2937' },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  imagePicker: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    marginBottom: 15,
    overflow: 'hidden',
  },
  previewImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  imagePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' },
  imagePlaceholderText: { marginTop: 8, fontSize: 14, color: '#9CA3AF' },
  submitButton: {
    backgroundColor: '#4F46E5',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  disabled: { opacity: 0.6 },
  submitButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});
