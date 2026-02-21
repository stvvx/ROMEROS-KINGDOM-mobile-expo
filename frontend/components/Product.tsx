import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';

export interface IProduct {
  _id: string;
  name: string;
  price: number;
  description?: string;
  images?: { url: string }[];
}

interface ProductProps {
  product: IProduct;
}

export default function Product({ product }: ProductProps) {
  const router = useRouter();

  const handlePress = () => {
    router.push({
      pathname: '/(user)/ProductDetails',
      params: { id: product._id }
    });
  };

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress}>
      {product.images && product.images.length > 0 && (
        <Image
          source={{ uri: product.images[0].url }}
          style={styles.image}
        />
      )}
      <Text style={styles.name}>{product.name}</Text>
      <Text style={styles.price}>₱{product.price}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  image: {
    width: '100%',
    height: 120,
    borderRadius: 6,
    marginBottom: 8,
  },
  name: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  price: {
    marginTop: 4,
    color: '#1976d2',
    fontWeight: '600',
  },
});
