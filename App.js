import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { CartProvider } from './src/context/CartContext';
import { TermsProvider } from './src/context/TermsContext';
import { loadFonts, fontFamily } from './src/utils/fonts';
import { loadSounds, cleanup } from './src/utils/SoundHelper';
import { initializeCoreServices } from './src/services/servicesService';
import { initializePlacesCollection } from './src/services/placesService';

// شاشات البداية والأساسية
import SplashScreen from './src/screens/SplashScreen';
import HomeScreen from './src/screens/HomeScreen';
import CustomerAuthScreen from './src/screens/CustomerAuthScreen';
import ServiceProviderScreen from './src/screens/ServiceProviderScreen';
import CompleteProfileScreen from './src/screens/CompleteProfileScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import MyOrdersScreen from './src/screens/MyOrdersScreen';
import OrderTracking from './src/screens/customer/OrderTracking';

// شاشات الخدمات
import ServiceScreen from './src/screens/ServiceScreen';
import ItemsServiceScreen from './src/screens/ItemsServiceScreen';
import IroningScreen from './src/screens/IroningScreen';
import ServiceItemsScreen from './src/screens/ServiceItemsScreen';
import ProductDetailsScreen from './src/screens/customer/ProductDetailsScreen';

// لوحات التحكم
import MerchantDashboard from './src/screens/merchant/MerchantDashboard';
import DriverDashboard from './src/screens/driver/DriverDashboard';
import DriverDeliveriesScreen from './src/screens/driver/DriverDeliveriesScreen';

// شاشات المطاعم
import RestaurantListScreen from './src/screens/restaurant/RestaurantListScreen';
import RestaurantDishesScreen from './src/screens/restaurant/RestaurantDishesScreen';
import RestaurantPDFViewer from './src/screens/restaurant/RestaurantPDFViewer';
import RestaurantOrderScreen from './src/screens/restaurant/RestaurantOrderScreen';

// شاشات الأكل البيتي
import HomeChefsScreen from './src/screens/homechef/HomeChefsScreen';
import HomeChefDishesScreen from './src/screens/homechef/HomeChefDishesScreen';

// شاشات إضافة الأطباق
import AddHomeChefDishScreen from './src/screens/merchant/AddHomeChefDishScreen';
import AddDishScreen from './src/screens/merchant/AddDishScreen';
import MyDishesScreen from './src/screens/merchant/MyDishesScreen';
import EditDishScreen from './src/screens/merchant/EditDishScreen';

// شاشات السلة وتفاصيل الطبق
import DishDetailsScreen from './src/screens/customer/DishDetailsScreen';
import CartScreen from './src/screens/customer/CartScreen';

// شاشات إضافية
import OffersScreen from './src/screens/OffersScreen';
import EshopScreen from './src/screens/EshopScreen';

// شاشات الدخول
import DriverLoginScreen from './src/screens/auth/DriverLoginScreen';
import LoginScreen from './src/screens/auth/LoginScreen';
import MerchantRegisterScreen from './src/screens/auth/MerchantRegisterScreen';

// شاشات الأدمن
import AdminHomeScreen from './src/screens/admin/AdminHomeScreen';
import UserManagement from './src/screens/admin/UserManagement';
import UserEditScreen from './src/screens/admin/UserEditScreen';
import AdminOrdersScreen from './src/screens/admin/AdminOrdersScreen';
import AddUserScreen from './src/screens/admin/AddUserScreen';
import ServicesManagementScreen from './src/screens/admin/ServicesManagementScreen';
import AddServiceScreen from './src/screens/admin/AddServiceScreen';
import AdminAssistantsScreen from './src/screens/admin/AdminAssistantsScreen';
import EditServiceScreen from './src/screens/admin/EditServiceScreen';
import ManageOffersScreen from './src/screens/admin/ManageOffersScreen';
import ManageProductsScreen from './src/screens/admin/ManageProductsScreen';
import ManageProductCategoriesScreen from './src/screens/admin/ManageProductCategoriesScreen';
import ManageLaundryItemsScreen from './src/screens/admin/ManageLaundryItemsScreen';
import ManageRestaurantsScreen from './src/screens/admin/ManageRestaurantsScreen';
import AddRestaurantScreen from './src/screens/admin/AddRestaurantScreen';
import EditRestaurantScreen from './src/screens/admin/EditRestaurantScreen';
import ManagePlacesScreen from './src/screens/admin/ManagePlacesScreen';
import ReviewDishesScreen from './src/screens/admin/ReviewDishesScreen';
import ManageHomeChefsScreen from './src/screens/admin/ManageHomeChefsScreen';
import AdminProductsReviewScreen from './src/screens/admin/AdminProductsReviewScreen';

// شاشات جديدة
import TermsScreen from './src/screens/TermsScreen';
import VerificationRequestsScreen from './src/screens/admin/VerificationRequestsScreen';
import RateOrderScreen from './src/screens/customer/RateOrderScreen';

// شاشات التجار
import MerchantOrdersScreen from './src/screens/merchant/MerchantOrdersScreen';
import MyProductsScreen from './src/screens/merchant/MyProductsScreen';
import AddProductScreen from './src/screens/merchant/AddProductScreen';
import OrderDetailsScreen from './src/screens/merchant/OrderDetailsScreen';

// شاشات التجار والمنتجات
import ProvidersListScreen from './src/screens/ProvidersListScreen';
import ProviderProductsScreen from './src/screens/ProviderProductsScreen';

// شاشة تتبع الطلب للعميل
import OrderTrackingScreen from './src/screens/customer/OrderTrackingScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Stack مخصص للعملاء
function CustomerStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CustomerMain" component={HomeScreen} />
      <Stack.Screen name="ServiceScreen" component={ServiceScreen} />
      <Stack.Screen name="RestaurantList" component={RestaurantListScreen} />
      <Stack.Screen name="RestaurantDishesScreen" component={RestaurantDishesScreen} />
      <Stack.Screen name="RestaurantPDFViewer" component={RestaurantPDFViewer} />
      <Stack.Screen name="RestaurantOrder" component={RestaurantOrderScreen} />
      <Stack.Screen name="HomeChefsScreen" component={HomeChefsScreen} />
      <Stack.Screen name="HomeChefDishesScreen" component={HomeChefDishesScreen} />
      <Stack.Screen name="DishDetails" component={DishDetailsScreen} />
      <Stack.Screen name="Cart" component={CartScreen} />
      <Stack.Screen name="AddHomeChefDishScreen" component={AddHomeChefDishScreen} />
      <Stack.Screen name="MyChefDishesScreen" component={HomeChefDishesScreen} />
      <Stack.Screen name="AddDishScreen" component={AddDishScreen} />
      <Stack.Screen name="MyDishesScreen" component={MyDishesScreen} />
      <Stack.Screen name="EditDishScreen" component={EditDishScreen} />
      <Stack.Screen name="ServiceItemsScreen" component={ServiceItemsScreen} />
      <Stack.Screen name="ProductDetailsScreen" component={ProductDetailsScreen} />
      <Stack.Screen name="ProvidersListScreen" component={ProvidersListScreen} />
      <Stack.Screen name="ProviderProductsScreen" component={ProviderProductsScreen} />
      <Stack.Screen name="OrderTrackingScreen" component={OrderTrackingScreen} />
      <Stack.Screen name="RateOrderScreen" component={RateOrderScreen} />
    </Stack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'طلب') iconName = focused ? 'cart' : 'cart-outline';
          else if (route.name === 'عروض') iconName = focused ? 'pricetag' : 'pricetag-outline';
          else if (route.name === 'متجر') iconName = focused ? 'storefront' : 'storefront-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#F59E0B',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: { backgroundColor: '#FFF', borderTopColor: '#E5E7EB', paddingBottom: 5, height: 60 },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '500', fontFamily: fontFamily.arabic },
        headerShown: false,
      })}
    >
      <Tab.Screen name="طلب" component={CustomerStack} />
      <Tab.Screen name="عروض" component={OffersScreen} />
      <Tab.Screen name="متجر" component={EshopScreen} />
    </Tab.Navigator>
  );
}

function RootStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        presentation: 'card',
        animation: 'slide_from_right',
      }}
      initialRouteName="Splash"
    >
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="MainTabs" component={MainTabs} />

      <Stack.Screen name="CustomerAuth" component={CustomerAuthScreen} />
      <Stack.Screen name="ServiceProvider" component={ServiceProviderScreen} />
      <Stack.Screen name="DriverLogin" component={DriverLoginScreen} />
      <Stack.Screen name="LoginScreen" component={LoginScreen} />
      <Stack.Screen name="MerchantRegister" component={MerchantRegisterScreen} />
      <Stack.Screen name="CompleteProfile" component={CompleteProfileScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="MyOrders" component={MyOrdersScreen} />

      <Stack.Screen name="MerchantDashboard" component={MerchantDashboard} />
      <Stack.Screen name="MerchantOrdersScreen" component={MerchantOrdersScreen} />
      <Stack.Screen name="OrderDetailsScreen" component={OrderDetailsScreen} />
      <Stack.Screen name="MyProductsScreen" component={MyProductsScreen} />
      <Stack.Screen name="AddProductScreen" component={AddProductScreen} />

      <Stack.Screen name="DriverDashboard" component={DriverDashboard} />
      <Stack.Screen name="DriverDeliveries" component={DriverDeliveriesScreen} />

      <Stack.Screen name="OrderTracking" component={OrderTracking} />
      <Stack.Screen name="ItemsServiceScreen" component={ItemsServiceScreen} />
      <Stack.Screen name="IroningScreen" component={IroningScreen} />
      <Stack.Screen name="ServiceItemsScreen" component={ServiceItemsScreen} />
      <Stack.Screen name="ProductDetailsScreen" component={ProductDetailsScreen} />
      <Stack.Screen name="ManageLaundryItemsScreen" component={ManageLaundryItemsScreen} />

      <Stack.Screen name="AdminHome" component={AdminHomeScreen} />
      <Stack.Screen name="UserManagement" component={UserManagement} />
      <Stack.Screen name="UserEditScreen" component={UserEditScreen} />
      <Stack.Screen name="AdminOrders" component={AdminOrdersScreen} />
      <Stack.Screen name="AddUser" component={AddUserScreen} />
      <Stack.Screen name="ServicesManagement" component={ServicesManagementScreen} />
      <Stack.Screen name="AddService" component={AddServiceScreen} />
      <Stack.Screen name="AdminAssistants" component={AdminAssistantsScreen} />
      <Stack.Screen name="EditService" component={EditServiceScreen} />
      <Stack.Screen name="ManageOffers" component={ManageOffersScreen} />
      <Stack.Screen name="ManageProducts" component={ManageProductsScreen} />
      <Stack.Screen name="ManageProductCategories" component={ManageProductCategoriesScreen} />
      <Stack.Screen name="ManageLaundryItems" component={ManageLaundryItemsScreen} />
      <Stack.Screen name="ManageRestaurants" component={ManageRestaurantsScreen} />
      <Stack.Screen name="AddRestaurant" component={AddRestaurantScreen} />
      <Stack.Screen name="EditRestaurant" component={EditRestaurantScreen} />
      <Stack.Screen name="ManagePlacesScreen" component={ManagePlacesScreen} />
      <Stack.Screen name="ReviewDishes" component={ReviewDishesScreen} />
      <Stack.Screen name="ManageHomeChefs" component={ManageHomeChefsScreen} />
      <Stack.Screen name="AdminProductsReview" component={AdminProductsReviewScreen} />

      {/* الشاشات الجديدة */}
      <Stack.Screen name="TermsScreen" component={TermsScreen} />
      <Stack.Screen name="VerificationRequestsScreen" component={VerificationRequestsScreen} />
      <Stack.Screen name="RateOrderScreen" component={RateOrderScreen} />
    </Stack.Navigator>
  );
}

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        await loadFonts();
        console.log('✅ تم تحميل الخطوط');
        
        await loadSounds();
        console.log('✅ تم تحميل الأصوات');
        
        console.log('🚀 بدء تهيئة الخدمات الأساسية...');
        await initializeCoreServices();
        console.log('✅ تم تهيئة الخدمات الأساسية');

        // محاولة تهيئة places collection (اختياري)
        try {
          await initializePlacesCollection();
        } catch (e) {
          console.log('⚠️ لم يتم تهيئة places collection');
        }

      } catch (error) {
        console.error('❌ خطأ في التحميل:', error);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();

    // ✅ تنظيف الموارد عند إغلاق التطبيق
    return () => {
      cleanup();
    };
  }, []);

  if (!appIsReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={[styles.loadingText, { fontFamily: fontFamily.arabic }]}>
          جاري تحميل التطبيق...
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <TermsProvider>
        <CartProvider>
          <NavigationContainer>
            <RootStack />
          </NavigationContainer>
        </CartProvider>
      </TermsProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 12,
    color: '#6B7280',
    fontSize: 14,
  },
});
