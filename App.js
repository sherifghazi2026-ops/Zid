import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// شاشات المصادقة
import SplashScreen from './src/screens/SplashScreen';
import LoginScreen from './src/screens/auth/LoginScreen';

// شاشات العميل
import CustomerScreen from './src/screens/CustomerScreen';
import RestaurantScreen from './src/screens/RestaurantScreen';
import GroceryScreen from './src/screens/GroceryScreen';
import IroningScreen from './src/screens/IroningScreen';
import KitchenScreen from './src/screens/KitchenScreen';
import PharmacyScreen from './src/screens/PharmacyScreen';
import ServiceScreen from './src/screens/ServiceScreen';

// شاشات الأدمن (الجديدة)
import AdminHomeScreen from './src/screens/AdminHomeScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator 
          initialRouteName="Splash"
          screenOptions={{ headerShown: false }}
        >
          {/* شاشات البداية والمصادقة */}
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />

          {/* شاشات العميل */}
          <Stack.Screen name="CustomerHome" component={CustomerScreen} />
          <Stack.Screen name="Restaurant" component={RestaurantScreen} />
          <Stack.Screen name="Grocery" component={GroceryScreen} />
          <Stack.Screen name="Ironing" component={IroningScreen} />
          <Stack.Screen name="Kitchen" component={KitchenScreen} />
          <Stack.Screen name="Pharmacy" component={PharmacyScreen} />
          <Stack.Screen name="Service" component={ServiceScreen} />

          {/* شاشات الأدمن */}
          <Stack.Screen name="AdminHome" component={AdminHomeScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
