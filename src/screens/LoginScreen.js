import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useGoogleAuth, useFacebookAuth } from '../firebase/authConfig';

export default function LoginScreen() {
  const { loginAsGuest } = useAuth();
  const { signInWithGoogle, isLoading: googleLoading } = useGoogleAuth();
  const { signInWithFacebook, isLoading: fbLoading } = useFacebookAuth();

  const handleGoogleLogin = async () => {
    const result = await signInWithGoogle();
    if (!result.success) {
      Alert.alert('خطأ', result.error || 'فشل تسجيل الدخول بجوجل');
    }
  };

  const handleFacebookLogin = async () => {
    const result = await signInWithFacebook();
    if (!result.success) {
      Alert.alert('خطأ', result.error || 'فشل تسجيل الدخول بفيسبوك');
    }
  };

  const handleGuestLogin = () => {
    loginAsGuest();
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.title}>Zayed-ID</Text>
        <Text style={styles.subtitle}>خدمات الشيخ زايد</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.welcomeText}>مرحباً بك 👋</Text>
        <Text style={styles.description}>
          سجل دخولك للمتابعة أو تصفح كزائر
        </Text>

        <TouchableOpacity
          style={[styles.button, styles.googleButton]}
          onPress={handleGoogleLogin}
          disabled={googleLoading || fbLoading}
        >
          {googleLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Image
                source={{ uri: 'https://cdn-icons-png.flaticon.com/512/2991/2991148.png' }}
                style={styles.buttonIcon}
              />
              <Text style={styles.buttonText}>تسجيل الدخول بجوجل</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.facebookButton]}
          onPress={handleFacebookLogin}
          disabled={googleLoading || fbLoading}
        >
          {fbLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Image
                source={{ uri: 'https://cdn-icons-png.flaticon.com/512/733/733547.png' }}
                style={styles.buttonIcon}
              />
              <Text style={styles.buttonText}>تسجيل الدخول بفيسبوك</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.line} />
          <Text style={styles.dividerText}>أو</Text>
          <View style={styles.line} />
        </View>

        {/* ✅ زر الدخول كزائر */}
        <TouchableOpacity
          style={[styles.button, styles.guestButton]}
          onPress={handleGuestLogin}
        >
          <Text style={styles.guestButtonText}>الدخول كزائر</Text>
        </TouchableOpacity>

        <View style={styles.noteContainer}>
          <Text style={styles.noteText}>
            بالدخول أنت توافق على الشروط والأحكام
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#4F46E5',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  card: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
  },
  googleButton: {
    backgroundColor: '#DB4437',
  },
  facebookButton: {
    backgroundColor: '#4267B2',
  },
  guestButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#4F46E5',
  },
  buttonIcon: {
    width: 24,
    height: 24,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  guestButtonText: {
    color: '#4F46E5',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  dividerText: {
    marginHorizontal: 10,
    color: '#999',
    fontSize: 14,
  },
  noteContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  noteText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});
