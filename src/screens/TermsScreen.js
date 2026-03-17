import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTerms } from '../context/TermsContext';

export default function TermsScreen({ navigation }) {
  const { acceptTerms } = useTerms();

  const handleAccept = useCallback(() => {
    acceptTerms();
    navigation.goBack();
  }, [acceptTerms, navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-forward" size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle]}>الشروط والأحكام</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* إخلاء المسؤولية الرئيسي */}
        <View style={styles.disclaimerBox}>
          <Text style={[styles.disclaimerTitle]}>⚠️ إخلاء مسؤولية</Text>
          <Text style={[styles.disclaimerText]}>
            هذا التطبيق في نسخته التجريبية (Beta Version). باستخدامك له، أنت توافق على البنود التالية.
          </Text>
        </View>

        <Text style={[styles.title]}>مرحباً بك في النسخة التجريبية من تطبيق Zid</Text>
        
        <Text style={[styles.paragraph]}>
          باستخدامك لهذا التطبيق، أنت تقر وتوافق على النقاط التالية:
        </Text>

        <Text style={[styles.sectionTitle]}>▪︎ طبيعة المنصة</Text>
        <Text style={[styles.paragraph]}>
          تطبيق Zid هو مشروع تقني قيد التجربة (Beta Version)، يعمل كـ "لوحة إعلانات ذكية" أو "وسيط تقني" فقط للربط بين سكان المنطقة ومقدمي الخدمات المحليين. نحن لا نملك الخدمات ولا نديرها.
        </Text>

        <Text style={[styles.sectionTitle]}>▪︎ إخلاء المسؤولية القانونية</Text>
        <Text style={[styles.paragraph]}>
          منصة Zid والمطورين القائمين عليها غير مسؤولين بصفتهم الشخصية أو القانونية عن أي جودة خدمة، تأخير، أو تلفيات ناتجة عن التعامل بين العميل ومقدم الخدمة (مثل مشاكل المغاسل، المطاعم، أو فنيي الصيانة). العلاقة التعاقدية تتم مباشرة بينك وبين مقدم الخدمة.
        </Text>

        <Text style={[styles.sectionTitle]}>▪︎ التأمين والحوادث</Text>
        <Text style={[styles.paragraph]}>
          في حالة وقوع أي خلاف (تلف أغراض، فقدان، أو خلاف على السعر)، يتم حل النزاع مباشرة مع مقدم الخدمة. دور التطبيق ينتهي عند توفير وسيلة التواصل وتقييم التجربة.
        </Text>

        <Text style={[styles.sectionTitle]}>▪︎ المعاملات المادية</Text>
        <Text style={[styles.paragraph]}>
          جميع المعاملات المالية حالياً تتم بنظام "الدفع نقداً" عند الاستلام. التطبيق لا يتقاضى أي عمولات حالياً، ولا يضمن استرداد الأموال، حيث أن الدفع يتم لمقدم الخدمة مباشرة.
        </Text>

        <Text style={[styles.sectionTitle]}>▪︎ جودة البيانات</Text>
        <Text style={[styles.paragraph]}>
          نحن نبذل قصارى جهدنا للتحقق من هوية مقدمي الخدمة من خلال الأوراق الرسمية، لكننا لا نضمن دقة هذه البيانات بنسبة 100%، وتظل مسؤولية اختيار مقدم الخدمة على عاتق المستخدم بناءً على التقييمات المتاحة.
        </Text>

        <Text style={[styles.sectionTitle]}>▪︎ حق التعديل</Text>
        <Text style={[styles.paragraph]}>
          يحق لإدارة التطبيق تعديل هذه الشروط في أي وقت، واستمرارك في استخدام التطبيق يعتبر موافقة ضمنية على هذه البنود.
        </Text>

        <Text style={[styles.noteText]}>
          📌 ملاحظة: نحن نسعى دائماً لتطوير المنصة وخدمة المجتمع المحلي. رأيك يهمنا، ولا تتردد في التواصل معنا للإبلاغ عن أي مشكلة أو اقتراح تحسين.
        </Text>

        {/* زر الموافقة - يظهر دائماً */}
        <TouchableOpacity style={styles.acceptButton} onPress={handleAccept}>
          <Text style={[styles.acceptButtonText]}>أوافق على الشروط</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  content: { 
    padding: 20,
  },
  disclaimerBox: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignSelf: 'stretch',
  },
  disclaimerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#92400E',
    marginBottom: 8,
    textAlign: 'right',
  },
  disclaimerText: {
    fontSize: 14,
    color: '#92400E',
    lineHeight: 22,
    textAlign: 'right',
  },
  title: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: '#1F2937', 
    marginBottom: 16, 
    textAlign: 'center',
    alignSelf: 'stretch',
  },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: '600', 
    color: '#4F46E5', 
    marginTop: 16, 
    marginBottom: 8,
    textAlign: 'right',
    alignSelf: 'stretch',
  },
  paragraph: { 
    fontSize: 14, 
    color: '#4B5563', 
    lineHeight: 22, 
    marginBottom: 8,
    textAlign: 'right',
    alignSelf: 'stretch',
  },
  noteText: {
    fontSize: 13,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 20,
    padding: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    textAlign: 'right',
    alignSelf: 'stretch',
  },
  acceptButton: {
    backgroundColor: '#4F46E5',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 20,
    alignSelf: 'stretch',
  },
  acceptButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});
