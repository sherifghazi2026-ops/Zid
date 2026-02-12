import * as Google from 'expo-auth-session/providers/google';
import * as Facebook from 'expo-auth-session/providers/facebook';
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, FacebookAuthProvider, signInWithCredential } from 'firebase/auth';
import { firebaseConfig } from './config';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Google Client ID (من Firebase Console)
const googleClientId = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';

// Facebook App ID (من Facebook Developers)
const facebookAppId = 'YOUR_FACEBOOK_APP_ID';

export const useGoogleAuth = () => {
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: googleClientId,
  });

  const signInWithGoogle = async () => {
    try {
      const result = await promptAsync();
      if (result?.type === 'success') {
        const { id_token } = result.params;
        const credential = GoogleAuthProvider.credential(id_token);
        const userCredential = await signInWithCredential(auth, credential);
        return { success: true, user: userCredential.user };
      }
      return { success: false, error: 'لم يكتمل تسجيل الدخول' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  return { signInWithGoogle, isLoading: !request };
};

export const useFacebookAuth = () => {
  const [request, response, promptAsync] = Facebook.useAuthRequest({
    clientId: facebookAppId,
  });

  const signInWithFacebook = async () => {
    try {
      const result = await promptAsync();
      if (result?.type === 'success') {
        const { access_token } = result.params;
        const credential = FacebookAuthProvider.credential(access_token);
        const userCredential = await signInWithCredential(auth, credential);
        return { success: true, user: userCredential.user };
      }
      return { success: false, error: 'لم يكتمل تسجيل الدخول' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  return { signInWithFacebook, isLoading: !request };
};
