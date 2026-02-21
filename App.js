import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { View, Text } from 'react-native';

// شاشات المصادقة والترحيب
import CustomerScreen from './src/screens/CustomerScreen';
import CustomerAuthScreen from './src/screens/CustomerAuthScreen';
import MerchantLoginScreen from './src/screens/auth/LoginScreen';
import DriverLoginScreen from './src/screens/auth/DriverLoginScreen';

// شاشات العميل
import RestaurantScreen from './src/screens/RestaurantScreen';
import GroceryScreen from './src/screens/GroceryScreen';
import IroningScreen from './src/screens/IroningScreen';
import KitchenScreen from './src/screens/KitchenScreen';
import PharmacyScreen from './src/screens/PharmacyScreen';
import ServiceScreen from './src/screens/ServiceScreen';

// شاشات الأدمن
import AdminHomeScreen from './src/screens/AdminHomeScreen';

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

function OffersScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' }}>
      <Ionicons name="pricetag-outline" size={80} color="#F59E0B" />
      <Text style={{ fontSize: 20, fontWeight: 'bold', marginTop: 20, color: '#1F2937' }}>العروض</Text>
      <Text style={{ fontSize: 14, color: '#6B7280', marginTop: 10, textAlign: 'center', paddingHorizontal: 30 }}>
        قريباً ... عروض حصرية من ZAYED ID
      </Text>
    </View>
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
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="CustomerScreen">
      <Stack.Screen name="CustomerScreen" component={CustomerScreen} />
      <Stack.Screen name="CustomerAuth" component={CustomerAuthScreen} />
      <Stack.Screen name="MerchantLogin" component={MerchantLoginScreen} />
      <Stack.Screen name="DriverLogin" component={DriverLoginScreen} />
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="AdminHome" component={AdminHomeScreen} />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <RootStack />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
