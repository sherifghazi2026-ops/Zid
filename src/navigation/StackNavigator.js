import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from '../screens/HomeScreen';
import ServiceScreen from '../screens/ServiceScreen';
import { colors } from '../constants/colors';

const Stack = createStackNavigator();

const StackNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.background.primary,
          },
          headerTintColor: colors.text.primary,
          headerTitleStyle: {
            fontWeight: '600',
          },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen 
          name="Home" 
          component={HomeScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Service" 
          component={ServiceScreen} 
          options={({ route }) => ({ 
            title: route.params?.category?.name || 'الخدمة',
            headerBackTitleVisible: false,
          })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default StackNavigator;
