import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function AdminUsers() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Users Management</Text>
      <Text style={styles.subtext}>Coming soon...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0E1117',
  },
  text: {
    color: '#E8EDF5',
    fontSize: 18,
    fontWeight: '600',
  },
  subtext: {
    color: '#7A859E',
    fontSize: 14,
    marginTop: 8,
  },
});
