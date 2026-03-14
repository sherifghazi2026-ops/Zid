import 'react-native-gesture-handler';
import { enableScreens } from 'react-native-screens';
enableScreens(true);

import React, { useEffect, useState } from 'react';
import { View, Text, SafeAreaView, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { CartProvider } from './src/context/CartContext';
import { TermsProvider } from './src/context/TermsContext';
import { loadFonts, fontFamily } from './src/utils/fonts';
import { loadSounds, cleanup } from './src/utils/SoundHelper';

// ============ شاشة واحدة فقط للاختبار ============
import SplashScreen from './src/screens/SplashScreen';
import HomeScreen from './src/screens/HomeScreen';

const Stack = createStackNavigator();

function RootStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Splash">
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Home" component={HomeScreen} />
    </Stack.Navigator>
  );
}

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        await loadFonts();
        // await loadSounds(); // معطل مؤقتاً
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
