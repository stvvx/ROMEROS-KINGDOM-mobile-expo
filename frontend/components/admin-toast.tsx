import React from 'react'
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

interface AdminToastProps {
  visible: boolean
  type: 'success' | 'error'
  title: string
  message: string
  onClose: () => void
}

export default function AdminToast({ visible, type, title, message, onClose }: AdminToastProps) {
  const isSuccess = type === 'success'

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <View style={[styles.iconWrap, isSuccess ? styles.iconSuccess : styles.iconError]}>
            <Ionicons
              name={isSuccess ? 'checkmark-circle' : 'alert-circle'}
              size={32}
              color={isSuccess ? '#996250' : '#FF5A6E'}
            />
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.divider} />

          <TouchableOpacity
            style={[styles.button, isSuccess ? styles.buttonSuccess : styles.buttonError]}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>{isSuccess ? 'Great!' : 'Got it'}</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  card: {
    width: '100%',
    backgroundColor: '#350709',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#5a1015',
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.6,
    shadowRadius: 40,
    elevation: 20,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  iconSuccess: {
    backgroundColor: 'rgba(153,98,80,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(153,98,80,0.3)',
  },
  iconError: {
    backgroundColor: 'rgba(255,90,110,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,90,110,0.28)',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F9F9F9',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 13,
    color: '#c8a090',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: '#5a1015',
    marginBottom: 20,
  },
  button: {
    width: '100%',
    borderRadius: 13,
    paddingVertical: 14,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonSuccess: {
    backgroundColor: '#800007',
    shadowColor: '#800007',
  },
  buttonError: {
    backgroundColor: '#FF5A6E',
    shadowColor: '#FF5A6E',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F9F9F9',
  },
})