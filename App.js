import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { View, Text } from 'react-native';

// شاشات
import SplashScreen from './src/screens/SplashScreen';
import CustomerScreen from './src/screens/CustomerScreen';
import CustomerAuthScreen from './src/screens/CustomerAuthScreen';
import ServiceProviderScreen from './src/screens/ServiceProviderScreen';
import CompleteProfileScreen from './src/screens/CompleteProfileScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import MyOrdersScreen from './src/screens/MyOrdersScreen';
import MerchantDashboard from './src/screens/merchant/MerchantDashboard';
import DriverDashboard from './src/screens/driver/DriverDashboard';
import OrderTracking from './src/screens/customer/OrderTracking';
import AdminHomeScreen from './src/screens/AdminHomeScreen';
import UserManagement from './src/screens/admin/UserManagement';
import AdminOrdersScreen from './src/screens/admin/AdminOrdersScreen';
import AddUserScreen from './src/screens/admin/AddUserScreen';
import ServicesManagementScreen from './src/screens/admin/ServicesManagementScreen';
import ManageOffersScreen from './src/screens/admin/ManageOffersScreen';
import OffersScreen from './src/screens/OffersScreen';

// شاشات العميل
import RestaurantScreen from './src/screens/RestaurantScreen';
import GroceryScreen from './src/screens/GroceryScreen';
import IroningScreen from './src/screens/IroningScreen';
import KitchenScreen from './src/screens/KitchenScreen';
import PharmacyScreen from './src/screens/PharmacyScreen';
import ServiceScreen from './src/screens/ServiceScreen';

// خدمات
import { initializeServices } from './src/services/servicesService';
import { debugServices } from './src/debugServices';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function CustomerStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CustomerMain" component={CustomerScreen} />
      <Stack.Screen name="Restaurant" component={RestaurantScreen} />
      <Stack.Screen name="Grocery" component={GroceryScreen} />
      <Stack.Screen name="Ironing" component={IroningScreen} />
      <Stack.Screen name="Kitchen" component={KitchenScreen} />
      <Stack.Screen name="Pharmacy" component={PharmacyScreen} />
      <Stack.Screen name="Winch" component={ServiceScreen} initialParams={{ serviceType: 'winch' }} />
      <Stack.Screen name="Electrician" component={ServiceScreen} initialParams={{ serviceType: 'electrician' }} />
      <Stack.Screen name="Moving" component={ServiceScreen} initialParams={{ serviceType: 'moving' }} />
      <Stack.Screen name="Marble" component={ServiceScreen} initialParams={{ serviceType: 'marble' }} />
      <Stack.Screen name="Plumbing" component={ServiceScreen} initialParams={{ serviceType: 'plumbing' }} />
      <Stack.Screen name="Carpentry" component={ServiceScreen} initialParams={{ serviceType: 'carpentry' }} />
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
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#F59E0B',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: { backgroundColor: '#FFF', borderTopColor: '#E5E7EB', paddingBottom: 5, height: 60 },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '500' },
        headerShown: false,
      })}
    >
      <Tab.Screen name="طلب" component={CustomerStack} />
      <Tab.Screen name="عروض" component={OffersScreen} />
    </Tab.Navigator>
  );
}

function RootStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Splash">
      {/* شاشات البداية */}
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="CustomerScreen" component={CustomerScreen} />
      <Stack.Screen name="CustomerAuth" component={CustomerAuthScreen} />
      
      {/* شاشات الدخول الموحدة لمقدمي الخدمة */}
      <Stack.Screen name="ServiceProvider" component={ServiceProviderScreen} />
      <Stack.Screen name="CompleteProfile" component={CompleteProfileScreen} />
      
      {/* شاشات العميل المسجل */}
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="MyOrders" component={MyOrdersScreen} />
      
      {/* لوحات التحكم */}
      <Stack.Screen name="MerchantDashboard" component={MerchantDashboard} />
      <Stack.Screen name="DriverDashboard" component={DriverDashboard} />
      <Stack.Screen name="OrderTracking" component={OrderTracking} />
      
      {/* شاشات الأدمن */}
      <Stack.Screen name="AdminHome" component={AdminHomeScreen} />
      <Stack.Screen name="UserManagement" component={UserManagement} />
      <Stack.Screen name="AdminOrders" component={AdminOrdersScreen} />
      <Stack.Screen name="AddUser" component={AddUserScreen} />
      <Stack.Screen name="ServicesManagement" component={ServicesManagementScreen} />
      <Stack.Screen name="ManageOffers" component={ManageOffersScreen} />
      
      {/* الشاشة الرئيسية للعميل (تاب) */}
      <Stack.Screen name="MainTabs" component={MainTabs} />
    </Stack.Navigator>
  );
}

export default function App() {
  // تهيئة الخدمات عند بدء التطبيق
  useEffect(() => {
    const init = async () => {
      await initializeServices();
      await debugServices();
    };
    init();
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <RootStack />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
