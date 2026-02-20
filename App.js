import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { View, Text } from 'react-native';

// شاشات العميل
import CustomerScreen from './src/screens/CustomerScreen';
import RestaurantScreen from './src/screens/RestaurantScreen';
import GroceryScreen from './src/screens/GroceryScreen';
import IroningScreen from './src/screens/IroningScreen';
import KitchenScreen from './src/screens/KitchenScreen';
import PharmacyScreen from './src/screens/PharmacyScreen';
import ServiceScreen from './src/screens/ServiceScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function CustomerStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CustomerMain" component={CustomerScreen} />
      
      {/* الأنظمة الحالية */}
      <Stack.Screen name="Restaurant" component={RestaurantScreen} />
      <Stack.Screen name="Grocery" component={GroceryScreen} />
      <Stack.Screen name="Ironing" component={IroningScreen} />
      <Stack.Screen name="Kitchen" component={KitchenScreen} />
      <Stack.Screen name="Pharmacy" component={PharmacyScreen} />
      
      {/* الخدمات العامة */}
      <Stack.Screen name="Winch" component={ServiceScreen} initialParams={{ serviceType: 'winch' }} />
      <Stack.Screen name="Electrician" component={ServiceScreen} initialParams={{ serviceType: 'electrician' }} />
      <Stack.Screen name="Moving" component={ServiceScreen} initialParams={{ serviceType: 'moving' }} />
      <Stack.Screen name="Marble" component={ServiceScreen} initialParams={{ serviceType: 'marble' }} />
      <Stack.Screen name="Plumbing" component={ServiceScreen} initialParams={{ serviceType: 'plumbing' }} />
      <Stack.Screen name="Carpentry" component={ServiceScreen} initialParams={{ serviceType: 'carpentry' }} />
    </Stack.Navigator>
  );
}

// شاشة العروض
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

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ focused, color, size }) => {
              let iconName;

              if (route.name === 'طلب') {
                iconName = focused ? 'cart' : 'cart-outline';
              } else if (route.name === 'عروض') {
                iconName = focused ? 'pricetag' : 'pricetag-outline';
              }

              return <Ionicons name={iconName} size={size} color={color} />;
            },
            tabBarActiveTintColor: '#F59E0B',
            tabBarInactiveTintColor: '#9CA3AF',
            tabBarStyle: {
              backgroundColor: '#FFFFFF',
              borderTopWidth: 1,
              borderTopColor: '#E5E7EB',
              paddingBottom: 5,
              paddingTop: 5,
              height: 60,
            },
            tabBarLabelStyle: {
              fontSize: 12,
              fontWeight: '500',
            },
            headerShown: false,
          })}
        >
          <Tab.Screen name="طلب" component={CustomerStack} />
          <Tab.Screen name="عروض" component={OffersScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
