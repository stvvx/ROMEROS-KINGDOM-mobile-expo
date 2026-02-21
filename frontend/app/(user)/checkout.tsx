import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { getItem, removeItem } from '../../utils/storage';

// Use NGROK if available, fallback to LAN IP
const API_URL =
  process.env.NGROK_URL ||
  process.env.EXPO_PUBLIC_API_URL ||
  'http://localhost:4000/api/v1';

export default function Checkout() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [itemsPrice, setItemsPrice] = useState(0);
  const [taxPrice, setTaxPrice] = useState(0);
  const [shippingPrice, setShippingPrice] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);

  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('');
  const [phoneNo, setPhoneNo] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const data = await getItem('cartItems');
        const items = data ? JSON.parse(data) : [];
        setCartItems(items);
        const sub = items.reduce((s: number, it: any) => s + it.price * it.quantity, 0);
        const tax = parseFloat((sub * 0.1).toFixed(2));
        const shipping = items.length > 0 ? 150 : 0;
        setItemsPrice(sub);
        setTaxPrice(tax);
        setShippingPrice(shipping);
        setTotalPrice(parseFloat((sub + tax + shipping).toFixed(2)));
      } catch (err) {
        console.error('Error loading cart for checkout:', err);
      }
    })();
  }, []);

  const placeOrderCOD = async () => {
    if (cartItems.length === 0) {
      Alert.alert('Cart Empty', 'Add items before placing an order');
      return;
    }
    if (!address || !city || !postalCode || !country || !phoneNo) {
      Alert.alert('Missing Info', 'Please fill shipping information');
      return;
    }

    setLoading(true);
    try {
      const token = await getItem('authToken');
      if (!token) {
        Alert.alert('Not signed in', 'Please sign in to place an order');
        router.push('/(auth)/login');
        return;
      }

      const orderItems = cartItems.map((it: any) => ({
        name: it.name,
        quantity: it.quantity,
        image: it.images?.[0]?.url || '',
        price: it.price,
        product: it._id,
      }));

      const shippingInfo = {
        address,
        city,
        postalCode,
        country,
        phoneNo,
      };

      const paymentInfo = { id: 'COD', status: 'Cash On Delivery' };

      const payload = {
        orderItems,
        shippingInfo,
        itemsPrice,
        taxPrice,
        shippingPrice,
        totalPrice,
        paymentInfo,
      };

      const res = await axios.post(`${API_URL}/order/new`, payload, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        timeout: 15000,
      });

      if (res.data.success) {
        Alert.alert('Order Placed', 'Your order was placed (Cash on Delivery)');
        await removeItem('cartItems');
        router.replace('/(tabs)');
      } else {
        Alert.alert('Order Failed', res.data.message || 'Could not place order');
      }
    } catch (err: any) {
      console.error('Checkout error:', err?.response || err);
      const msg = err?.response?.data?.message || err?.message || 'Checkout failed';
      Alert.alert('Checkout Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Checkout</Text>
        <View style={{ width: 30 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.summaryBox}>
          <Text style={styles.label}>Items</Text>
          <Text style={styles.totalPrice}>₱{itemsPrice.toFixed(2)}</Text>
          <Text style={styles.label}>Tax (10%): ₱{taxPrice.toFixed(2)}</Text>
          <Text style={styles.label}>Shipping: ₱{shippingPrice.toFixed(2)}</Text>
          <View style={styles.divider} />
          <Text style={styles.label}>Total</Text>
          <Text style={styles.totalPrice}>₱{totalPrice.toFixed(2)}</Text>
        </View>

        <View style={styles.formRow}>
          <Text style={styles.formLabel}>Address</Text>
          <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder="Street address" placeholderTextColor="#7A859E" />
        </View>
        <View style={styles.formRow}>
          <Text style={styles.formLabel}>City</Text>
          <TextInput style={styles.input} value={city} onChangeText={setCity} placeholder="City" placeholderTextColor="#7A859E" />
        </View>
        <View style={styles.formRow}>
          <Text style={styles.formLabel}>Postal Code</Text>
          <TextInput style={styles.input} value={postalCode} onChangeText={setPostalCode} placeholder="Postal Code" placeholderTextColor="#7A859E" keyboardType="numeric" />
        </View>
        <View style={styles.formRow}>
          <Text style={styles.formLabel}>Country</Text>
          <TextInput style={styles.input} value={country} onChangeText={setCountry} placeholder="Country" placeholderTextColor="#7A859E" />
        </View>
        <View style={styles.formRow}>
          <Text style={styles.formLabel}>Phone</Text>
          <TextInput style={styles.input} value={phoneNo} onChangeText={setPhoneNo} placeholder="Phone number" placeholderTextColor="#7A859E" keyboardType="phone-pad" />
        </View>

        <TouchableOpacity style={styles.payBtn} onPress={placeOrderCOD} disabled={loading}>
          {loading ? <ActivityIndicator color="#0E1117" /> : <Text style={styles.payBtnText}>Place Order (Cash on Delivery)</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0E1117' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#262D42' },
  backBtn: { color: '#00C2C7', fontSize: 14, fontWeight: '600' },
  title: { color: '#E8EDF5', fontSize: 18, fontWeight: '700' },
  content: { padding: 20, gap: 14 },
  summaryBox: { backgroundColor: '#1A1E2E', borderWidth: 1, borderColor: '#262D42', borderRadius: 12, padding: 16, gap: 8 },
  label: { color: '#7A859E', fontSize: 14 },
  totalPrice: { color: '#3DFFC0', fontSize: 22, fontWeight: '800' },
  divider: { height: 1, backgroundColor: '#262D42', marginVertical: 8 },
  formRow: { marginTop: 8 },
  formLabel: { color: '#7A859E', marginBottom: 6 },
  input: { backgroundColor: '#0F1318', borderColor: '#262D42', borderWidth: 1, borderRadius: 8, padding: 10, color: '#E8EDF5' },
  payBtn: { backgroundColor: '#00C2C7', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  payBtnText: { color: '#0E1117', fontSize: 16, fontWeight: '700' },
});
