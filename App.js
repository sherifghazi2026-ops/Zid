import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { View, Text, SafeAreaView, LogBox } from 'react-native';

// تجاهل التحذيرات المؤقتة
LogBox.ignoreAllLogs();

export default function App() {
  const [status, setStatus] = useState('Starting...');
  const [error, setError] = useState(null);

  useEffect(() => {
    // دالة لاختبار كل خطوة على حدة
    async function initApp() {
      try {
        // الخطوة 1: التحقق من البيئة
        setStatus('Step 1: Environment OK');
        await new Promise(resolve => setTimeout(resolve, 100));

        // الخطوة 2: محاولة تحميل الخطوط
        setStatus('Step 2: Loading fonts...');
        try {
          const fonts = await import('./src/utils/fonts');
          await fonts.loadFonts();
          setStatus('Step 3: Fonts loaded ✅');
        } catch (e) {
          setError('Fonts Error: ' + e.message);
          return;
        }

        // الخطوة 3: محاولة تحميل الأصوات (معطل)
        setStatus('Step 4: Sounds skipped ⏭️');

        // الخطوة 4: محاولة تهيئة الخدمات
        setStatus('Step 5: Initializing services...');
        try {
          const services = await import('./src/services/servicesService');
          await services.initializeCoreServices();
          setStatus('Step 6: Services OK ✅');
        } catch (e) {
          setError('Services Error: ' + e.message);
          return;
        }

        // الخطوة 5: محاولة تحميل الشاشات
        setStatus('Step 7: Loading screens...');
        await import('./src/screens/HomeScreen');
        setStatus('Step 8: Screens OK ✅');

        // كل شيء تمام
        setStatus('Ready!');
        
      } catch (e) {
        setError('Fatal: ' + e.message);
      }
    }

    initApp();
  }, []);

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FEE2E2', padding: 20 }}>
        <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#EF4444', marginBottom: 10 }}>❌ ERROR</Text>
        <Text style={{ fontSize: 14, color: '#1F2937', textAlign: 'center' }}>{error}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
      <Text style={{ fontSize: 16, color: '#4F46E5' }}>{status}</Text>
    </SafeAreaView>
  );
}
