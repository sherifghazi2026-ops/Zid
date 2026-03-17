import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, ActivityIndicator, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { CartProvider } from './src/context/CartContext';
import { TermsProvider } from './src/context/TermsContext';
import { loadSounds, cleanup } from './src/utils/SoundHelper';
import { initializeCoreServices } from './src/services/servicesService';
import { loadFonts } from './src/utils/fonts';

// شاشاتك الأساسية
import SplashScreen from './src/screens/SplashScreen';
import HomeScreen from './src/screens/HomeScreen';
import CustomerAuthScreen from './src/screens/CustomerAuthScreen';
import ServiceProviderScreen from './src/screens/ServiceProviderScreen';
import CompleteProfileScreen from './src/screens/CompleteProfileScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import MyOrdersScreen from './src/screens/MyOrdersScreen';
import TermsScreen from './src/screens/TermsScreen';

// استيرادات بقية الشاشات (اختصاراً)
import ServiceScreen from './src/screens/ServiceScreen';
import MerchantsListScreen from './src/screens/MerchantsListScreen';
import MerchantProductsScreen from './src/screens/merchant/MerchantProductsScreen';
import IroningScreen from './src/screens/IroningScreen';
import CartScreen from './src/screens/customer/CartScreen';
import OrderTrackingScreen from './src/screens/customer/OrderTrackingScreen';
import RateOrderScreen from './src/screens/customer/RateOrderScreen';
import ProductDetailsScreen from './src/screens/customer/ProductDetailsScreen';
import DishDetailsScreen from './src/screens/customer/DishDetailsScreen';
import ItemsServiceScreen from './src/screens/ItemsServiceScreen';
import ProductsServiceScreen from './src/screens/ProductsServiceScreen';
import RestaurantListScreen from './src/screens/restaurant/RestaurantListScreen';
import RestaurantDishesScreen from './src/screens/restaurant/RestaurantDishesScreen';
import HomeChefsScreen from './src/screens/homechef/HomeChefsScreen';
import HomeChefDishesScreen from './src/screens/homechef/HomeChefDishesScreen';
import MerchantDashboard from './src/screens/merchant/MerchantDashboard';
import MerchantOrdersScreen from './src/screens/merchant/MerchantOrdersScreen';
import OrderDetailsScreen from './src/screens/merchant/OrderDetailsScreen';
import MyProductsScreen from './src/screens/merchant/MyProductsScreen';
import AddProductScreen from './src/screens/merchant/AddProductScreen';
import MyDishesScreen from './src/screens/merchant/MyDishesScreen';
import AddDishScreen from './src/screens/merchant/AddDishScreen';
import EditDishScreen from './src/screens/merchant/EditDishScreen';
import AddHomeChefDishScreen from './src/screens/merchant/AddHomeChefDishScreen';
import DriverDashboard from './src/screens/driver/DriverDashboard';
import DriverDeliveriesScreen from './src/screens/driver/DriverDeliveriesScreen';
import DriverLoginScreen from './src/screens/auth/DriverLoginScreen';
import LoginScreen from './src/screens/auth/LoginScreen';
import MerchantRegisterScreen from './src/screens/auth/MerchantRegisterScreen';
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
import ManagePlacesScreen from './src/screens/admin/ManagePlacesScreen';
import ManageHomeChefsScreen from './src/screens/admin/ManageHomeChefsScreen';
import VerificationRequestsScreen from './src/screens/admin/VerificationRequestsScreen';
import ManageLaundryItemsScreen from './src/screens/admin/ManageLaundryItemsScreen';
import ReviewProductsScreen from './src/screens/admin/ReviewProductsScreen';
import OffersScreen from './src/screens/OffersScreen';
import EshopScreen from './src/screens/EshopScreen';

// ✅ رادار الأعطال الذكي (ErrorBoundary)
class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.log('❌ CRASH DETECTED:', error);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <ScrollView contentContainerStyle={styles.errorBox}>
            <Text style={styles.errorTitle}>⚠️ رادار أعطال Zid</Text>
            <Text style={styles.errorLabel}>رسالة الخطأ:</Text>
            <Text style={styles.errorMessage}>{this.state.error?.toString()}</Text>
            
            <Text style={styles.errorLabel}>مكان الانهيار (Stack Trace):</Text>
            <Text style={styles.errorStack}>{this.state.errorInfo?.componentStack}</Text>
            
            <TouchableOpacity 
              style={styles.retryButton} 
              onPress={() => this.setState({ hasError: false })}
            >
              <Text style={{color: '#FFF', fontWeight: 'bold'}}>محاولة إعادة تشغيل</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}

// ... بقية الـ Stacks والـ Tabs (كودك الأصلي) ...
const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const AiMainModal = ({ navigation }) => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' }}>
    <Ionicons name="flash" size={80} color="#8B5CF6" />
    <Text style={{ fontSize: 20, fontWeight: 'bold', marginTop: 20 }}>خدمات الذكاء الاصطناعي</Text>
    <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 30, backgroundColor: '#8B5CF6', padding: 12, borderRadius: 8 }}>
      <Text style={{ color: '#FFF' }}>رجوع</Text>
    </TouchableOpacity>
  </View>
);

function CustomerStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CustomerMain" component={HomeScreen} />
      <Stack.Screen name="ServiceScreen" component={ServiceScreen} />
      <Stack.Screen name="MerchantsListScreen" component={MerchantsListScreen} />
      <Stack.Screen name="MerchantProductsScreen" component={MerchantProductsScreen} />
      <Stack.Screen name="IroningScreen" component={IroningScreen} />
      <Stack.Screen name="RestaurantList" component={RestaurantListScreen} />
      <Stack.Screen name="RestaurantDishesScreen" component={RestaurantDishesScreen} />
      <Stack.Screen name="HomeChefsScreen" component={HomeChefsScreen} />
      <Stack.Screen name="HomeChefDishesScreen" component={HomeChefDishesScreen} />
      <Stack.Screen name="ProductDetailsScreen" component={ProductDetailsScreen} />
      <Stack.Screen name="DishDetails" component={DishDetailsScreen} />
      <Stack.Screen name="Cart" component={CartScreen} />
      <Stack.Screen name="OrderTrackingScreen" component={OrderTrackingScreen} />
      <Stack.Screen name="RateOrderScreen" component={RateOrderScreen} />
      <Stack.Screen name="ItemsServiceScreen" component={ItemsServiceScreen} />
      <Stack.Screen name="ProductsServiceScreen" component={ProductsServiceScreen} />
    </Stack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = route.name === 'طلب' ? (focused ? 'cart' : 'cart-outline') : 
                         route.name === 'عروض' ? (focused ? 'pricetag' : 'pricetag-outline') : 
                         (focused ? 'storefront' : 'storefront-outline');
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#F59E0B',
        tabBarInactiveTintColor: '#9CA3AF',
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
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }} initialRouteName="Splash">
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
      <Stack.Screen name="TermsScreen" component={TermsScreen} />
      <Stack.Screen name="MerchantDashboard" component={MerchantDashboard} />
      <Stack.Screen name="MerchantOrdersScreen" component={MerchantOrdersScreen} />
      <Stack.Screen name="OrderDetailsScreen" component={OrderDetailsScreen} />
      <Stack.Screen name="MyProductsScreen" component={MyProductsScreen} />
      <Stack.Screen name="AddProductScreen" component={AddProductScreen} />
      <Stack.Screen name="MyDishesScreen" component={MyDishesScreen} />
      <Stack.Screen name="AddDishScreen" component={AddDishScreen} />
      <Stack.Screen name="EditDishScreen" component={EditDishScreen} />
      <Stack.Screen name="AddHomeChefDishScreen" component={AddHomeChefDishScreen} />
      <Stack.Screen name="DriverDashboard" component={DriverDashboard} />
      <Stack.Screen name="DriverDeliveries" component={DriverDeliveriesScreen} />
      <Stack.Screen name="AdminHome" component={AdminHomeScreen} />
      <Stack.Screen name="UserManagement" component={UserManagement} />
      <Stack.Screen name="UserEditScreen" component={UserEditScreen} />
      <Stack.Screen name="AdminOrders" component={AdminOrdersScreen} />
      <Stack.Screen name="AddUser" component={AddUserScreen} />
      <Stack.Screen name="ServicesManagement" component={ServicesManagementScreen} />
      <Stack.Screen name="AddService" component={AddServiceScreen} />
      <Stack.Screen name="EditService" component={EditServiceScreen} />
      <Stack.Screen name="AdminAssistants" component={AdminAssistantsScreen} />
      <Stack.Screen name="ManageOffers" component={ManageOffersScreen} />
      <Stack.Screen name="ManagePlacesScreen" component={ManagePlacesScreen} />
      <Stack.Screen name="ManageHomeChefs" component={ManageHomeChefsScreen} />
      <Stack.Screen name="VerificationRequestsScreen" component={VerificationRequestsScreen} />
      <Stack.Screen name="ManageLaundryItemsScreen" component={ManageLaundryItemsScreen} />
      <Stack.Screen name="ReviewProductsScreen" component={ReviewProductsScreen} />
      <Stack.Screen name="AiMainModal" component={AiMainModal} />
    </Stack.Navigator>
  );
}

function AppContent() {
  const [appIsReady, setAppIsReady] = React.useState(false);

  React.useEffect(() => {
    async function prepare() {
      try {
        await loadFonts();
        await loadSounds();
        await initializeCoreServices();
      } catch (error) {
        console.error('❌ Error during init:', error);
      } finally {
        setAppIsReady(true);
      }
    }
    prepare();
    return () => cleanup();
  }, []);

  if (!appIsReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F59E0B" />
        <Text style={styles.loadingText}>جاري تشغيل Zid...</Text>
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

export default function App() {
  return (
    <GlobalErrorBoundary>
      <AppContent />
    </GlobalErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' },
  loadingText: { marginTop: 12, color: '#6B7280', fontSize: 14 },
  errorContainer: { flex: 1, backgroundColor: '#111827', padding: 20, paddingTop: 50 },
  errorBox: { paddingBottom: 40 },
  errorTitle: { color: '#EF4444', fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  errorLabel: { color: '#9CA3AF', fontSize: 14, marginTop: 15, fontWeight: 'bold' },
  errorMessage: { color: '#FEE2E2', backgroundColor: '#7F1D1D', padding: 10, borderRadius: 8, marginTop: 5 },
  errorStack: { color: '#D1D5DB', backgroundColor: '#1F2937', padding: 10, borderRadius: 8, marginTop: 5, fontSize: 10 },
  retryButton: { marginTop: 30, backgroundColor: '#F59E0B', padding: 15, borderRadius: 8, alignItems: 'center' }
});
