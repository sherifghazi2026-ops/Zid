import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  Modal,
  Image,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import azureService from '../services/azureService';
import { databases, DATABASE_ID } from '../appwrite/config';
import { Query } from 'appwrite';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createOrder } from '../services/orderService';

const { width, height } = Dimensions.get('window');

export default function AiMainModal({ visible, onClose }) {
  const [step, setStep] = useState('dishes'); // dishes, dishDetails, chat, checkout
  const [dishes, setDishes] = useState([]);
  const [filteredDishes, setFilteredDishes] = useState([]);
  const [chefs, setChefs] = useState({});
  const [selectedDish, setSelectedDish] = useState(null);
  const [quantity, setQuantity] = useState(1);

  // حالات الطلبات المنفصلة
  const [orders, setOrders] = useState([]); // [{ chefId, chefName, deliveryFee, deliveryTime, items: [{ dish, quantity }], total }]

  // حالات الشات
  const [messages, setMessages] = useState([]);
  const [textInput, setTextInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);

  // حالات العميل
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [sending, setSending] = useState(false);
  const [sendingOrder, setSendingOrder] = useState(null);

  const scrollViewRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (visible) {
      loadDishes();
      loadSavedData();
      setStep('dishes');
      setMessages([]);
      setOrders([]);
    }
  }, [visible]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const loadSavedData = async () => {
    const savedPhone = await AsyncStorage.getItem('zayed_phone');
    const savedAddress = await AsyncStorage.getItem('zayed_address');
    if (savedPhone) setCustomerPhone(savedPhone);
    if (savedAddress) setCustomerAddress(savedAddress);
  };

  const loadDishes = async () => {
    setLoading(true);
    try {
      // جلب الأطباق المقبولة من الشيفات فقط
      const dishesResponse = await databases.listDocuments(
        DATABASE_ID,
        'dishes',
        [
          Query.equal('providerType', 'home_chef'),
          Query.equal('status', 'approved'),
          Query.equal('isAvailable', true)
        ]
      );

      // جلب معلومات الشيفات مع وقت ورسوم التوصيل
      const chefIds = [...new Set(dishesResponse.documents.map(d => d.providerId))];
      const chefsMap = {};

      for (const id of chefIds) {
        try {
          const user = await databases.getDocument(
            DATABASE_ID,
            'users',
            id
          );
          chefsMap[id] = {
            name: user.name,
            phone: user.phone,
            deliveryTime: user.deliveryTime || 45, // وقت التوصيل للشيفات أطول قليلاً
            deliveryFee: user.deliveryFee || 15, // رسوم التوصيل للشيفات
            isVerified: user.isVerified || false,
          };
        } catch (e) {
          chefsMap[id] = { 
            name: 'شيف', 
            phone: '',
            deliveryTime: 45,
            deliveryFee: 15,
            isVerified: false,
          };
        }
      }

      setChefs(chefsMap);
      setDishes(dishesResponse.documents);
      setFilteredDishes(dishesResponse.documents);

      // رسالة ترحيب للشيفات
      setMessages([{
        id: 'welcome',
        sender: 'ai',
        text: 'مرحباً! أنا مساعد الشيفات الذكي. اسألني عن أي طبق منزلي عشان أعطيك معلومات عنه، أو تصفح الأطباق المتاحة من القائمة.',
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
      }]);

    } catch (error) {
      console.error('خطأ في جلب الأطباق:', error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ دالة إضافة الطلبات - مع إضافة رسوم التوصيل
  const addToOrder = (dish, qty = 1) => {
    const chefId = dish.providerId;
    const chefName = chefs[chefId]?.name || 'شيف';
    const deliveryFee = chefs[chefId]?.deliveryFee || 15;
    const deliveryTime = chefs[chefId]?.deliveryTime || 45;

    // البحث عن طلب موجود لنفس الشيف
    const existingOrderIndex = orders.findIndex(o => o.chefId === chefId);

    if (existingOrderIndex >= 0) {
      // إضافة للطلب الموجود
      const updatedOrders = [...orders];

      // البحث عن العنصر داخل الطلب
      const existingItemIndex = updatedOrders[existingOrderIndex].items.findIndex(
        i => i.dish.$id === dish.$id
      );

      if (existingItemIndex >= 0) {
        // العنصر موجود - نزيد الكمية
        updatedOrders[existingOrderIndex].items[existingItemIndex].quantity += qty;
      } else {
        // العنصر مش موجود - نضيفه جديد
        updatedOrders[existingOrderIndex].items.push({ dish, quantity: qty });
      }

      // تحديث الإجمالي (بدون رسوم التوصيل - نضيفها لاحقاً)
      const foodTotal = updatedOrders[existingOrderIndex].items.reduce(
        (sum, item) => sum + (item.dish.price * item.quantity), 0
      );
      updatedOrders[existingOrderIndex].foodTotal = foodTotal;
      updatedOrders[existingOrderIndex].total = foodTotal + deliveryFee;

      setOrders(updatedOrders);
    } else {
      // إنشاء طلب جديد
      const foodTotal = dish.price * qty;
      const newOrder = {
        chefId,
        chefName,
        chefPhone: chefs[chefId]?.phone,
        deliveryTime: deliveryTime,
        deliveryFee: deliveryFee,
        items: [{ dish, quantity: qty }],
        foodTotal: foodTotal,
        total: foodTotal + deliveryFee,
        isVerified: chefs[chefId]?.isVerified || false,
      };
      setOrders([...orders, newOrder]);
    }
  };

  const handleAIRequest = async (message) => {
    if (!message.trim()) return;

    setMessages(prev => [...prev, {
      id: Date.now(),
      sender: 'user',
      text: message,
      timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
    }]);

    setTextInput('');
    setAiThinking(true);

    try {
      // بناء قائمة الأطباق المتاحة للشرح فقط
      const dishesList = dishes.map(d =>
        `${d.name} - ${d.price} ج - من ${chefs[d.providerId]?.name || 'شيف'} - ${d.description || ''}`
      ).join('\n');

      const prompt = `أنت مساعد معلومات عن الأكل المنزلي والشيفات فقط. وظيفتك شرح الأطباق التي يسأل عنها العميل، ولا تؤكد أي طلبات.

الأطباق المتاحة:
${dishesList}

المحادثة السابقة:
${messages.slice(-3).map(m => `${m.sender === 'user' ? 'العميل' : 'المساعد'}: ${m.text}`).join('\n')}

العميل: ${message}

تعليمات صارمة:
1. اشرح الأطباق التي يطلبها العميل فقط (السعر، الوصف، المكونات).
2. لا تؤكد إضافة أي شيء للسلة.
3. إذا سأل عن طبق غير موجود، أخبره بذلك.
4. إذا أراد العميل الطلب، وجهه إلى قائمة الأطباق.
5. ردودك قصيرة ومفيدة.

ردك:`;

      const result = await azureService.askAI(prompt);

      if (result.success) {
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          sender: 'ai',
          text: result.text,
          timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
        }]);
      }
    } catch (error) {
      console.error('AI Error:', error);
    } finally {
      setAiThinking(false);
    }
  };

  // حساب إجمالي عدد العناصر في السلة
  const getTotalItemsCount = () => {
    return orders.reduce((sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0);
  };

  // حساب الإجمالي الكلي مع رسوم التوصيل
  const getGrandTotal = () => {
    return orders.reduce((sum, order) => sum + order.total, 0);
  };

  const showDishDetails = (dish) => {
    setSelectedDish(dish);
    setStep('dishDetails');
  };

  const addFromDetails = () => {
    if (selectedDish) {
      addToOrder(selectedDish, quantity);
      Alert.alert('✅ تم', `تم إضافة ${selectedDish.name} إلى طلبك`);
      setStep('dishes');
      setSelectedDish(null);
      setQuantity(1);
    }
  };

  const removeFromOrder = (orderIndex, itemIndex) => {
    const updatedOrders = [...orders];
    updatedOrders[orderIndex].items.splice(itemIndex, 1);

    if (updatedOrders[orderIndex].items.length === 0) {
      updatedOrders.splice(orderIndex, 1);
    } else {
      const foodTotal = updatedOrders[orderIndex].items.reduce(
        (sum, item) => sum + (item.dish.price * item.quantity), 0
      );
      updatedOrders[orderIndex].foodTotal = foodTotal;
      updatedOrders[orderIndex].total = foodTotal + updatedOrders[orderIndex].deliveryFee;
    }

    setOrders(updatedOrders);
  };

  const sendOrder = async (order) => {
    if (!customerPhone.trim() || !customerAddress.trim()) {
      Alert.alert('تنبيه', 'الرجاء إدخال رقم الجوال والعنوان أولاً');
      return;
    }

    setSending(true);
    setSendingOrder(order.chefId);

    try {
      const itemsList = order.items.map(item =>
        `${item.dish.name} x${item.quantity} - ${item.dish.price * item.quantity} ج`
      );

      const orderData = {
        customerPhone,
        customerAddress,
        serviceType: 'home_chef',
        serviceName: `طلب من ${order.chefName}`,
        items: itemsList,
        totalPrice: order.total,
        deliveryFee: order.deliveryFee,
        merchantId: order.chefId,
        merchantName: order.chefName,
        merchantPhone: order.chefPhone,
        notes: `وقت التوصيل المتوقع: ${order.deliveryTime} دقيقة - شيف ${order.isVerified ? 'موثق ✅' : ''}`,
      };

      const result = await createOrder(orderData);

      if (result.success) {
        Alert.alert('✅ تم', `تم إرسال طلب ${order.chefName}`);

        // إزالة الطلب من القائمة بعد الإرسال
        const updatedOrders = orders.filter(o => o.chefId !== order.chefId);
        setOrders(updatedOrders);

        if (updatedOrders.length === 0) {
          setStep('dishes');
        }
      } else {
        Alert.alert('خطأ', result.error);
      }
    } catch (error) {
      Alert.alert('خطأ', 'فشل في إرسال الطلب');
    } finally {
      setSending(false);
      setSendingOrder(null);
    }
  };

  const sendAllOrders = async () => {
    if (!customerPhone.trim() || !customerAddress.trim()) {
      Alert.alert('تنبيه', 'الرجاء إدخال رقم الجوال والعنوان');
      return;
    }

    await AsyncStorage.setItem('zayed_phone', customerPhone);
    await AsyncStorage.setItem('zayed_address', customerAddress);

    let successCount = 0;
    for (const order of orders) {
      await sendOrder(order);
      successCount++;
    }

    if (successCount === orders.length) {
      Alert.alert('✅ تم', 'تم إرسال كل الطلبات بنجاح');
    }
  };

  // شريط السلة الثابت (يظهر في كل الشاشات ما عدا checkout)
  const renderCartBar = () => {
    if (orders.length === 0) return null;

    const totalItems = getTotalItemsCount();
    const grandTotal = getGrandTotal();

    return (
      <TouchableOpacity
        style={styles.cartBar}
        onPress={() => setStep('checkout')}
        activeOpacity={0.9}
      >
        <View style={styles.cartBarContent}>
          <View style={styles.cartInfo}>
            <Ionicons name="cart" size={24} color="#FFF" />
            <Text style={styles.cartBarText}>{totalItems} أصناف</Text>
          </View>
          <View style={styles.cartTotal}>
            <Text style={styles.cartBarTotal}>{grandTotal} ج</Text>
            <Ionicons name="arrow-back" size={20} color="#FFF" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // شاشة عرض الأطباق
  const renderDishes = () => (
    <View style={[styles.screenContainer, { height: height - 100 }]}>
      <View style={styles.screenHeader}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={28} color="#EF4444" />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.screenTitle}>شيفات منزلي</Text>
          <Text style={styles.screenSubtitle}>أطباق منزلية طازة</Text>
        </View>
        <TouchableOpacity onPress={() => setStep('dishes')} style={styles.homeButton}>
          <Ionicons name="home" size={24} color="#EF4444" />
        </TouchableOpacity>
      </View>

      {/* زر المساعد الذكي للشيفات */}
      <TouchableOpacity
        style={styles.chatAssistantButton}
        onPress={() => setStep('chat')}
      >
        <Image
          source={{ uri: 'https://img.icons8.com/color/48/000000/chef.png' }}
          style={styles.assistantIcon}
        />
        <View style={styles.assistantTextContainer}>
          <Text style={styles.assistantTitle}>مساعد الشيفات</Text>
          <Text style={styles.assistantSubtitle}>اسأل عن أي طبق منزلي</Text>
        </View>
        <Ionicons name="chatbubble-ellipses" size={24} color="#EF4444" />
      </TouchableOpacity>

      <FlatList
        data={filteredDishes}
        keyExtractor={item => item.$id}
        renderItem={({ item }) => {
          const chef = chefs[item.providerId] || {};
          return (
            <TouchableOpacity
              style={styles.dishCard}
              onPress={() => showDishDetails(item)}
            >
              {item.images && item.images[0] ? (
                <Image source={{ uri: item.images[0] }} style={styles.dishImage} />
              ) : (
                <View style={[styles.dishImage, styles.placeholderImage]}>
                  <Ionicons name="restaurant-outline" size={30} color="#9CA3AF" />
                </View>
              )}
              <View style={styles.dishInfo}>
                <View style={styles.dishHeader}>
                  <Text style={styles.dishName}>{item.name}</Text>
                  {chef.isVerified && (
                    <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                  )}
                </View>
                <Text style={styles.dishMerchant}>من {chef.name || 'شيف'}</Text>
                <Text style={styles.dishPrice}>{item.price} ج</Text>
                {chef.deliveryFee > 0 && (
                  <Text style={styles.deliveryText}>توصيل: {chef.deliveryFee} ج</Text>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>لا توجد أطباق متاحة</Text>
          </View>
        }
      />

      {renderCartBar()}
    </View>
  );

  // شاشة تفاصيل الطبق
  const renderDishDetails = () => (
    <View style={[styles.screenContainer, { height: height - 100 }]}>
      <View style={styles.screenHeader}>
        <TouchableOpacity onPress={() => setStep('dishes')} style={styles.backButton}>
          <Ionicons name="arrow-forward" size={24} color="#EF4444" />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.screenTitle}>تفاصيل الطبق</Text>
        </View>
        <TouchableOpacity onPress={() => setStep('dishes')} style={styles.homeButton}>
          <Ionicons name="home" size={24} color="#EF4444" />
        </TouchableOpacity>
      </View>

      {selectedDish && (
        <ScrollView contentContainerStyle={styles.detailsContent}>
          {/* صورة الطبق كبيرة */}
          {selectedDish.images && selectedDish.images[0] ? (
            <Image source={{ uri: selectedDish.images[0] }} style={styles.detailImage} />
          ) : (
            <View style={[styles.detailImage, styles.detailPlaceholder]}>
              <Ionicons name="restaurant-outline" size={60} color="#9CA3AF" />
            </View>
          )}

          {/* معلومات الطبق */}
          <View style={styles.detailInfo}>
            <View style={styles.detailHeader}>
              <Text style={styles.detailName}>{selectedDish.name}</Text>
              {chefs[selectedDish.providerId]?.isVerified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                  <Text style={styles.verifiedText}>شيف موثق</Text>
                </View>
              )}
            </View>
            <Text style={styles.detailMerchant}>من {chefs[selectedDish.providerId]?.name || 'شيف'}</Text>

            <View style={styles.detailPriceRow}>
              <Text style={styles.detailPrice}>{selectedDish.price} ج</Text>
            </View>

            {/* معلومات التوصيل */}
            <View style={styles.deliveryInfoBox}>
              <Text style={styles.deliveryInfoText}>⏱️ وقت التوصيل: {chefs[selectedDish.providerId]?.deliveryTime || 45} دقيقة</Text>
              <Text style={styles.deliveryInfoText}>💰 رسوم التوصيل: {chefs[selectedDish.providerId]?.deliveryFee || 15} ج</Text>
            </View>

            {/* الوصف */}
            {selectedDish.description && (
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>الوصف</Text>
                <Text style={styles.detailDescription}>{selectedDish.description}</Text>
              </View>
            )}

            {/* المكونات */}
            {selectedDish.ingredients && selectedDish.ingredients.length > 0 && (
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>المكونات</Text>
                <View style={styles.ingredientsList}>
                  {selectedDish.ingredients.map((ing, index) => (
                    <View key={index} style={styles.ingredientChip}>
                      <Text style={styles.ingredientText}>{ing}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* فيديو التحضير لو موجود */}
            {selectedDish.videoUrl && (
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>فيديو التحضير</Text>
                <TouchableOpacity style={styles.videoButton}>
                  <Ionicons name="play-circle" size={24} color="#EF4444" />
                  <Text style={styles.videoButtonText}>مشاهدة فيديو التحضير</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* اختيار الكمية */}
            <View style={styles.detailQuantitySection}>
              <Text style={styles.quantityLabel}>الكمية</Text>
              <View style={styles.quantityControls}>
                <TouchableOpacity onPress={() => setQuantity(Math.max(1, quantity - 1))}>
                  <Ionicons name="remove-circle" size={36} color="#EF4444" />
                </TouchableOpacity>
                <Text style={styles.quantityText}>{quantity}</Text>
                <TouchableOpacity onPress={() => setQuantity(quantity + 1)}>
                  <Ionicons name="add-circle" size={36} color="#10B981" />
                </TouchableOpacity>
              </View>
            </View>

            {/* أزرار الإجراءات */}
            <View style={styles.detailActions}>
              <TouchableOpacity
                style={styles.addToOrderButton}
                onPress={addFromDetails}
              >
                <Ionicons name="cart-outline" size={20} color="#FFF" />
                <Text style={styles.addToOrderButtonText}>
                  إضافة للطلب ({selectedDish.price * quantity} ج)
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      )}

      {renderCartBar()}
    </View>
  );

  // شاشة المحادثة - للشرح فقط
  const renderChat = () => (
    <View style={[styles.screenContainer, { height: height - 100 }]}>
      <View style={styles.screenHeader}>
        <TouchableOpacity onPress={() => setStep('dishes')} style={styles.backButton}>
          <Ionicons name="arrow-forward" size={24} color="#EF4444" />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.screenTitle}>مساعد الشيفات</Text>
          <Text style={styles.screenSubtitle}>للشرح والمعلومات فقط</Text>
        </View>
        <TouchableOpacity onPress={() => setStep('dishes')} style={styles.homeButton}>
          <Ionicons name="home" size={24} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.chatContainer}
        ref={scrollViewRef}
        contentContainerStyle={styles.chatContent}
      >
        {messages.map((msg) => (
          <View key={msg.id} style={[styles.messageWrapper, msg.sender === 'user' ? styles.userWrapper : styles.aiWrapper]}>
            {msg.sender === 'ai' && (
              <Image source={{ uri: 'https://img.icons8.com/color/48/000000/chef.png' }} style={styles.aiAvatar} />
            )}
            <View style={[styles.messageBubble, msg.sender === 'user' ? styles.userBubble : styles.aiBubble]}>
              <Text style={msg.sender === 'user' ? styles.userText : styles.aiText}>{msg.text}</Text>
              <Text style={styles.timestamp}>{msg.timestamp}</Text>
            </View>
          </View>
        ))}

        {aiThinking && (
          <View style={styles.typingIndicator}>
            <View style={styles.typingBubble}>
              <ActivityIndicator size="small" color="#EF4444" />
              <Text style={styles.typingText}>مساعد الشيفات بيفكر...</Text>
            </View>
          </View>
        )}
      </ScrollView>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        <View style={styles.inputContainer}>
          <View style={styles.textInputWrapper}>
            <TextInput
              ref={inputRef}
              style={styles.textInput}
              placeholder="اسأل عن أي طبق منزلي..."
              placeholderTextColor="#9CA3AF"
              value={textInput}
              onChangeText={setTextInput}
              editable={!aiThinking}
              multiline
              textAlign="right"
            />
            <TouchableOpacity
              style={[styles.sendButton, (!textInput.trim() || aiThinking) && styles.sendDisabled]}
              onPress={() => handleAIRequest(textInput)}
              disabled={!textInput.trim() || aiThinking}
            >
              <Ionicons name="send" size={22} color={!textInput.trim() || aiThinking ? "#9CA3AF" : "#EF4444"} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {renderCartBar()}
    </View>
  );

  // شاشة التأكيد والطلبات المنفصلة - مع عرض رسوم التوصيل لكل شيف
  const renderCheckout = () => (
    <View style={[styles.screenContainer, { height: height - 100 }]}>
      <View style={styles.screenHeader}>
        <TouchableOpacity onPress={() => setStep('dishes')} style={styles.backButton}>
          <Ionicons name="arrow-forward" size={24} color="#EF4444" />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.screenTitle}>تأكيد الطلبات</Text>
          <Text style={styles.screenSubtitle}>أدخل بياناتك وراجع الطلبات</Text>
        </View>
        <TouchableOpacity onPress={() => setStep('dishes')} style={styles.homeButton}>
          <Ionicons name="home" size={24} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.checkoutContent}>
        <View style={styles.customerInfo}>
          <Text style={styles.sectionTitle}>📞 بيانات التوصيل</Text>
          <TextInput
            style={styles.input}
            placeholder="رقم الجوال"
            placeholderTextColor="#9CA3AF"
            value={customerPhone}
            onChangeText={setCustomerPhone}
            keyboardType="phone-pad"
          />
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="العنوان بالتفصيل"
            placeholderTextColor="#9CA3AF"
            value={customerAddress}
            onChangeText={setCustomerAddress}
            multiline
          />
        </View>

        {orders.length === 0 ? (
          <View style={styles.emptyCart}>
            <Ionicons name="cart-outline" size={60} color="#E5E7EB" />
            <Text style={styles.emptyCartText}>لا توجد طلبات</Text>
            <TouchableOpacity
              style={styles.continueShoppingButton}
              onPress={() => setStep('dishes')}
            >
              <Text style={styles.continueShoppingText}>متابعة التسوق</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {orders.map((order, orderIndex) => (
              <View key={order.chefId} style={styles.orderCard}>
                <View style={styles.orderHeader}>
                  <View style={styles.orderHeaderLeft}>
                    <Text style={styles.orderMerchant}>{order.chefName}</Text>
                    {order.isVerified && (
                      <Ionicons name="checkmark-circle" size={16} color="#10B981" style={styles.verifiedIcon} />
                    )}
                  </View>
                  <Text style={styles.orderTotal}>{order.total} ج</Text>
                </View>

                <View style={styles.deliveryInfoRow}>
                  <Text style={styles.deliveryInfoLabel}>⏱️ وقت التوصيل:</Text>
                  <Text style={styles.deliveryInfoValue}>{order.deliveryTime} دقيقة</Text>
                </View>

                {order.items.map((item, itemIndex) => (
                  <View key={itemIndex} style={styles.orderItem}>
                    <View style={styles.orderItemInfo}>
                      <Text style={styles.orderItemName}>{item.dish.name}</Text>
                      <Text style={styles.orderItemQuantity}>x{item.quantity}</Text>
                    </View>
                    <View style={styles.orderItemActions}>
                      <Text style={styles.orderItemPrice}>{item.dish.price * item.quantity} ج</Text>
                      <TouchableOpacity onPress={() => removeFromOrder(orderIndex, itemIndex)}>
                        <Ionicons name="close-circle" size={20} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}

                <View style={styles.orderSummary}>
                  <Text style={styles.summaryText}>إجمالي الأطباق: {order.foodTotal} ج</Text>
                  <Text style={styles.summaryText}>رسوم التوصيل: +{order.deliveryFee} ج</Text>
                  <View style={styles.summaryDivider} />
                  <Text style={styles.summaryTotal}>الإجمالي: {order.total} ج</Text>
                </View>

                <TouchableOpacity
                  style={[styles.sendOrderButton, sending && sendingOrder === order.chefId && styles.disabled]}
                  onPress={() => sendOrder(order)}
                  disabled={sending}
                >
                  {sending && sendingOrder === order.chefId ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <>
                      <Text style={styles.sendOrderButtonText}>إرسال طلب {order.chefName}</Text>
                      <Ionicons name="send" size={16} color="#FFF" />
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ))}

            {orders.length > 1 && (
              <TouchableOpacity
                style={[styles.sendAllButton, sending && styles.disabled]}
                onPress={sendAllOrders}
                disabled={sending}
              >
                {sending ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.sendAllButtonText}>إرسال كل الطلبات ({orders.length})</Text>
                )}
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={[styles.content, { height: height - 50 }]}>
          {step === 'dishes' && renderDishes()}
          {step === 'dishDetails' && renderDishDetails()}
          {step === 'chat' && renderChat()}
          {step === 'checkout' && renderCheckout()}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  content: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    marginTop: 30,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    overflow: 'hidden',
  },
  screenContainer: {
    flex: 1,
  },
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  closeButton: {
    padding: 8,
    marginLeft: 8,
  },
  homeButton: {
    padding: 8,
    marginLeft: 8,
  },
  headerTextContainer: {
    flex: 1,
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'right',
  },
  screenSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'right',
    marginTop: 2,
  },

  // زر المساعد الذكي
  chatAssistantButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EF4444',
    gap: 12,
  },
  assistantIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  assistantTextContainer: {
    flex: 1,
  },
  assistantTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#92400E',
  },
  assistantSubtitle: {
    fontSize: 12,
    color: '#6B7280',
  },

  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  dishCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dishImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
    marginRight: 12,
  },
  placeholderImage: {
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dishInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  dishHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dishName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  dishMerchant: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  dishPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#EF4444',
  },
  deliveryText: {
    fontSize: 11,
    color: '#10B981',
    marginTop: 2,
  },

  // شاشة التفاصيل
  detailsContent: {
    paddingBottom: 30,
  },
  detailImage: {
    width: '100%',
    height: 250,
    resizeMode: 'cover',
  },
  detailPlaceholder: {
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailInfo: {
    padding: 20,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  detailName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'right',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  verifiedText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
  detailMerchant: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 12,
    textAlign: 'right',
  },
  detailPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  detailPrice: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#EF4444',
  },
  deliveryInfoBox: {
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#B3E0FF',
  },
  deliveryInfoText: {
    fontSize: 14,
    color: '#0369A1',
    marginBottom: 4,
  },
  detailSection: {
    marginBottom: 20,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'right',
  },
  detailDescription: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 22,
    textAlign: 'right',
  },
  ingredientsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ingredientChip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  ingredientText: {
    fontSize: 12,
    color: '#1F2937',
  },
  videoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  videoButtonText: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '600',
  },
  detailQuantitySection: {
    marginBottom: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  quantityLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
    textAlign: 'right',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  quantityText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    minWidth: 40,
    textAlign: 'center',
  },
  detailActions: {
    gap: 12,
  },
  addToOrderButton: {
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  addToOrderButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // شاشة المحادثة
  chatContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  chatContent: {
    paddingVertical: 16,
  },
  messageWrapper: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  userWrapper: {
    justifyContent: 'flex-end',
  },
  aiWrapper: {
    justifyContent: 'flex-start',
  },
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 10,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: '#EF4444',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: '#FFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  userText: {
    color: '#FFF',
    fontSize: 13,
    lineHeight: 18,
  },
  aiText: {
    color: '#1F2937',
    fontSize: 13,
    lineHeight: 18,
  },
  timestamp: {
    fontSize: 9,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'left',
  },
  typingIndicator: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 6,
  },
  typingText: {
    fontSize: 11,
    color: '#6B7280',
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  textInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 80,
    fontSize: 13,
    color: '#1F2937',
    paddingVertical: 8,
    textAlign: 'right',
  },
  sendButton: {
    padding: 8,
  },
  sendDisabled: {
    opacity: 0.5,
  },

  // شريط السلة الثابت
  cartBar: {
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cartBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cartInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cartBarText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cartTotal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cartBarTotal: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },

  // شاشة التأكيد
  checkoutContent: {
    padding: 16,
    paddingBottom: 30,
  },
  customerInfo: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 13,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  orderCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  orderHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  orderMerchant: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  verifiedIcon: {
    marginLeft: 4,
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#EF4444',
  },
  deliveryInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F0F9FF',
    padding: 8,
    borderRadius: 6,
    marginBottom: 12,
  },
  deliveryInfoLabel: {
    fontSize: 13,
    color: '#0369A1',
    fontWeight: '600',
  },
  deliveryInfoValue: {
    fontSize: 13,
    color: '#0369A1',
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  orderItemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderItemName: {
    fontSize: 13,
    color: '#1F2937',
  },
  orderItemQuantity: {
    fontSize: 13,
    color: '#6B7280',
  },
  orderItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  orderItemPrice: {
    fontSize: 13,
    fontWeight: '600',
    color: '#EF4444',
  },
  orderSummary: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  summaryText: {
    fontSize: 13,
    color: '#4B5563',
    marginBottom: 4,
    textAlign: 'right',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 6,
  },
  summaryTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#EF4444',
    textAlign: 'right',
  },
  sendOrderButton: {
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  sendOrderButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  sendAllButton: {
    backgroundColor: '#10B981',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  sendAllButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyCart: {
    alignItems: 'center',
    padding: 40,
  },
  emptyCartText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
    marginBottom: 20,
  },
  continueShoppingButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  continueShoppingText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.6,
  },
});
