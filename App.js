import 'react-native-gesture-handler';
import { enableScreens } from 'react-native-screens';
enableScreens(true);

import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { CartProvider } from './src/context/CartContext';
import { TermsProvider } from './src/context/TermsContext';
import { loadFonts } from './src/utils/fonts';
import { loadSounds, cleanup } from './src/utils/SoundHelper';

// شاشات البداية والأساسية
import SplashScreen from './src/screens/SplashScreen';
import HomeScreen from './src/screens/HomeScreen';

// باقي الاستيرادات (أضفها كلها)
import CustomerAuthScreen from './src/screens/CustomerAuthScreen';
import ServiceProviderScreen from './src/screens/ServiceProviderScreen';
// ... إلخ (ضع كل الاستيرادات من ملفك الأصلي)

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

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
        headerShown: false,
      })}
    >
      <Tab.Screen name="طلب" component={HomeScreen} />
      <Tab.Screen name="عروض" component={HomeScreen} /> // مؤقتاً
      <Tab.Screen name="متجر" component={HomeScreen} /> // مؤقتاً
    </Tab.Navigator>
  );
}

function RootStack() {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName="Splash"
    >
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="CustomerAuth" component={CustomerAuthScreen} />
      <Stack.Screen name="ServiceProvider" component={ServiceProviderScreen} />
      {/* أضف باقي الشاشات هنا */}
    </Stack.Navigator>
  );
}

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // تحميل الخطوط (مع fallback)
        await loadFonts().catch(() => console.log('⚠️ Fonts failed'));
        
        // تحميل الأصوات (معطل مؤقتاً)
        // await loadSounds().catch(() => console.log('⚠️ Sounds failed'));
        
        console.log('✅ التطبيق جاهز');
      } catch (error) {
        console.error('❌ خطأ:', error);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();

    return () => {
      cleanup();
    };
  }, []);

  if (!appIsReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text>جاري التحميل...</Text>
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
