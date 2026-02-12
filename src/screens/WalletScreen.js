import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../hooks/useWallet';

export default function WalletScreen() {
  const { user, isGuest, logout } = useAuth();
  const { wallet, transactions, loading, isGuest: isWalletGuest, addFunds, spendFunds } = useWallet(user?.uid);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  const handleAdd = async () => {
    const num = parseFloat(amount);
    if (!num || num <= 0) return Alert.alert('خطأ', 'أدخل مبلغ صحيح');
    
    const res = await addFunds(num, description || 'إيداع');
    if (res.success) {
      Alert.alert('تم', 'تم الإيداع بنجاح');
      setAmount('');
      setDescription('');
    } else Alert.alert('خطأ', res.error);
  };

  const handleSpend = async () => {
    const num = parseFloat(amount);
    if (!num || num <= 0) return Alert.alert('خطأ', 'أدخل مبلغ صحيح');
    
    const res = await spendFunds(num, description || 'سحب');
    if (res.success) {
      Alert.alert('تم', 'تم السحب بنجاح');
      setAmount('');
      setDescription('');
    } else Alert.alert('خطأ', res.error);
  };

  if (loading) return <View style={styles.center}><Text>جاري التحميل...</Text></View>;

  return (
    <ScrollView style={styles.container}>
      <View style={[styles.card, isWalletGuest && styles.guestCard]}>
        <View style={styles.cardHeader}>
          <Text style={styles.label}>الرصيد الحالي</Text>
          {isWalletGuest && (
            <View style={styles.guestBadge}>
              <Text style={styles.guestBadgeText}>زائر</Text>
            </View>
          )}
        </View>
        <Text style={styles.balance}>{wallet?.balance?.toFixed(2) || '0.00'} ج.م</Text>
        {isWalletGuest && (
          <Text style={styles.guestHint}>💡 رصيد تجريبي - سجل دخولك لحفظه</Text>
        )}
      </View>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="المبلغ"
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
        />
        <TextInput
          style={styles.input}
          placeholder="الوصف (اختياري)"
          value={description}
          onChangeText={setDescription}
        />
        
        <View style={styles.row}>
          <TouchableOpacity style={[styles.btn, styles.addBtn]} onPress={handleAdd}>
            <Text style={styles.btnText}>إيداع</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.spendBtn]} onPress={handleSpend}>
            <Text style={styles.btnText}>سحب</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.history}>
        <Text style={styles.historyTitle}>آخر المعاملات</Text>
        {transactions.length === 0 ? (
          <Text style={styles.empty}>لا توجد معاملات بعد</Text>
        ) : (
          transactions.map(tx => (
            <View key={tx.id} style={styles.txItem}>
              <View>
                <Text style={styles.txDesc}>{tx.description}</Text>
                <Text style={styles.txDate}>
                  {tx.createdAt?.toDate?.()?.toLocaleDateString('ar-EG') || 
                   new Date(tx.createdAt).toLocaleDateString('ar-EG')}
                </Text>
              </View>
              <Text style={[styles.txAmount, tx.type === 'credit' ? styles.credit : styles.debit]}>
                {tx.type === 'credit' ? '+' : '-'}{tx.amount} ج.م
              </Text>
            </View>
          ))
        )}
      </View>

      <TouchableOpacity style={styles.logout} onPress={logout}>
        <Text style={styles.logoutText}>
          {isGuest ? 'خروج' : 'تسجيل الخروج'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    backgroundColor: '#4F46E5',
    margin: 16,
    padding: 24,
    borderRadius: 16,
  },
  guestCard: {
    backgroundColor: '#6B7280',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  guestBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  guestBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  balance: { color: 'white', fontSize: 36, fontWeight: 'bold', marginTop: 8 },
  guestHint: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 8,
  },
  form: {
    backgroundColor: 'white',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
    textAlign: 'right',
  },
  row: { flexDirection: 'row', gap: 12 },
  btn: { flex: 1, padding: 14, borderRadius: 8, alignItems: 'center' },
  addBtn: { backgroundColor: '#10B981' },
  spendBtn: { backgroundColor: '#EF4444' },
  btnText: { color: 'white', fontWeight: '600', fontSize: 16 },
  history: {
    backgroundColor: 'white',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
  },
  historyTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  empty: { textAlign: 'center', color: '#999', padding: 20 },
  txItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  txDesc: { fontSize: 16, marginBottom: 4 },
  txDate: { fontSize: 12, color: '#999' },
  txAmount: { fontSize: 16, fontWeight: '600' },
  credit: { color: '#10B981' },
  debit: { color: '#EF4444' },
  logout: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutText: { color: '#666', fontSize: 16, fontWeight: '600' },
});
