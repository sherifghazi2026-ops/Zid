import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';

export default function EshopScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.text}>قريباً.. المتجر</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text: { fontSize: 18, color: '#1F2937' },
});
