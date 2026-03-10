import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useCart } from '../../context/CartContext';

const { width } = Dimensions.get('window');

export default function DishDetailsScreen({ navigation, route }) {
  const { dish } = route.params;
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');

  const player = useVideoPlayer(dish.videoUrl, player => {
    player.loop = false;
  });

  const handleAddToCart = () => {
    addToCart(dish, quantity, notes);
    Alert.alert('✅ تم', 'تمت إضافة الطبق إلى السلة', [
      { text: 'متابعة التسوق', style: 'cancel' },
      { text: 'عرض السلة', onPress: () => navigation.navigate('Cart') }
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-forward" size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>تفاصيل الطبق</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Cart')} style={styles.cartButton}>
          <Ionicons name="cart" size={24} color="#4F46E5" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {dish.images && dish.images.length > 0 ? (
          <ScrollView 
            horizontal 
            pagingEnabled 
            showsHorizontalScrollIndicator={false}
            style={styles.imagesContainer}
          >
            {dish.images.map((url, index) => (
              <Image 
                key={index} 
                source={{ uri: url }} 
                style={styles.fullImage} 
                resizeMode="cover"
              />
            ))}
          </ScrollView>
        ) : (
          <View style={[styles.fullImage, styles.noImage]}>
            <Ionicons name="image-outline" size={60} color="#9CA3AF" />
            <Text style={styles.noImageText}>لا توجد صور</Text>
          </View>
        )}

        <View style={styles.infoCard}>
          <Text style={styles.dishName}>{dish.name}</Text>
          
          {dish.description && (
            <Text style={styles.dishDescription}>{dish.description}</Text>
          )}
          
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>السعر:</Text>
            <Text style={styles.priceValue}>{dish.price} ج</Text>
          </View>
        </View>

        {dish.videoUrl && (
          <View style={styles.videoCard}>
            <Text style={styles.sectionTitle}>🎥 فيديو التحضير</Text>
            <View style={styles.videoContainer}>
              <VideoView
                player={player}
                style={styles.video}
                contentFit="contain"
                nativeControls
              />
            </View>
          </View>
        )}

        <View style={styles.quantityCard}>
          <Text style={styles.sectionTitle}>🔢 الكمية</Text>
          <View style={styles.quantityRow}>
            <TouchableOpacity 
              onPress={() => setQuantity(Math.max(1, quantity - 1))}
              style={styles.quantityButton}
            >
              <Ionicons name="remove" size={20} color="#FFF" />
            </TouchableOpacity>
            
            <Text style={styles.quantityText}>{quantity}</Text>
            
            <TouchableOpacity 
              onPress={() => setQuantity(quantity + 1)}
              style={[styles.quantityButton, styles.quantityButtonAdd]}
            >
              <Ionicons name="add" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.notesCard}>
          <Text style={styles.sectionTitle}>📝 ملاحظات إضافية (اختياري)</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="أضف ملاحظاتك هنا..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity style={styles.addButton} onPress={handleAddToCart}>
          <Ionicons name="cart-outline" size={24} color="#FFF" />
          <Text style={styles.addButtonText}>أضف إلى السلة</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  cartButton: {
    padding: 4,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  
  imagesContainer: {
    height: 250,
  },
  fullImage: {
    width: width,
    height: 250,
    resizeMode: 'cover',
  },
  noImage: {
    width: width,
    height: 250,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    marginTop: 10,
    fontSize: 14,
    color: '#9CA3AF',
  },

  infoCard: {
    backgroundColor: '#FFF',
    marginTop: 12,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dishName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  dishDescription: {
    fontSize: 16,
    color: '#4B5563',
    lineHeight: 24,
    marginBottom: 12,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  priceLabel: {
    fontSize: 16,
    color: '#6B7280',
    marginRight: 8,
  },
  priceValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F59E0B',
  },

  videoCard: {
    backgroundColor: '#FFF',
    marginTop: 12,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 12,
  },
  videoContainer: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  video: {
    width: '100%',
    height: '100%',
  },

  quantityCard: {
    backgroundColor: '#FFF',
    marginTop: 12,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  quantityButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonAdd: {
    backgroundColor: '#10B981',
  },
  quantityText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    minWidth: 40,
    textAlign: 'center',
  },

  notesCard: {
    backgroundColor: '#FFF',
    marginTop: 12,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  notesInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
  },

  addButton: {
    backgroundColor: '#4F46E5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 20,
    gap: 8,
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
