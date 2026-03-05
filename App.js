import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity, View, Text } from 'react-native';

// شاشات البداية والأساسية
import SplashScreen from './src/screens/SplashScreen';
import HomeScreen from './src/screens/HomeScreen';
import CustomerAuthScreen from './src/screens/CustomerAuthScreen';
import ServiceProviderScreen from './src/screens/ServiceProviderScreen';
import CompleteProfileScreen from './src/screens/CompleteProfileScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import MyOrdersScreen from './src/screens/MyOrdersScreen';
import OrderTracking from './src/screens/customer/OrderTracking';

// شاشات الخدمات والمطاعم
import ServiceScreen from './src/screens/ServiceScreen';
import RestaurantScreen from './src/screens/RestaurantScreen';
import ItemsServiceScreen from './src/screens/ItemsServiceScreen';
import IroningScreen from './src/screens/IroningScreen';

// لوحات التحكم
import MerchantDashboard from './src/screens/merchant/MerchantDashboard';
import DriverDashboard from './src/screens/driver/DriverDashboard';
import DriverDeliveriesScreen from './src/screens/driver/DriverDeliveriesScreen';

// شاشات المطاعم
import ManageMenuScreen from './src/screens/merchant/ManageMenuScreen';
import MerchantOrdersScreen from './src/screens/merchant/MerchantOrdersScreen';

// شاشات الأدمن
import AdminHomeScreen from './src/screens/admin/AdminHomeScreen';
import UserManagement from './src/screens/admin/UserManagement';
import UserEditScreen from './src/screens/admin/UserEditScreen';
import AdminOrdersScreen from './src/screens/admin/AdminOrdersScreen';
import AddUserScreen from './src/screens/admin/AddUserScreen';
import ServicesManagementScreen from './src/screens/admin/ServicesManagementScreen';
import AddServiceScreen from './src/screens/admin/AddServiceScreen';
import EditServiceScreen from './src/screens/admin/EditServiceScreen';
import ManageOffersScreen from './src/screens/admin/ManageOffersScreen';
import ManageProductsScreen from './src/screens/admin/ManageProductsScreen';
import ManageProductCategoriesScreen from './src/screens/admin/ManageProductCategoriesScreen';
import ManageLaundryItemsScreen from './src/screens/admin/ManageLaundryItemsScreen';
import ManageRestaurantsScreen from './src/screens/admin/ManageRestaurantsScreen';
import AddRestaurantScreen from './src/screens/admin/AddRestaurantScreen';
import EditRestaurantScreen from './src/screens/admin/EditRestaurantScreen';
import ManagePlacesScreen from './src/screens/admin/ManagePlacesScreen';
import ManageServiceItemsScreen from './src/screens/admin/ManageServiceItemsScreen';
import ReviewDishesScreen from './src/screens/admin/ReviewDishesScreen';
import ManageHomeChefsScreen from './src/screens/admin/ManageHomeChefsScreen';

// شاشات الشيف المنزلي (للتاجر والعرض)
import HomeChefDashboard from './src/screens/merchant/HomeChefDashboard';
import AddHomeChefDishScreen from './src/screens/merchant/AddHomeChefDishScreen';
import HomeChefsScreen from './src/screens/homechef/HomeChefsScreen';
import HomeChefDishesScreen from './src/screens/homechef/HomeChefDishesScreen';

// شاشات إضافية
import EshopScreen from './src/screens/EshopScreen';
import OffersScreen from './src/screens/OffersScreen';

// شاشات المطاعم القديمة
import RestaurantListScreen from './src/screens/restaurant/RestaurantListScreen';
import RestaurantPDFViewer from './src/screens/restaurant/RestaurantPDFViewer';
import RestaurantOrderScreen from './src/screens/restaurant/RestaurantOrderScreen';

// شاشات الدخول
import DriverLoginScreen from './src/screens/auth/DriverLoginScreen';

// شاشات الأطباق المشتركة
import MyDishesScreen from './src/screens/merchant/MyDishesScreen';
import AddDishScreen from './src/screens/provider/AddDishScreen';
import EditDishScreen from './src/screens/merchant/EditDishScreen';
import DishDetailsScreen from './src/screens/customer/DishDetailsScreen';

// خدمات
import { initializeCoreServices } from './src/services/servicesService';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const BackButton = ({ navigation, color = "#1F2937" }) => (
  <TouchableOpacity
    onPress={() => navigation.goBack()}
    style={{ padding: 8, marginLeft: 8 }}
  >
    <Ionicons name="arrow-forward" size={28} color={color} />
  </TouchableOpacity>
);

function CustomerStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CustomerMain" component={HomeScreen} />
      <Stack.Screen name="ServiceScreen" component={ServiceScreen} />
      <Stack.Screen name="Restaurant" component={RestaurantScreen} />
      <Stack.Screen name="RestaurantList" component={RestaurantListScreen} />
      <Stack.Screen name="RestaurantPDFViewer" component={RestaurantPDFViewer} />
      <Stack.Screen name="RestaurantOrder" component={RestaurantOrderScreen} />
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
        tabBarLabelStyle: { fontSize: 12, fontWeight: '500' },
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
      <Stack.Screen name="HomeScreen" component={HomeScreen} />

      {/* شاشات تسجيل الدخول */}
      <Stack.Screen
        name="CustomerAuth"
        component={CustomerAuthScreen}
        options={({ navigation }) => ({
          headerShown: true,
          headerRight: () => <BackButton navigation={navigation} color="#4F46E5" />,
          headerTitle: 'تسجيل الدخول',
          headerTitleAlign: 'center',
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerTitleStyle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
        })}
      />

      <Stack.Screen
        name="ServiceProvider"
        component={ServiceProviderScreen}
        options={({ navigation }) => ({
          headerShown: true,
          headerRight: () => <BackButton navigation={navigation} color="#4F46E5" />,
          headerTitle: 'مقدمو الخدمة',
          headerTitleAlign: 'center',
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerTitleStyle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
        })}
      />

      <Stack.Screen
        name="DriverLogin"
        component={DriverLoginScreen}
        options={({ navigation }) => ({
          headerShown: true,
          headerRight: () => <BackButton navigation={navigation} color="#3B82F6" />,
          headerTitle: 'دخول المندوبين',
          headerTitleAlign: 'center',
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerTitleStyle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
        })}
      />

      <Stack.Screen name="CompleteProfile" component={CompleteProfileScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="MyOrders" component={MyOrdersScreen} />

      {/* شاشات التاجر */}
      <Stack.Screen name="MerchantDashboard" component={MerchantDashboard} />
      <Stack.Screen name="ManageMenuScreen" component={ManageMenuScreen} />
      <Stack.Screen name="MerchantOrdersScreen" component={MerchantOrdersScreen} />

      {/* شاشات الشيف المنزلي */}
      <Stack.Screen name="HomeChefDashboard" component={HomeChefDashboard} />
      <Stack.Screen name="AddHomeChefDishScreen" component={AddHomeChefDishScreen} />
      <Stack.Screen name="HomeChefsScreen" component={HomeChefsScreen} />
      <Stack.Screen name="HomeChefDishesScreen" component={HomeChefDishesScreen} />

      <Stack.Screen name="DriverDashboard" component={DriverDashboard} />
      <Stack.Screen name="DriverDeliveries" component={DriverDeliveriesScreen} />
      <Stack.Screen name="OrderTracking" component={OrderTracking} />

      {/* شاشات الخدمات */}
      <Stack.Screen name="ItemsServiceScreen" component={ItemsServiceScreen} />
      <Stack.Screen name="IroningScreen" component={IroningScreen} />
      <Stack.Screen name="ManageServiceItemsScreen" component={ManageServiceItemsScreen} />
      <Stack.Screen name="ManageLaundryItemsScreen" component={ManageLaundryItemsScreen} />

      {/* شاشات الأدمن */}
      <Stack.Screen
        name="AdminHome"
        component={AdminHomeScreen}
        options={({ navigation }) => ({
          headerShown: true,
          headerRight: () => <BackButton navigation={navigation} />,
          headerTitle: 'لوحة الأدمن',
          headerTitleAlign: 'center',
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerTitleStyle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
        })}
      />

      <Stack.Screen name="UserManagement" component={UserManagement} />
      <Stack.Screen name="UserEditScreen" component={UserEditScreen} />
      <Stack.Screen name="AdminOrders" component={AdminOrdersScreen} />
      <Stack.Screen name="AddUser" component={AddUserScreen} />
      <Stack.Screen name="ServicesManagement" component={ServicesManagementScreen} />
      <Stack.Screen name="AddService" component={AddServiceScreen} />
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

      {/* شاشات الأطباق المشتركة */}
      <Stack.Screen name="MyDishesScreen" component={MyDishesScreen} />
      <Stack.Screen name="AddDishScreen" component={AddDishScreen} />
      <Stack.Screen name="EditDishScreen" component={EditDishScreen} />
      <Stack.Screen name="DishDetailsScreen" component={DishDetailsScreen} />

      <Stack.Screen name="MainTabs" component={MainTabs} />
    </Stack.Navigator>
  );
}

export default function App() {
  useEffect(() => {
    const init = async () => {
      console.log('🚀 بدء تهيئة الخدمات الأساسية...');
      try {
        await initializeCoreServices();
        console.log('✅ تم تهيئة الخدمات الأساسية');
      } catch (error) {
        console.error('❌ خطأ في تهيئة الخدمات:', error);
      }
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
